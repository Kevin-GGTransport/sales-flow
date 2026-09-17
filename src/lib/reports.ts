import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@/lib/money";
import { formatDateString } from "@/lib/validation";

export type InventoryReportRow = {
  partId: string;
  partNumber: string;
  name: string;
  kind: "OWNED" | "CONSIGNMENT";
  qty: number;
  avgCost: string;
  value: string;
};

/** 库存报表：自营件（数量/均价/价值）+ 寄卖件（数量）分开返回 */
export async function inventoryReport(): Promise<{
  owned: InventoryReportRow[];
  consignment: InventoryReportRow[];
  ownedTotalValue: string;
}> {
  const parts = await prisma.part.findMany({
    where: { isActive: true, kind: { not: "CUSTODY" } },
    include: { inventory: true },
    orderBy: { partNumber: "asc" },
  });

  const toRow = (p: (typeof parts)[number]): InventoryReportRow => {
    const qty = p.inventory?.qty ?? 0;
    const avg = p.inventory?.avgCost ?? new Decimal(0);
    const value = avg.mul(qty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    return {
      partId: p.id,
      partNumber: p.partNumber,
      name: p.name,
      kind: p.kind as "OWNED" | "CONSIGNMENT",
      qty,
      avgCost: avg.toDecimalPlaces(4).toString(),
      value: value.toString(),
    };
  };

  const owned = parts.filter((p) => p.kind === "OWNED").map(toRow);
  const consignment = parts.filter((p) => p.kind === "CONSIGNMENT").map(toRow);
  const ownedTotalValue = owned
    .reduce((s, r) => s.add(new Decimal(r.value)), new Decimal(0))
    .toString();

  return { owned, consignment, ownedTotalValue };
}

export type MonthlyRow = {
  month: string; // yyyy-MM
  purchaseAmount: string;
  saleAmount: string;
  consignmentSale: string;
  netAmount: string; // 卖出 − 买入（单据口径）
};

type RawMonthly = { month: Date; total: Prisma.Decimal; consignment: Prisma.Decimal | null };

/** 月度单据口径：按 orderDate 汇总 ACTIVE 买入/卖出额（卖出拆寄卖） */
export async function monthlyByOrderDate(year: number): Promise<MonthlyRow[]> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const purchases: RawMonthly[] = await prisma.$queryRaw(
    Prisma.sql`
      SELECT date_trunc('month', o."orderDate") AS month, SUM(o."totalAmount") AS total, NULL AS consignment
      FROM "PurchaseOrder" o
      WHERE o."status" = 'ACTIVE' AND o."orderDate" >= ${start} AND o."orderDate" < ${end}
      GROUP BY 1 ORDER BY 1
    `,
  );
  const sales: RawMonthly[] = await prisma.$queryRaw(
    Prisma.sql`
      SELECT date_trunc('month', o."orderDate") AS month,
             SUM(l."lineTotal") AS total,
             SUM(CASE WHEN l."isConsignment" THEN l."lineTotal" ELSE 0 END) AS consignment
      FROM "SaleOrder" o
      JOIN "SaleOrderLine" l ON l."orderId" = o."id"
      WHERE o."status" = 'ACTIVE' AND o."orderDate" >= ${start} AND o."orderDate" < ${end}
      GROUP BY 1 ORDER BY 1
    `,
  );

  const map = new Map<string, MonthlyRow>();
  const key = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  const empty = (m: string): MonthlyRow => ({
    month: m,
    purchaseAmount: "0",
    saleAmount: "0",
    consignmentSale: "0",
    netAmount: "0",
  });

  for (const r of purchases) {
    const row = map.get(key(r.month)) ?? empty(key(r.month));
    row.purchaseAmount = r.total.toString();
    map.set(key(r.month), row);
  }
  for (const r of sales) {
    const row = map.get(key(r.month)) ?? empty(key(r.month));
    row.saleAmount = (r.total ?? new Decimal(0)).toString();
    row.consignmentSale = (r.consignment ?? new Decimal(0)).toString();
    map.set(key(r.month), row);
  }
  for (const row of map.values()) {
    row.netAmount = new Decimal(row.saleAmount)
      .sub(new Decimal(row.purchaseAmount))
      .toDecimalPlaces(2)
      .toString();
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export type CashRow = {
  month: string;
  received: string; // 实收（卖出单收款）
  paid: string; // 实付（买入单付款）
  net: string;
};

/** 月度现金口径：按 payDate 汇总收付款 */
export async function monthlyCashByPayDate(year: number): Promise<CashRow[]> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const rows: { month: Date; received: Prisma.Decimal; paid: Prisma.Decimal }[] =
    await prisma.$queryRaw(
      Prisma.sql`
        SELECT date_trunc('month', p."payDate") AS month,
               SUM(CASE WHEN p."saleOrderId" IS NOT NULL THEN p."amount" ELSE 0 END) AS received,
               SUM(CASE WHEN p."purchaseOrderId" IS NOT NULL THEN p."amount" ELSE 0 END) AS paid
        FROM "Payment" p
        WHERE p."payDate" >= ${start} AND p."payDate" < ${end}
        GROUP BY 1 ORDER BY 1
      `,
    );

  return rows.map((r) => ({
    month: `${r.month.getUTCFullYear()}-${String(r.month.getUTCMonth() + 1).padStart(2, "0")}`,
    received: r.received.toString(),
    paid: r.paid.toString(),
    net: r.received.sub(r.paid).toDecimalPlaces(2).toString(),
  }));
}

export type ProfitMonthRow = {
  month: string;
  revenue: string; // 自营行收入
  cost: string;
  profit: string;
};

export type ProfitPartRow = {
  partId: string;
  partNumber: string;
  name: string;
  qtySold: number;
  revenue: string;
  cost: string;
  profit: string;
};

/** 利润统计（仅自营行）：按月 */
export async function profitByMonth(year: number): Promise<ProfitMonthRow[]> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const rows: { month: Date; revenue: Prisma.Decimal; cost: Prisma.Decimal }[] =
    await prisma.$queryRaw(
      Prisma.sql`
        SELECT date_trunc('month', o."orderDate") AS month,
               SUM(l."lineTotal") AS revenue,
               SUM(l."costTotal") AS cost
        FROM "SaleOrder" o
        JOIN "SaleOrderLine" l ON l."orderId" = o."id"
        WHERE o."status" = 'ACTIVE' AND l."isConsignment" = false
          AND o."orderDate" >= ${start} AND o."orderDate" < ${end}
        GROUP BY 1 ORDER BY 1
      `,
    );

  return rows.map((r) => ({
    month: `${r.month.getUTCFullYear()}-${String(r.month.getUTCMonth() + 1).padStart(2, "0")}`,
    revenue: r.revenue.toString(),
    cost: r.cost.toString(),
    profit: r.revenue.sub(r.cost).toDecimalPlaces(2).toString(),
  }));
}

