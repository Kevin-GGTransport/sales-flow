"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { lockInventoryRows, withTxRetry } from "@/lib/inventory";
import { dateToUtcMidnight } from "@/lib/validation";
import type { ActionResult } from "@/actions/parts";

/**
 * 寄卖库存调整（仅寄卖件，如明治）：只动数量不记钱。
 * qty > 0 = 寄卖入库；qty < 0 = 退回寄卖方。
 */
export async function addStockAdjustment(input: {
  partId: string;
  qty: number;
  reason?: string;
  adjDate?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const qty = Math.trunc(input.qty);
    if (!Number.isInteger(qty) || qty === 0) {
      return { ok: false, error: "数量必须是非零整数（正数入库、负数退回）" };
    }

    await withTxRetry(async (tx) => {
      const part = await tx.part.findUnique({
        where: { id: input.partId },
        select: { id: true, isConsignment: true, partNumber: true },
      });
      if (!part) throw new Error("配件不存在");
      if (!part.isConsignment) {
        throw new Error(
          `自营件（${part.partNumber}）不能走寄卖调整，入库请用买入单`,
        );
      }

      const invMap = await lockInventoryRows(tx, [part.id]);
      const current = invMap.get(part.id)?.qty ?? 0;

      await tx.stockAdjustment.create({
        data: {
          partId: part.id,
          qty,
          reason: input.reason?.trim() || null,
          adjDate: dateToUtcMidnight(input.adjDate),
          createdById: user.id,
        },
      });

      await tx.inventory.upsert({
        where: { partId: part.id },
        create: { partId: part.id, qty: current + qty },
        update: { qty: current + qty },
      });
    });

    revalidatePath(`/parts/${input.partId}`);
    revalidatePath("/parts");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}
