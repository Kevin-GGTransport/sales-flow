"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/guard";
import { Decimal, lineTotalOf } from "@/lib/money";
import {
  lockInventoryRows,
  recomputeByReplay,
  withTxRetry,
} from "@/lib/inventory";
import { nextOrderNo } from "@/lib/order-no";
import {
  dateToUtcMidnight,
  parseLinesFromForm,
  purchaseOrderSchema,
} from "@/lib/validation";
import { applyPurchase } from "@/lib/weighted-average";
import type { ActionResult } from "@/actions/parts";

function dayRange(date: Date): { gte: Date; lt: Date } {
  const gte = new Date(date.getTime());
  const lt = new Date(date.getTime() + 24 * 60 * 60 * 1000);
  return { gte, lt };
}

type TxResult = { ok: true; id: string } | { ok: false; error: string };

export async function createPurchaseOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = purchaseOrderSchema.safeParse({
      orderDate: formData.get("orderDate") ?? "",
      supplierName: formData.get("supplierName") ?? "",
      note: formData.get("note") ?? "",
      lines: parseLinesFromForm(formData),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
    }
    const input = parsed.data;
    const orderDate = dateToUtcMidnight(input.orderDate);

    const result = await withTxRetry<TxResult>(async (tx) => {
      // 买入单禁选寄卖件（寄卖件入库走「寄卖入库/退回」，不进成本体系）
      const partIds = input.lines.map((l) => l.partId);
      const parts = await tx.part.findMany({
        where: { id: { in: partIds } },
        select: { id: true, isConsignment: true, partNumber: true },
      });
      const partMap = new Map(parts.map((p) => [p.id, p]));
      if (input.lines.some((l) => !partMap.has(l.partId))) {
        return { ok: false, error: "存在无效配件，请重新选择" };
      }
      const consignment = input.lines.find((l) => partMap.get(l.partId)?.isConsignment);
      if (consignment) {
        return {
          ok: false,
          error: `寄卖件（${partMap.get(consignment.partId)?.partNumber}）不能走买入单，请用「寄卖入库」`,
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
          note: input.note || null,
          totalAmount: total,
          createdById: user.id,
          lines: { create: lineData },
        },
      });

      // 当场付款快捷项：建单同时记一笔付款（金额空 = 全额，且 ≤ 单据总额）
      const payNowMethod = String(formData.get("payNowMethod") ?? "NONE");
      const payNowAmountRaw = String(formData.get("payNowAmount") ?? "").trim();
      if (payNowMethod !== "NONE") {
        if (payNowAmountRaw && !/^\d+(\.\d{1,2})?$/.test(payNowAmountRaw)) {
          return { ok: false, error: "当场付款金额格式不正确" };
        }
        const payAmount = payNowAmountRaw ? new Decimal(payNowAmountRaw) : total;
        if (payAmount.gt(total)) {
          return { ok: false, error: "当场付款金额不能超过单据总额" };
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

      return { ok: true, id: order.id };
    });

    if (!result.ok) return result;

    revalidatePath("/purchases");
    revalidatePath("/parts");
    revalidatePath("/inventory");
    redirect(`/purchases/${result.id}`);
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // Next redirect
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

    revalidatePath("/purchases");
    revalidatePath(`/purchases/${id}`);
    revalidatePath("/parts");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "作废失败" };
  }
}
