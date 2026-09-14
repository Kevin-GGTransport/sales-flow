"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { withTxRetry } from "@/lib/inventory";
import { dateToUtcMidnight } from "@/lib/validation";
import type { ActionResult } from "@/actions/parts";

/**
 * 代保管：别家存放的货，只记数量与归属，不涉及钱（无成本/无价值/不可卖出）。
 * 新建条目 = 登记货主 + 配件；后续出入走 movement（留痕），现存数量事务内维护。
 */
export async function createCustodyItem(input: {
  ownerName: string;
  partNumber: string;
  partName: string;
  note?: string;
}): Promise<ActionResult> {
  try {
    await requireUser();
    const ownerName = input.ownerName.trim();
    const partNumber = input.partNumber.trim();
    const partName = input.partName.trim();
    if (!ownerName) return { ok: false, error: "货主必填" };
    if (!partNumber) return { ok: false, error: "配件号必填" };
    if (!partName) return { ok: false, error: "名称必填" };

    const item = await prisma.custodyItem.create({
      data: {
        ownerName,
        partNumber,
        partName,
        note: input.note?.trim() || null,
      },
    });
    revalidatePath("/inventory");
    return { ok: true, id: item.id };
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) {
      return { ok: false, error: "该货主已有此配件号，请直接对已有条目入库" };
    }
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

/** 入库 / 退回（qty > 0 入库、qty < 0 退回；退回不能超过现存，纯保管不允许负数） */
export async function addCustodyMovement(input: {
  custodyItemId: string;
  qty: number;
  reason?: string;
  moveDate?: string;
}): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const qty = Math.trunc(input.qty);
    if (!Number.isInteger(qty) || qty === 0) {
      return { ok: false, error: "数量必须是非零整数（正数入库、负数退回）" };
    }

    await withTxRetry(async (tx) => {
      // FOR UPDATE 锁行防并发退回超量
      const rows = await tx.$queryRaw<{ id: string; qty: number }[]>`
        SELECT "id", "qty" FROM "CustodyItem" WHERE "id" = ${input.custodyItemId} FOR UPDATE`;
      const current = rows[0];
      if (!current) throw new Error("条目不存在");
      if (current.qty + qty < 0) {
        throw new Error(`退回数量超过现存（现存 ${current.qty} 件）`);
      }

      await tx.custodyMovement.create({
        data: {
          custodyItemId: input.custodyItemId,
          qty,
          reason: input.reason?.trim() || null,
          moveDate: dateToUtcMidnight(input.moveDate),
          createdById: user.id,
        },
      });
      await tx.custodyItem.update({
        where: { id: input.custodyItemId },
        data: { qty: current.qty + qty },
      });
    });

    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

/** 编辑档案（货主/配件号/名称/备注，不动数量） */
export async function updateCustodyItem(
  id: string,
  input: {
    ownerName: string;
    partNumber: string;
    partName: string;
    note?: string;
  },
): Promise<ActionResult> {
  try {
    await requireUser();
    const ownerName = input.ownerName.trim();
    const partNumber = input.partNumber.trim();
    const partName = input.partName.trim();
    if (!ownerName) return { ok: false, error: "货主必填" };
    if (!partNumber) return { ok: false, error: "配件号必填" };
    if (!partName) return { ok: false, error: "名称必填" };

    await prisma.custodyItem.update({
      where: { id },
      data: { ownerName, partNumber, partName, note: input.note?.trim() || null },
    });
    revalidatePath("/inventory");
    return { ok: true, id };
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) {
      return { ok: false, error: "该货主已有此配件号" };
    }
    return { ok: false, error: e instanceof Error ? e.message : "保存失败" };
  }
}

/** 停用 / 启用（留痕不删；有存量的条目停用前先退清） */
export async function toggleCustodyItem(
  id: string,
  next: boolean,
): Promise<ActionResult> {
  try {
    await requireUser();
    const item = await prisma.custodyItem.findUnique({ where: { id }, select: { qty: true } });
    if (!item) return { ok: false, error: "条目不存在" };
    if (!next && item.qty !== 0) {
      return { ok: false, error: `还有现存 ${item.qty} 件未退回，退清后才能停用` };
    }
    await prisma.custodyItem.update({ where: { id }, data: { isActive: next } });
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "操作失败" };
  }
}
