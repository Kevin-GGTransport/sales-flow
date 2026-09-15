import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { Decimal } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
import {
  inventoryAbnormalCounts,
  inventoryValueTotal,
  outstandingDueTotals,
} from "@/lib/reports";
import { StatCard } from "@/components/ui/stat-card";
import { TablePanel } from "@/components/ui/table-panel";
import { PageHeader } from "@/components/ui/page-header";
import { RecentOrdersTable, type RecentOrderRow } from "@/components/orders/RecentOrdersTable";

function monthRangeUtc(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export default async function DashboardPage() {
  const { start, end } = monthRangeUtc();

  const [
    session,
    monthPurchases,
    monthSales,
    monthPayments,
    inventoryValue,
    abnormal,
    dues,
    uninvoicedCount,
    recentPurchases,
    recentSales,
  ] = await Promise.all([
    auth(),
    prisma.purchaseOrder.aggregate({
      _sum: { totalAmount: true },
      where: { status: "ACTIVE", orderDate: { gte: start, lt: end } },
    }),
    prisma.saleOrder.aggregate({
      _sum: { totalAmount: true },
      where: { status: "ACTIVE", orderDate: { gte: start, lt: end } },
    }),
    prisma.payment.groupBy({
      by: ["saleOrderId", "purchaseOrderId"],
      _sum: { amount: true },
      where: { payDate: { gte: start, lt: end } },
    }),
    // SQL 聚合（不再全表拉单据/库存进 JS reduce，见 lib/reports.ts）
    inventoryValueTotal(),
    inventoryAbnormalCounts(),
    outstandingDueTotals(),
    prisma.saleOrder.count({ where: { status: "ACTIVE", invoiceNo: null } }),
    prisma.purchaseOrder.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.saleOrder.findMany({
      include: { createdBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const zero = new Decimal(0);
  const received = monthPayments
    .filter((p) => p.saleOrderId)
    .reduce((s, p) => s.add(p._sum.amount ?? zero), zero);
  const paid = monthPayments
    .filter((p) => p.purchaseOrderId)
    .reduce((s, p) => s.add(p._sum.amount ?? zero), zero);

  // 库存异常 = 负库存 ∪ 低库存（minQty>0 且 0≤qty≤minQty），定义互斥可直接相加
  const { negative: negativeParts, low: lowParts } = abnormal;
  const abnormalParts = negativeParts + lowParts;

  const { receivable: totalReceivable, payable: totalPayable } = dues;

  const cards = [
    { label: "本月卖出（单据）", value: formatUSD(monthSales._sum.totalAmount), href: "/orders?tab=sales" },
    { label: "本月实收（现金）", value: formatUSD(received), href: "/settlement?tab=payments" },
    { label: "本月买入（单据）", value: formatUSD(monthPurchases._sum.totalAmount), href: "/orders?tab=purchases" },
    { label: "本月实付（现金）", value: formatUSD(paid), href: "/settlement?tab=payments" },
    { label: "当前库存总价值", value: formatUSD(inventoryValue), href: "/reports" },
  ];

  const alerts = [
    {
      label: "应收欠款（客户欠我们）",
      value: formatUSD(totalReceivable),
      href: "/settlement?tab=payments",
      tone: totalReceivable.greaterThan(0) ? "destructive" : "muted",
    },
    {
      label: "应付欠款（我们欠供应商）",
      value: formatUSD(totalPayable),
      href: "/settlement?tab=payments",
      tone: totalPayable.greaterThan(0) ? "muted" : "muted",
    },
    {
      label: "库存异常配件（负 + 低）",
      value: String(abnormalParts),
      href: "/inventory?filter=abnormal",
      tone: abnormalParts > 0 ? "destructive" : "muted",
    },
    {
      label: "未开票卖出单",
      value: String(uninvoicedCount),
      href: "/settlement?tab=invoices",
      tone: uninvoicedCount > 0 ? "muted" : "muted",
    },
  ];

  const recentRows: RecentOrderRow[] = [
    ...recentPurchases.map((o) => ({
      id: o.id,
      kind: "买入" as const,
      href: `/purchases/${o.id}`,
      orderNo: o.orderNo,
      orderDate: formatDateString(o.orderDate),
      counterparty: o.supplierName,
      amountText: formatUSD(o.totalAmount),
      amount: o.totalAmount.toNumber(),
      status: o.status,
      invoiceNo: null,
      createdBy: o.createdBy.name,
    })),
    ...recentSales.map((o) => ({
      id: o.id,
      kind: "卖出" as const,
      href: `/sales/${o.id}`,
      orderNo: o.orderNo,
      orderDate: formatDateString(o.orderDate),
      counterparty: o.customerName,
      amountText: formatUSD(o.totalAmount),
      amount: o.totalAmount.toNumber(),
      status: o.status,
      invoiceNo: o.invoiceNo,
      createdBy: o.createdBy.name,
    })),
  ]
    .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader title={<>你好，{session?.user?.name ?? ""}</>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <StatCard key={c.label} label={c.label} value={c.value} href={c.href} />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {alerts.map((a) => (
          <StatCard
            key={a.label}
            label={a.label}
            value={a.value}
            href={a.href}
            size="sm"
            tone={a.tone === "destructive" ? "destructive" : "default"}
          />
        ))}
      </div>

      <TablePanel title="最近单据">
        <RecentOrdersTable rows={recentRows} />
      </TablePanel>
    </div>
  );
}
