"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/guard";
import { Decimal } from "@/lib/money";
import { dateToUtcMidnight, paymentSchema } from "@/lib/validation";
import type { ActionResult } from "@/actions/parts";

export async function addPayment(input: {
  saleOrderId?: string;
  purchaseOrderId?: string;
  method: "CASH" | "CHECK" | "ONLINE";
  amount: string;
  payDate: string;
  note?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = paymentSchema.safeParse({
      ...input,
      note: input.note ?? "",
    });
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
    }
    const data = parsed.data;
    const hasSale = Boolean(data.saleOrderId);
    const hasPurchase = Boolean(data.purchaseOrderId);
    if (hasSale === hasPurchase) {
      return { ok: false, error: "收款和付款必须二选一" };
    }

    const amount = new Decimal(data.amount);
    const payDate = dateToUtcMidnight(data.payDate);

    await prisma.$transaction(
      async (tx) => {
      // 先锁单据行，再聚合已收/付，防并发超额
      const order = hasSale
        ? await tx.saleOrder.findUnique({ where: { id: data.saleOrderId! } })
        : await tx.purchaseOrder.findUnique({ where: { id: data.purchaseOrderId! } });
      if (!order) throw new Error("单据不存在");
      if (order.status !== "ACTIVE") throw new Error("单据已作废，不能收/付款");

      // 行锁（SELECT ... FOR UPDATE）确保余额计算原子性
      await tx.$queryRaw(
        hasSale
          ? Prisma.sql`SELECT "id" FROM "SaleOrder" WHERE "id" = ${data.saleOrderId} FOR UPDATE`
          : Prisma.sql`SELECT "id" FROM "PurchaseOrder" WHERE "id" = ${data.purchaseOrderId} FOR UPDATE`,
      );

      const paidAgg = hasSale
        ? await tx.payment.aggregate({
            _sum: { amount: true },
            where: { saleOrderId: data.saleOrderId },
          })
        : await tx.payment.aggregate({
            _sum: { amount: true },
            where: { purchaseOrderId: data.purchaseOrderId },
          });
      const paid = new Decimal(paidAgg._sum.amount ?? 0);
      const outstanding = new Decimal(order.totalAmount).sub(paid);
      if (amount.gt(outstanding)) {
        throw new Error(
          `金额超过未结余额（$${outstanding.toDecimalPlaces(2).toString()}）`,
        );
      }

      await tx.payment.create({
        data: {
          method: data.method,
          amount,
          payDate,
          note: data.note || null,
          saleOrderId: hasSale ? data.saleOrderId : null,
          purchaseOrderId: hasPurchase ? data.purchaseOrderId : null,
          createdById: user.id,
        },
      });
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    revalidatePath("/payments");
    if (data.saleOrderId) revalidatePath(`/sales/${data.saleOrderId}`);
    if (data.purchaseOrderId) revalidatePath(`/purchases/${data.purchaseOrderId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

export async function deletePayment(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) return { ok: false, error: "收款记录不存在" };

    await prisma.payment.delete({ where: { id } });

    revalidatePath("/payments");
    if (payment.saleOrderId) revalidatePath(`/sales/${payment.saleOrderId}`);
    if (payment.purchaseOrderId) revalidatePath(`/purchases/${payment.purchaseOrderId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "删除失败" };
  }
}
