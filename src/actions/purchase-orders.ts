"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin, requireUser } from "@/lib/guard";
import { Decimal, formatUSD, lineTotalOf } from "@/lib/money";
import {
  lockInventoryRows,
  recomputeByReplay,
  withTxRetry,
} from "@/lib/inventory";
import { nextOrderNo } from "@/lib/order-no";
import {
  dateToUtcMidnight,
  parseLinesFromForm,
  purchaseOrderEditSchema,
  purchaseOrderSchema,
} from "@/lib/validation";
import { applyPurchase } from "@/lib/weighted-average";
import type { ActionResult } from "@/actions/parts";

function dayRange(date: Date): { gte: Date; lt: Date } {
  const gte = new Date(date.getTime());
  const lt = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return { gte, lt };
}

type TxResult =
  | { ok: true; id: string; orderNo: string }
  | { ok: false; error: string };

export async function createPurchaseOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = purchaseOrderSchema.safeParse({
      orderDate: formData.get("orderDate") ?? "",
      supplierName: formData.get("supplierName") ?? "",
      paymentMethod: formData.get("paymentMethod") ?? "",
      note: formData.get("note") ?? "",
      lines: parseLinesFromForm(formData),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
    }
    const input = parsed.data;
    const orderDate = dateToUtcMidnight(input.orderDate);

    const result = await withTxRetry<TxResult>(async (tx) => {
      // 买入单只允许自营配件；寄卖/代保管走库存调整。
      const partIds = input.lines.map((l) => l.partId);
      const parts = await tx.part.findMany({
        where: { id: { in: partIds } },
        select: { id: true, kind: true, partNumber: true },
      });
      const partMap = new Map(parts.map((p) => [p.id, p]));
      if (input.lines.some((l) => !partMap.has(l.partId))) {
        return { ok: false, error: "存在无效配件，请重新选择" };
      }
      const external = input.lines.find((l) => partMap.get(l.partId)?.kind !== "OWNED");
      if (external) {
        return {
          ok: false,
          error: `非自营配件（${partMap.get(external.partId)?.partNumber}）不能走买入单`,
        };
      }

      const invMap = await lockInventoryRows(tx, partIds);

      const orderNo = await nextOrderNo("PO", orderDate, {
        countSameDay: () =>
          tx.purchaseOrder.count({ where: { orderDate: dayRange(orderDate) } }),
        isTaken: (no) =>
          tx.purchaseOrder.findUnique({ where: { orderNo: no } }).then(Boolean),
      });

      let total = new Decimal(0);
      const nextStates = new Map<string, ReturnType<typeof applyPurchase>>();
      const lineData = input.lines.map((line) => {
        const price = new Decimal(line.unitPrice);
        const lineTotal = lineTotalOf(line.qty, price);
        total = total.add(lineTotal);
        const state = invMap.get(line.partId) ?? { qty: 0, avgCost: new Decimal(0) };
        nextStates.set(line.partId, applyPurchase(state, line.qty, price));
        return { partId: line.partId, qty: line.qty, unitPrice: price, lineTotal };
      });

      const order = await tx.purchaseOrder.create({
        data: {
          orderNo,
          orderDate,
          supplierName: input.supplierName,
          paymentMethod: input.paymentMethod,
          note: input.note || null,
          totalAmount: total,
          createdById: user.id,
          lines: { create: lineData },
        },
      });

      // 当场付款快捷项：建单同时记一笔付款（金额空 = 全额，且 ≤ 单据总额）。
      // 此时订单已 create，事务内只能 throw（return 会提交已写的订单）
      const payNowMethod = String(formData.get("payNowMethod") ?? "NONE");
      const payNowAmountRaw = String(formData.get("payNowAmount") ?? "").trim();
      if (payNowMethod !== "NONE") {
        if (payNowAmountRaw && !/^\d+(\.\d{1,2})?$/.test(payNowAmountRaw)) {
          throw new Error("当场付款金额格式不正确");
        }
        const payAmount = payNowAmountRaw ? new Decimal(payNowAmountRaw) : total;
        if (payAmount.gt(total)) {
          throw new Error("当场付款金额不能超过单据总额");
        }
        if (payAmount.gt(0)) {
          await tx.payment.create({
            data: {
              method: payNowMethod as "CASH" | "CHECK" | "ONLINE",
              amount: payAmount,
              payDate: orderDate,
              purchaseOrderId: order.id,
              createdById: user.id,
            },
          });
        }
      }

      for (const [partId, state] of nextStates) {
        await tx.inventory.upsert({
          where: { partId },
          create: { partId, ...state },
          update: state,
        });
      }

      return { ok: true, id: order.id, orderNo };
    });

    if (!result.ok) return result;

    revalidatePath("/orders");
    revalidatePath("/parts");
    revalidatePath("/inventory");
    // 不再 redirect：弹窗模式由 onSaved 关弹窗，页面模式（复制重开等）自行跳详情
    return { ok: true, id: result.id, orderNo: result.orderNo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function voidPurchaseOrder(
  id: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const trimmed = reason.trim();
    if (!trimmed) return { ok: false, error: "请填写作废原因" };

    await withTxRetry(async (tx) => {
      const order = await tx.purchaseOrder.findUnique({
        where: { id },
        include: { lines: { select: { partId: true } } },
      });
      if (!order) throw new Error("单据不存在");
      if (order.status === "VOID") throw new Error("该单已作废");

      // 有收付款记录的单不能作废（先由管理员删除付款记录）
      const paymentCount = await tx.payment.count({ where: { purchaseOrderId: id } });
      if (paymentCount > 0) {
        throw new Error("该单已有付款记录，不能作废；请先删除付款记录");
      }

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          status: "VOID",
          voidReason: trimmed,
          voidedAt: new Date(),
          voidedById: user.id,
        },
      });

      // 重放法重算受影响配件的库存（作废单仍占号；不重算其他单的 costAtSale 快照）
      const partIds = [...new Set(order.lines.map((l) => l.partId))];
      await lockInventoryRows(tx, partIds);
      for (const partId of partIds) {
        await recomputeByReplay(tx, partId);
      }
    });

    revalidatePath("/orders");
    revalidatePath(`/purchases/${id}`);
    revalidatePath("/parts");
    revalidatePath("/inventory");
    revalidatePath("/settlement");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "作废失败" };
  }
}

