"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/guard";
import { lockInventoryRows, recomputeByReplay, withTxRetry } from "@/lib/inventory";
import { dateToUtcMidnight } from "@/lib/validation";
import type { ActionResult } from "@/actions/parts";

/**
 * 库存调整：只动数量不记钱，重放中为 qty-only 事件（不动 avgCost）。
 * - 寄卖：STAFF 可用。qty > 0 = 入库；qty < 0 = 退回。
 * - 代保管：STAFF 可用。qty > 0 = 增加；qty < 0 = 消耗。
 * - 自营件：仅 ADMIN（盘盈/盘亏）。盘盈成本基础视为 0——不是采购不进加权平均，
 *   avgCost 与库存单位成本不变；盘亏只核销数量。正常进货请用买入单。
 */
export async function addStockAdjustment(input: {
  partId: string;
  qty: number;
  reason?: string;
  adjDate?: string;
}): Promise<ActionResult> {
  try {
    const qty = Math.trunc(input.qty);
    if (!Number.isInteger(qty) || qty === 0) {
      return { ok: false, error: "数量必须是非零整数（正数入库/盘盈、负数退回/盘亏）" };
    }

    const part = await prisma.part.findUnique({
      where: { id: input.partId },
      select: { kind: true },
    });
    if (!part) return { ok: false, error: "配件不存在" };

    // 寄卖/代保管调整人人可用；自营件盘盈/盘亏仅管理员
    const user = part.kind === "OWNED" ? await requireAdmin() : await requireUser();

    await withTxRetry(async (tx) => {
      const current = await lockInventoryRows(tx, [input.partId]);
      if (part.kind === "CUSTODY" && (current.get(input.partId)?.qty ?? 0) + qty < 0) {
        throw new Error("消耗数量不能超过当前代保管库存");
      }
      await tx.stockAdjustment.create({
        data: {
          partId: input.partId,
          qty,
          reason: input.reason?.trim() || null,
          adjDate: dateToUtcMidnight(input.adjDate),
          createdById: user.id,
        },
      });
      // 统一走重放：回填日期的调整可能改变其后进货的 reset/blend 分支（qty 跨 0 时）
      await recomputeByReplay(tx, input.partId);
    });

    revalidatePath(`/parts/${input.partId}`);
    revalidatePath("/parts");
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}
