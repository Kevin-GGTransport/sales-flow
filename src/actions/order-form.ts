"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import type { PartOption } from "@/components/parts/PartPicker";

const partSelect = {
  id: true,
  partNumber: true,
  name: true,
  brand: true,
  kind: true,
  suggestedSalePrice: true,
  inventory: { select: { qty: true } },
} as const;

/** 最近 50 单的付款方式去重（下拉建议，最多 12 个） */
async function paymentMethodHistory(
  kind: "sale" | "purchase",
): Promise<string[]> {
  const rows =
    kind === "sale"
      ? await prisma.saleOrder.findMany({
          where: { paymentMethod: { not: null } },
          select: { paymentMethod: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : await prisma.purchaseOrder.findMany({
          where: { paymentMethod: { not: null } },
          select: { paymentMethod: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
  return [
    ...new Set(
      rows.flatMap((row) =>
        row.paymentMethod?.trim() ? [row.paymentMethod.trim()] : [],
      ),
    ),
  ].slice(0, 12);
}

/**
 * 新建单弹窗的表单数据：打开时现查（懒加载）——
 * /orders 页加载零开销，且配件清单/付款方式建议永远新鲜。
 */
export async function fetchNewSaleOrderData(): Promise<{
  parts: PartOption[];
  paymentMethodHistory: string[];
}> {
  await requireUser();
  const [partRows, history] = await Promise.all([
    prisma.part.findMany({
      where: { isActive: true, kind: { not: "CUSTODY" } },
      select: partSelect,
      orderBy: { partNumber: "asc" },
    }),
    paymentMethodHistory("sale"),
  ]);
  return {
    parts: partRows.map((p) => ({
      ...p,
      qty: p.inventory?.qty ?? 0,
      suggestedSalePrice: p.suggestedSalePrice?.toString() ?? null,
    })),
    paymentMethodHistory: history,
  };
}

/** 同上，买入单（只列自营配件） */
export async function fetchNewPurchaseOrderData(): Promise<{
  parts: PartOption[];
  paymentMethodHistory: string[];
}> {
  await requireUser();
  const [partRows, history] = await Promise.all([
    prisma.part.findMany({
      where: { isActive: true, kind: "OWNED" },
      select: partSelect,
      orderBy: { partNumber: "asc" },
    }),
    paymentMethodHistory("purchase"),
  ]);
  return {
    parts: partRows.map((p) => ({
      ...p,
      qty: p.inventory?.qty ?? 0,
      suggestedSalePrice: p.suggestedSalePrice?.toString() ?? null,
    })),
    paymentMethodHistory: history,
  };
}