/**
 * 修改买入单（ADMIN，仅 ACTIVE、无开票概念）。单号/createdAt/createdBy 不变。
 * 改单价/日期会改变后续进货的 reset/blend 轨迹，由重放重算；已有卖出单的
 * costAtSale 快照不追溯。事务纪律：第一笔写之前可 return 校验错误，之后只 throw。
 */
export async function updatePurchaseOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = purchaseOrderEditSchema.safeParse({
      orderId: formData.get("orderId") ?? "",
      orderDate: formData.get("orderDate") ?? "",
      supplierName: formData.get("supplierName") ?? "",
      paymentMethod: formData.get("paymentMethod") ?? "",
      note: formData.get("note") ?? "",
      lines: parseLinesFromForm(formData),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
    }
    const input = parsed.data;
    const orderDate = dateToUtcMidnight(input.orderDate);

    const result = await withTxRetry<TxResult>(async (tx) => {
      // 先锁单据行再读（与 addPayment 同序：单据行 → 库存行），串行化并发编辑/付款
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "PurchaseOrder" WHERE "id" = ${input.orderId} FOR UPDATE`,
      );
      const order = await tx.purchaseOrder.findUnique({
        where: { id: input.orderId },
        select: {
          orderNo: true,
          status: true,
          lines: { select: { partId: true } },
        },
      });
      if (!order) return { ok: false, error: "单据不存在" };
      if (order.status === "VOID") return { ok: false, error: "该单已作废，不能修改" };

      const newPartIds = input.lines.map((l) => l.partId);
      const parts = await tx.part.findMany({
        where: { id: { in: newPartIds } },
        select: { id: true, kind: true, partNumber: true },
      });
      const partMap = new Map(parts.map((p) => [p.id, p]));
      if (input.lines.some((l) => !partMap.has(l.partId))) {
        return { ok: false, error: "存在无效配件，请重新选择" };
      }
      const external = input.lines.find((l) => partMap.get(l.partId)?.kind !== "OWNED");
      if (external) {
        return {
          ok: false,
          error: `非自营配件（${partMap.get(external.partId)?.partNumber}）不能走买入单`,
        };
      }

      let total = new Decimal(0);
      const lineData = input.lines.map((line) => {
        const price = new Decimal(line.unitPrice);
        const lineTotal = lineTotalOf(line.qty, price);
        total = total.add(lineTotal);
        return { partId: line.partId, qty: line.qty, unitPrice: price, lineTotal };
      });

      // 收付款守卫：改后总额不得低于已付合计
      const paidAgg = await tx.payment.aggregate({
        _sum: { amount: true },
        where: { purchaseOrderId: input.orderId },
      });
      const paid = new Decimal(paidAgg._sum.amount ?? 0);
      if (total.lt(paid)) {
        return {
          ok: false,
          error: `改后总额（${formatUSD(total)}）不能低于已付款合计（${formatUSD(paid)}）；请先删除多余付款或调高金额`,
        };
      }

      // 受影响配件 = 旧行 ∪ 新行（被移除的配件也要重放把入库冲回）
      const affected = [
        ...new Set([...order.lines.map((l) => l.partId), ...newPartIds]),
      ].sort();
      await lockInventoryRows(tx, affected);

      await tx.purchaseOrder.update({
        where: { id: input.orderId },
        data: {
          orderDate,
          supplierName: input.supplierName,
          paymentMethod: input.paymentMethod,
          note: input.note || null,
          totalAmount: total,
          editedAt: new Date(),
          editedById: user.id,
        },
      });
      await tx.purchaseOrderLine.deleteMany({ where: { orderId: input.orderId } });
      for (const line of lineData) {
        await tx.purchaseOrderLine.create({
          data: { orderId: input.orderId, ...line },
        });
      }

      for (const partId of affected) {
        await recomputeByReplay(tx, partId);
      }

      return { ok: true, id: input.orderId, orderNo: order.orderNo };
    });

    if (!result.ok) return result;

    revalidatePath("/orders");
    revalidatePath(`/purchases/${result.id}`);
    revalidatePath("/parts");
    revalidatePath("/inventory");
    revalidatePath("/settlement");
    revalidatePath("/");
    return { ok: true, id: result.id, orderNo: result.orderNo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "修改失败" };
  }
}
