"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/guard";
import { Decimal, lineTotalOf, round4 } from "@/lib/money";
import { lockInventoryRows, recomputeByReplay, withTxRetry } from "@/lib/inventory";
import { nextOrderNo } from "@/lib/order-no";
import {
  dateToUtcMidnight,
  parseLinesFromForm,
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
  let result: { id: string } | { error: string };
  try {
    const user = await requireUser();
    const parsed = saleOrderSchema.safeParse({
      orderDate: formData.get("orderDate") ?? "",
      customerName: formData.get("customerName") ?? "",
      customerContact: formData.get("customerContact") ?? "",
      note: formData.get("note") ?? "",
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

      const order = await tx.saleOrder.create({
        data: {
          orderNo,
          orderDate,
          customerName: input.customerName,
          customerContact: input.customerContact || null,
          note: input.note || null,
          totalAmount: total,
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

      return { id: order.id };
    });

    if ("error" in result) return { ok: false, error: result.error };

    revalidatePath("/orders");
    revalidatePath("/parts");
    revalidatePath("/inventory");
    redirect(result.id ? `/sales/${result.id}` : "/orders?tab=sales");
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // Next redirect
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
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "作废失败" };
  }
}