/** 利润统计（仅自营行）：按配件（全年） */
export async function profitByPart(year: number): Promise<ProfitPartRow[]> {
  const start = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year + 1, 0, 1));

  const rows: {
    partId: string;
    partNumber: string;
    name: string;
    qty: bigint;
    revenue: Prisma.Decimal;
    cost: Prisma.Decimal;
  }[] = await prisma.$queryRaw(
    Prisma.sql`
      SELECT p."id" AS "partId", p."partNumber", p."name",
             SUM(l."qty") AS qty,
             SUM(l."lineTotal") AS revenue,
             SUM(l."costTotal") AS cost
      FROM "SaleOrder" o
      JOIN "SaleOrderLine" l ON l."orderId" = o."id"
      JOIN "Part" p ON p."id" = l."partId"
      WHERE o."status" = 'ACTIVE' AND l."isConsignment" = false
        AND o."orderDate" >= ${start} AND o."orderDate" < ${end}
      GROUP BY p."id", p."partNumber", p."name"
      ORDER BY revenue DESC
    `,
  );

  return rows.map((r) => ({
    partId: r.partId,
    partNumber: r.partNumber,
    name: r.name,
    qtySold: Number(r.qty),
    revenue: r.revenue.toString(),
    cost: r.cost.toString(),
    profit: r.revenue.sub(r.cost).toDecimalPlaces(2).toString(),
  }));
}

/** 应收/应付余额汇总（按客户/供应商）；总额与汇总页/销账页同源（未取整先过滤后求和） */
export async function outstandingSummary(): Promise<{
  receivables: { customerName: string; orderNo: string; due: string; orderId: string }[];
  payables: { supplierName: string; orderNo: string; due: string; orderId: string }[];
  totalReceivable: string;
  totalPayable: string;
}> {
  const [[sales, purchases], totals] = await Promise.all([
    Promise.all([
      prisma.saleOrder.findMany({
        where: { status: "ACTIVE" },
        include: { payments: { select: { amount: true } } },
        orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
      }),
      prisma.purchaseOrder.findMany({
        where: { status: "ACTIVE" },
        include: { payments: { select: { amount: true } } },
        orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
      }),
    ]),
    outstandingDueTotals(),
  ]);

  const due = (total: Prisma.Decimal, ps: { amount: Prisma.Decimal }[]) =>
    total.sub(ps.reduce((s, p) => s.add(p.amount), new Decimal(0)));

  const receivables = sales
    .map((o) => ({
      customerName: o.customerName,
      orderNo: o.orderNo,
      orderId: o.id,
      due: due(o.totalAmount, o.payments),
    }))
    .filter((r) => r.due.greaterThan(0.004))
    .map((r) => ({ ...r, due: r.due.toDecimalPlaces(2).toString() }));
  const payables = purchases
    .map((o) => ({
      supplierName: o.supplierName,
      orderNo: o.orderNo,
      orderId: o.id,
      due: due(o.totalAmount, o.payments),
    }))
    .filter((r) => r.due.greaterThan(0.004))
    .map((r) => ({ ...r, due: r.due.toDecimalPlaces(2).toString() }));

  return {
    receivables,
    payables,
    totalReceivable: totals.receivable.toDecimalPlaces(2).toString(),
    totalPayable: totals.payable.toDecimalPlaces(2).toString(),
  };
}

