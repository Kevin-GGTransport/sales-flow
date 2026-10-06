"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/guard";
import { formatDateString } from "@/lib/validation";
import type { PartOption } from "@/components/parts/PartPicker";
import type { SaleOrderInitial } from "@/components/orders/SaleOrderForm";
import type { PurchaseOrderInitial } from "@/components/orders/PurchaseOrderForm";

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

/**
 * 编辑单弹窗的表单数据：打开时现查（懒加载）。
 * 单上已停用的配件并入清单——否则 PartPicker 里看不见该行，一保存就把行丢掉。
 * 调用方是详情页（ADMIN 按钮门控），提交侧再由 update action 复核权限与状态。
 */
export async function fetchEditSaleOrderData(
  orderId: string,
): Promise<
  | { error: string }
  | {
      error?: undefined;
      parts: PartOption[];
      paymentMethodHistory: string[];
      initial: SaleOrderInitial;
    }
> {
  await requireUser();
  const [order, partRows, history] = await Promise.all([
    prisma.saleOrder.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          select: {
            partId: true,
            qty: true,
            unitPrice: true,
            part: {
              select: {
                id: true,
                partNumber: true,
                name: true,
                brand: true,
                kind: true,
                suggestedSalePrice: true,
                inventory: { select: { qty: true } },
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.part.findMany({
      where: { isActive: true, kind: { not: "CUSTODY" } },
      select: partSelect,
      orderBy: { partNumber: "asc" },
    }),
    paymentMethodHistory("sale"),
  ]);
  if (!order) return { error: "单据不存在" };
  if (order.status === "VOID") return { error: "该单已作废，不能修改" };
  if (order.invoiceNo) return { error: "该单已开票，请先在「开票」页撤销开票再修改" };

  const partMap = new Map<string, PartOption>(
    partRows.map((p) => [
      p.id,
      {
        ...p,
        qty: p.inventory?.qty ?? 0,
        suggestedSalePrice: p.suggestedSalePrice?.toString() ?? null,
      } satisfies PartOption,
    ]),
  );
  for (const line of order.lines) {
    if (partMap.has(line.partId)) continue;
    const p = line.part;
    partMap.set(p.id, {
      id: p.id,
      partNumber: p.partNumber,
      name: p.name,
      brand: p.brand,
      kind: p.kind,
      suggestedSalePrice: p.suggestedSalePrice?.toString() ?? null,
      qty: p.inventory?.qty ?? 0,
    });
  }

  return {
    parts: [...partMap.values()].sort((a, b) =>
      a.partNumber.localeCompare(b.partNumber),
    ),
    paymentMethodHistory: history,
    initial: {
      orderId: order.id,
      orderDate: formatDateString(order.orderDate),
      customerName: order.customerName,
      customerContact: order.customerContact ?? "",
      customerAddress: order.customerAddress ?? "",
      paymentMethod: order.paymentMethod ?? "",
      note: order.note ?? "",
      taxRate: order.taxRate.toString(),
      lines: order.lines.map((l) => ({
        partId: l.partId,
        qty: l.qty,
        unitPrice: l.unitPrice.toString(),
      })),
    },
  };
}

/** 同上，买入单（只列自营配件） */
export async function fetchEditPurchaseOrderData(
  orderId: string,
): Promise<
  | { error: string }
  | {
      error?: undefined;
      parts: PartOption[];
      paymentMethodHistory: string[];
      initial: PurchaseOrderInitial;
    }
> {
  await requireUser();
  const [order, partRows, history] = await Promise.all([
    prisma.purchaseOrder.findUnique({
      where: { id: orderId },
      include: {
        lines: {
          select: {
            partId: true,
            qty: true,
            unitPrice: true,
            part: {
              select: {
                id: true,
                partNumber: true,
                name: true,
                brand: true,
                kind: true,
                suggestedSalePrice: true,
                inventory: { select: { qty: true } },
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.part.findMany({
      where: { isActive: true, kind: "OWNED" },
      select: partSelect,
      orderBy: { partNumber: "asc" },
    }),
    paymentMethodHistory("purchase"),
  ]);
  if (!order) return { error: "单据不存在" };
  if (order.status === "VOID") return { error: "该单已作废，不能修改" };

  const partMap = new Map<string, PartOption>(
    partRows.map((p) => [
      p.id,
      {
        ...p,
        qty: p.inventory?.qty ?? 0,
        suggestedSalePrice: p.suggestedSalePrice?.toString() ?? null,
      } satisfies PartOption,
    ]),
  );
  for (const line of order.lines) {
    if (partMap.has(line.partId)) continue;
    const p = line.part;
    partMap.set(p.id, {
      id: p.id,
      partNumber: p.partNumber,
      name: p.name,
      brand: p.brand,
      kind: p.kind,
      suggestedSalePrice: p.suggestedSalePrice?.toString() ?? null,
      qty: p.inventory?.qty ?? 0,
    });
  }

  return {
    parts: [...partMap.values()].sort((a, b) =>
      a.partNumber.localeCompare(b.partNumber),
    ),
    paymentMethodHistory: history,
    initial: {
      orderId: order.id,
      orderDate: formatDateString(order.orderDate),
      supplierName: order.supplierName,
      paymentMethod: order.paymentMethod ?? "",
      note: order.note ?? "",
      lines: order.lines.map((l) => ({
        partId: l.partId,
        qty: l.qty,
        unitPrice: l.unitPrice.toString(),
      })),
    },
  };
}
