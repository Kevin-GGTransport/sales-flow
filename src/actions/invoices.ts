"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/guard";
import { nextOrderNo } from "@/lib/order-no";
import { dateToUtcMidnight, dateString } from "@/lib/validation";
import type { ActionResult } from "@/actions/parts";

function dayRange(date: Date) {
  return {
    gte: new Date(date.getTime()),
    lt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
  };
}

/** 批量标记开票：给未开票的 ACTIVE 卖出单分配连续 INV 号；任一失败整批回滚 */
export async function markInvoiced(
  saleOrderIds: string[],
  invoiceDateInput: string,
): Promise<ActionResult & { failed?: string }> {
  try {
    const user = await requireUser();
    const ids = [...new Set(saleOrderIds)];
    if (ids.length === 0) return { ok: false, error: "请先选择要开票的单据" };
    const parsed = dateString.safeParse(invoiceDateInput || undefined);
    if (!parsed.success) return { ok: false, error: "开票日期格式 yyyy-mm-dd" };
    const invoiceDate = dateToUtcMidnight(invoiceDateInput);

    await prisma.$transaction(
      async (tx) => {
        const orders = await tx.saleOrder.findMany({ where: { id: { in: ids } } });
        if (orders.length !== ids.length) throw new Error("存在无效单据");
        const bad = orders.find((o) => o.status !== "ACTIVE" || o.invoiceNo);
        if (bad) throw new Error(`${bad.orderNo} 已开票或已作废，不能重复开票`);

        for (const order of orders) {
          const invoiceNo = await nextOrderNo("INV", invoiceDate, {
            countSameDay: () =>
              tx.saleOrder.count({
                where: { invoiceDate: dayRange(invoiceDate) },
              }),
            isTaken: (no) =>
              tx.saleOrder.findUnique({ where: { invoiceNo: no } }).then(Boolean),
          });
          await tx.saleOrder.update({
            where: { id: order.id },
            data: {
              invoiceNo,
              invoiceDate,
              invoicedAt: new Date(),
              invoicedById: user.id,
            },
          });
        }
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    revalidatePath("/invoices");
    revalidatePath("/sales");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "开票失败" };
  }
}

/** 撤销开票（ADMIN）：原号留痕到 lastRevokedInvoiceNo */
export async function revokeInvoice(saleOrderId: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const order = await prisma.saleOrder.findUnique({ where: { id: saleOrderId } });
    if (!order) return { ok: false, error: "单据不存在" };
    if (order.status !== "ACTIVE") return { ok: false, error: "已作废的单不能操作" };
    if (!order.invoiceNo) return { ok: false, error: "该单未开票" };

    await prisma.saleOrder.update({
      where: { id: saleOrderId },
      data: {
        lastRevokedInvoiceNo: order.invoiceNo,
        invoiceNo: null,
        invoiceDate: null,
        invoicedAt: null,
        invoicedById: null,
      },
    });

    revalidatePath("/invoices");
    revalidatePath("/sales");
    revalidatePath(`/sales/${saleOrderId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "撤销失败" };
  }
}
