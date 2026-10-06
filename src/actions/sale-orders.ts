"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { requireAdmin, requireUser } from "@/lib/guard";
import { Decimal, formatUSD, lineTotalOf, round4, taxAmountOf } from "@/lib/money";
import {
  lockInventoryRows,
  recomputeByReplay,
  recomputeWithOrderSnapshot,
  withTxRetry,
} from "@/lib/inventory";
import { nextOrderNo } from "@/lib/order-no";
import {
  dateToUtcMidnight,
  parseLinesFromForm,
  saleOrderEditSchema,
  saleOrderSchema,
} from "@/lib/validation";
import { applySale } from "@/lib/weighted-average";
import type { ActionResult } from "@/actions/parts";

function dayRange(date: Date): { gte: Date; lt: Date } {
  return {
    gte: new Date(date.getTime()),
    lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
  };
}

export async function createSaleOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let result: { id: string; orderNo: string } | { error: string };
  try {
    const user = await requireUser();
    const parsed = saleOrderSchema.safeParse({
      orderDate: formData.get("orderDate") ?? "",
      customerName: formData.get("customerName") ?? "",
      customerContact: formData.get("customerContact") ?? "",
      customerAddress: formData.get("customerAddress") ?? "",
      paymentMethod: formData.get("paymentMethod") ?? "",
      note: formData.get("note") ?? "",
      taxRate: formData.get("taxRate") ?? "",
      lines: parseLinesFromForm(formData),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
    }
    const input = parsed.data;
    const orderDate = dateToUtcMidnight(input.orderDate);

    result = await withTxRetry(async (tx) => {
      const partIds = input.lines.map((l) => l.partId);
      const parts = await tx.part.findMany({
        where: { id: { in: partIds } },
        select: { id: true, kind: true },
      });
      const partMap = new Map(parts.map((p) => [p.id, p]));
      if (input.lines.some((l) => !partMap.has(l.partId))) {
        return { error: "存在无效配件，请重新选择" };
      }
      if (input.lines.some((l) => partMap.get(l.partId)?.kind === "CUSTODY")) {
        return { error: "代保管配件不能卖出" };
      }

      const invMap = await lockInventoryRows(tx, partIds);

      const orderNo = await nextOrderNo("SO", orderDate, {
        countSameDay: () =>
          tx.saleOrder.count({ where: { orderDate: dayRange(orderDate) } }),
        isTaken: (no) =>
          tx.saleOrder.findUnique({ where: { orderNo: no } }).then(Boolean),
      });

      let total = new Decimal(0);
      // partId → 重放后的 {qty}（avgCost 不受卖出影响）
      const nextQtys = new Map<string, number>();
      const lineData = input.lines.map((line) => {
        const part = partMap.get(line.partId)!;
        const price = new Decimal(line.unitPrice);
        const lineTotal = lineTotalOf(line.qty, price);
        total = total.add(lineTotal);

        const state = invMap.get(line.partId) ?? { qty: 0, avgCost: new Decimal(0) };
        // 成本快照：寄卖行=0；自营行=卖出当时的加权平均成本（永不追溯重算）
        const isConsignment = part.kind === "CONSIGNMENT";
        const costAtSale = isConsignment
          ? new Decimal(0)
          : round4(state.avgCost);
        const costTotal = lineTotalOf(line.qty, costAtSale);
        const after = applySale(state, line.qty);
        nextQtys.set(line.partId, after.qty);

        return {
          partId: line.partId,
          qty: line.qty,
          unitPrice: price,
          lineTotal,
          isConsignment,
          costAtSale,
          costTotal,
        };
      });

      // total 此刻 = 小计（Σ lineTotal）；税额与含税总额在事务内用 Decimal 计算
      const taxRate = new Decimal(input.taxRate);
      const taxAmount = taxAmountOf(total, taxRate);
      const grandTotal = total.add(taxAmount);

      const order = await tx.saleOrder.create({
        data: {
          orderNo,
          orderDate,
          customerName: input.customerName,
          customerContact: input.customerContact || null,
          customerAddress: input.customerAddress || null,
          paymentMethod: input.paymentMethod,
          note: input.note || null,
          taxRate,
          taxAmount,
          totalAmount: grandTotal,
          createdById: user.id,
          lines: { create: lineData },
        },
      });

      for (const [partId, qty] of nextQtys) {
        await tx.inventory.upsert({
          where: { partId },
          create: { partId, qty },
          update: { qty },
        });
      }

      return { id: order.id, orderNo };
    });

    if ("error" in result) return { ok: false, error: result.error };

    revalidatePath("/orders");
    revalidatePath("/parts");
    revalidatePath("/inventory");
    // 不再 redirect：弹窗模式由 onSaved 关弹窗，页面模式（复制重开等）自行跳详情
    return { ok: true, id: result.id, orderNo: result.orderNo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

export async function voidSaleOrder(
  id: string,
  reason: string,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const trimmed = reason.trim();
    if (!trimmed) return { ok: false, error: "请填写作废原因" };

    await withTxRetry(async (tx) => {
      const order = await tx.saleOrder.findUnique({
        where: { id },
        include: { lines: { select: { partId: true } } },
      });
      if (!order) throw new Error("单据不存在");
      if (order.status === "VOID") throw new Error("该单已作废");
      if (order.invoiceNo) throw new Error("该单已开票，请先撤销开票再作废");

      const paymentCount = await tx.payment.count({ where: { saleOrderId: id } });
      if (paymentCount > 0) {
        throw new Error("该单已有收款记录，不能作废；请先删除收款记录");
      }

      await tx.saleOrder.update({
        where: { id },
        data: {
          status: "VOID",
          voidReason: trimmed,
          voidedAt: new Date(),
          voidedById: user.id,
        },
      });

      const partIds = [...new Set(order.lines.map((l) => l.partId))];
      await lockInventoryRows(tx, partIds);
      for (const partId of partIds) {
        await recomputeByReplay(tx, partId);
      }
    });

    revalidatePath("/orders");
    revalidatePath(`/sales/${id}`);
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
 * 修改卖出单（ADMIN，仅 ACTIVE、未开票）。单号/createdAt/createdBy 不变。
 * 库存与均价由重放重算；本单 costAtSale 快照按新时点重取（先占位再回填），
 * 其他单的快照不追溯。事务纪律：第一笔写之前可 return 校验错误，之后只 throw。
 */
export async function updateSaleOrder(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let result: { id: string; orderNo: string } | { error: string };
  try {
    const user = await requireAdmin();
    const parsed = saleOrderEditSchema.safeParse({
      orderId: formData.get("orderId") ?? "",
      orderDate: formData.get("orderDate") ?? "",
      customerName: formData.get("customerName") ?? "",
      customerContact: formData.get("customerContact") ?? "",
      customerAddress: formData.get("customerAddress") ?? "",
      paymentMethod: formData.get("paymentMethod") ?? "",
      note: formData.get("note") ?? "",
      taxRate: formData.get("taxRate") ?? "",
      lines: parseLinesFromForm(formData),
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
    }
    const input = parsed.data;
    const orderDate = dateToUtcMidnight(input.orderDate);

    result = await withTxRetry(async (tx) => {
      // 先锁单据行再读（与 addPayment 同序：单据行 → 库存行），串行化并发编辑/收款
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "SaleOrder" WHERE "id" = ${input.orderId} FOR UPDATE`,
      );
      const order = await tx.saleOrder.findUnique({
        where: { id: input.orderId },
        select: {
          orderNo: true,
          status: true,
          invoiceNo: true,
          lines: { select: { partId: true } },
        },
      });
      if (!order) return { error: "单据不存在" };
      if (order.status === "VOID") return { error: "该单已作废，不能修改" };
      if (order.invoiceNo) return { error: "该单已开票，请先撤销开票再修改" };

      const newPartIds = input.lines.map((l) => l.partId);
      const parts = await tx.part.findMany({
        where: { id: { in: newPartIds } },
        select: { id: true, kind: true },
      });
      const partMap = new Map(parts.map((p) => [p.id, p]));
      if (input.lines.some((l) => !partMap.has(l.partId))) {
        return { error: "存在无效配件，请重新选择" };
      }
      if (input.lines.some((l) => partMap.get(l.partId)?.kind === "CUSTODY")) {
        return { error: "代保管配件不能卖出" };
      }

      let subtotal = new Decimal(0);
      const newLines = input.lines.map((line) => {
        const price = new Decimal(line.unitPrice);
        const lineTotal = lineTotalOf(line.qty, price);
        subtotal = subtotal.add(lineTotal);
        return {
          partId: line.partId,
          qty: line.qty,
          unitPrice: price,
          lineTotal,
          isConsignment: partMap.get(line.partId)?.kind === "CONSIGNMENT",
        };
      });
      const taxRate = new Decimal(input.taxRate);
      const taxAmount = taxAmountOf(subtotal, taxRate);
      const grandTotal = subtotal.add(taxAmount);

      // 收付款守卫：改后总额不得低于已收合计（否则出现「已收 > 总额」的坏账态）
      const paidAgg = await tx.payment.aggregate({
        _sum: { amount: true },
        where: { saleOrderId: input.orderId },
      });
      const paid = new Decimal(paidAgg._sum.amount ?? 0);
      if (grandTotal.lt(paid)) {
        return {
          error: `改后总额（${formatUSD(grandTotal)}）不能低于已收款合计（${formatUSD(paid)}）；请先删除多余收款或调高金额`,
        };
      }

      // 受影响配件 = 旧行 ∪ 新行（被移除的配件也要重放把出库冲回）
      const affected = [
        ...new Set([...order.lines.map((l) => l.partId), ...newPartIds]),
      ].sort();
      await lockInventoryRows(tx, affected);

      await tx.saleOrder.update({
        where: { id: input.orderId },
        data: {
          orderDate,
          customerName: input.customerName,
          customerContact: input.customerContact || null,
          customerAddress: input.customerAddress || null,
          paymentMethod: input.paymentMethod,
          note: input.note || null,
          taxRate,
          taxAmount,
          totalAmount: grandTotal,
          editedAt: new Date(),
          editedById: user.id,
        },
      });

      // 删旧行建新行：成本快照先占位，重放取时点均价后逐行回填（拿到行 id 需逐行 create）
      await tx.saleOrderLine.deleteMany({ where: { orderId: input.orderId } });
      const createdLines: {
        id: string;
        partId: string;
        qty: number;
        isConsignment: boolean;
      }[] = [];
      for (const line of newLines) {
        const created = await tx.saleOrderLine.create({
          data: {
            orderId: input.orderId,
            partId: line.partId,
            qty: line.qty,
            unitPrice: line.unitPrice,
            lineTotal: line.lineTotal,
            isConsignment: line.isConsignment,
            costAtSale: new Decimal(0),
            costTotal: new Decimal(0),
          },
        });
        createdLines.push({
          id: created.id,
          partId: line.partId,
          qty: line.qty,
          isConsignment: line.isConsignment,
        });
      }

      const newPartIdSet = new Set(newPartIds);
      for (const partId of affected) {
        const { snapshotAvgCost } = await recomputeWithOrderSnapshot(
          tx,
          partId,
          input.orderId,
        );
        // 寄卖件（snapshot null）与寄卖行快照恒 0，占位已是正确值，跳过回填
        if (!newPartIdSet.has(partId) || snapshotAvgCost === null) continue;
        const costAtSale = round4(snapshotAvgCost);
        for (const line of createdLines) {
          if (line.partId !== partId || line.isConsignment) continue;
          await tx.saleOrderLine.update({
            where: { id: line.id },
            data: {
              costAtSale,
              costTotal: lineTotalOf(line.qty, costAtSale),
            },
          });
        }
      }

      return { id: input.orderId, orderNo: order.orderNo };
    });

    if ("error" in result) return { ok: false, error: result.error };

    revalidatePath("/orders");
    revalidatePath(`/sales/${result.id}`);
    revalidatePath("/parts");
    revalidatePath("/inventory");
    revalidatePath("/settlement");
    revalidatePath("/");
    return { ok: true, id: result.id, orderNo: result.orderNo };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "修改失败" };
  }
}