/**
 * ── SQL 聚合（汇总页/销账页使用，替代全表拉取进 JS reduce）──
 * 全程 numeric 精确；展示侧 formatUSD 再取整。
 */

/** 库存总价值：Σ qty×avgCost（寄卖件 avgCost=0 天然不计入），结果 2 位 half-up */
export async function inventoryValueTotal(): Promise<Decimal> {
  const rows: { total: Prisma.Decimal }[] = await prisma.$queryRaw(
    Prisma.sql`SELECT COALESCE(SUM(i."qty" * i."avgCost"), 0) AS total FROM "Inventory" i`,
  );
  return rows[0].total.toDecimalPlaces(2);
}

/** 库存异常计数（口径同库存页：负库存 ∪ 低库存，互斥可相加） */
export async function inventoryAbnormalCounts(): Promise<{
  negative: number;
  low: number;
}> {
  const rows: { negative: bigint; low: bigint }[] = await prisma.$queryRaw(
    Prisma.sql`
      SELECT
        COUNT(*) FILTER (WHERE i."qty" < 0) AS negative,
        COUNT(*) FILTER (WHERE p."minQty" > 0 AND i."qty" >= 0 AND i."qty" <= p."minQty") AS low
      FROM "Inventory" i
      JOIN "Part" p ON p."id" = i."partId"
    `,
  );
  return { negative: Number(rows[0].negative), low: Number(rows[0].low) };
}

async function saleDueTotal(): Promise<Prisma.Decimal> {
  const rows: { total: Prisma.Decimal }[] = await prisma.$queryRaw(
    Prisma.sql`
      SELECT COALESCE(SUM(t."due"), 0) AS total FROM (
        SELECT o."totalAmount" - COALESCE(pp."paid", 0) AS "due"
        FROM "SaleOrder" o
        LEFT JOIN (
          SELECT "saleOrderId" AS id, SUM("amount") AS paid
          FROM "Payment" WHERE "saleOrderId" IS NOT NULL GROUP BY 1
        ) pp ON pp."id" = o."id"
        WHERE o."status" = 'ACTIVE'
      ) t WHERE t."due" > 0.004
    `,
  );
  return rows[0].total;
}

async function purchaseDueTotal(): Promise<Prisma.Decimal> {
  const rows: { total: Prisma.Decimal }[] = await prisma.$queryRaw(
    Prisma.sql`
      SELECT COALESCE(SUM(t."due"), 0) AS total FROM (
        SELECT o."totalAmount" - COALESCE(pp."paid", 0) AS "due"
        FROM "PurchaseOrder" o
        LEFT JOIN (
          SELECT "purchaseOrderId" AS id, SUM("amount") AS paid
          FROM "Payment" WHERE "purchaseOrderId" IS NOT NULL GROUP BY 1
        ) pp ON pp."id" = o."id"
        WHERE o."status" = 'ACTIVE'
      ) t WHERE t."due" > 0.004
    `,
  );
  return rows[0].total;
}

/**
 * 应收/应付欠款总额：逐单 due = totalAmount − Σpayments，due > 0.004 过滤后
 * 对未取整值求和（历史汇总口径；相关页面同源，天然一致）。
 */
export async function outstandingDueTotals(): Promise<{
  receivable: Decimal;
  payable: Decimal;
}> {
  const [receivable, payable] = await Promise.all([
    saleDueTotal(),
    purchaseDueTotal(),
  ]);
  return { receivable, payable };
}

export type OutstandingOrder = {
  orderId: string;
  orderNo: string;
  orderDate: string;
  partyName: string;
  total: Prisma.Decimal;
  paid: Prisma.Decimal;
  due: Prisma.Decimal;
};

/** 未结清单（销账页）：全程 Decimal 算欠款，无 take 截断，仅返回 due>0 的单 */
export async function outstandingOrders(
  kind: "sale" | "purchase",
): Promise<OutstandingOrder[]> {
  const zero = new Decimal(0);
  const build = (
    orders: {
      id: string;
      orderNo: string;
      orderDate: Date;
      partyName: string;
      totalAmount: Prisma.Decimal;
      payments: { amount: Prisma.Decimal }[];
    }[],
  ): OutstandingOrder[] =>
    orders
      .map((o) => {
        const paid = o.payments.reduce((s, p) => s.add(p.amount), zero);
        return {
          orderId: o.id,
          orderNo: o.orderNo,
          orderDate: formatDateString(o.orderDate),
          partyName: o.partyName,
          total: o.totalAmount,
          paid,
          due: o.totalAmount.sub(paid),
        };
      })
      .filter((r) => r.due.greaterThan(0.004));

  if (kind === "sale") {
    const sales = await prisma.saleOrder.findMany({
      where: { status: "ACTIVE" },
      include: { payments: { select: { amount: true } } },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
    });
    return build(sales.map((o) => ({ ...o, partyName: o.customerName })));
  }

  const purchases = await prisma.purchaseOrder.findMany({
    where: { status: "ACTIVE" },
    include: { payments: { select: { amount: true } } },
    orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
  });
  return build(purchases.map((o) => ({ ...o, partyName: o.supplierName })));
}
