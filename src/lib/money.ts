import { Prisma } from "@/generated/prisma/client";

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

export type MoneyInput = Prisma.Decimal | string | number;

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** 四位小数 half-up（加权平均成本内部精度） */
export function round4(d: Prisma.Decimal): Prisma.Decimal {
  return d.toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}

/** 两位小数 half-up（金额落库精度） */
export function round2(d: Prisma.Decimal): Prisma.Decimal {
  return d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

/** 展示：$1,234.56（美元，两位小数） */
export function formatUSD(value: MoneyInput | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const d = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return usd.format(round2(d).toNumber());
}

/** 展示成本类字段：内部最多 4 位，展示去掉尾零（如 15 / 13.3333） */
export function formatCost(value: MoneyInput | null | undefined): string {
  if (value === null || value === undefined) return "-";
  const d = value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
  return round4(d).toString();
}

/** 数量 × 单价 → 两位小数金额 */
export function lineTotalOf(qty: number, unitPrice: MoneyInput): Prisma.Decimal {
  const price = unitPrice instanceof Prisma.Decimal ? unitPrice : new Prisma.Decimal(unitPrice);
  return round2(price.mul(qty));
}
