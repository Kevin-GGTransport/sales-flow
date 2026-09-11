import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { Decimal } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

function monthRangeUtc(): { start: Date; end: Date } {
  const now = new Date();
  return {
    start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
    end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
  };
}

export default async function DashboardPage() {
  const session = await auth();
  const { start, end } = monthRangeUtc();

  const [
    monthPurchases,
    monthSales,
    monthPayments,
    inventories,
    unsettledSales,
    unsettledPurchases,
    uninvoicedCount,
    recentPurchases,
    recentSales,
  ] = await Promise.all([
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
    prisma.inventory.findMany({
      select: { qty: true, avgCost: true, part: { select: { minQty: true } } },
    }),
    prisma.saleOrder.findMany({
      where: { status: "ACTIVE" },
      include: { payments: { select: { amount: true } } },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: "ACTIVE" },
      include: { payments: { select: { amount: true } } },
    }),
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

  const inventoryValue = inventories
    .reduce((s, i) => s.add(i.avgCost.mul(i.qty)), zero)
    .toDecimalPlaces(2);
  // 库存异常 = 负库存 ∪ 低库存（minQty>0 且 0≤qty≤minQty），定义互斥可直接相加
  const negativeParts = inventories.filter((i) => i.qty < 0).length;
  const lowParts = inventories.filter(
    (i) => i.part.minQty > 0 && i.qty >= 0 && i.qty <= i.part.minQty,
  ).length;
  const abnormalParts = negativeParts + lowParts;

  const due = (t: Decimal, ps: { amount: Decimal }[]) =>
    t.sub(ps.reduce((s, p) => s.add(p.amount), zero));
  const totalReceivable = unsettledSales
    .map((o) => due(o.totalAmount, o.payments))
    .filter((d) => d.greaterThan(0.004))
    .reduce((s, d) => s.add(d), zero);
  const totalPayable = unsettledPurchases
    .map((o) => due(o.totalAmount, o.payments))
    .filter((d) => d.greaterThan(0.004))
    .reduce((s, d) => s.add(d), zero);

  const cards = [
    { label: "本月卖出（单据）", value: formatUSD(monthSales._sum.totalAmount), href: "/sales" },
    { label: "本月实收（现金）", value: formatUSD(received), href: "/payments" },
    { label: "本月买入（单据）", value: formatUSD(monthPurchases._sum.totalAmount), href: "/purchases" },
    { label: "本月实付（现金）", value: formatUSD(paid), href: "/payments" },
    { label: "当前库存总价值", value: formatUSD(inventoryValue), href: "/reports" },
  ];

  const alerts = [
    {
      label: "应收欠款（客户欠我们）",
      value: formatUSD(totalReceivable),
      href: "/payments",
      tone: totalReceivable.greaterThan(0) ? "destructive" : "muted",
    },
    {
      label: "应付欠款（我们欠供应商）",
      value: formatUSD(totalPayable),
      href: "/payments",
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
      href: "/invoices",
      tone: uninvoicedCount > 0 ? "muted" : "muted",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        你好，{session?.user?.name ?? ""}
      </h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {c.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums">{c.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {alerts.map((a) => (
          <Link key={a.label} href={a.href} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardContent className="flex items-center justify-between pt-4">
                <span className="text-xs text-muted-foreground">{a.label}</span>
                <span
                  className={
                    a.tone === "destructive"
                      ? "text-lg font-semibold tabular-nums text-destructive"
                      : "text-lg font-semibold tabular-nums"
                  }
                >
                  {a.value}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-sm font-medium">最近单据</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>类型</TableHead>
              <TableHead>单号</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>对方</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>录单人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              ...recentPurchases.map((o) => ({
                id: o.id,
                kind: "买入" as const,
                href: `/purchases/${o.id}`,
                orderNo: o.orderNo,
                date: o.orderDate,
                counterparty: o.supplierName,
                amount: o.totalAmount,
                status: o.status,
                invoice: null as string | null,
                by: o.createdBy.name,
              })),
              ...recentSales.map((o) => ({
                id: o.id,
                kind: "卖出" as const,
                href: `/sales/${o.id}`,
                orderNo: o.orderNo,
                date: o.orderDate,
                counterparty: o.customerName,
                amount: o.totalAmount,
                status: o.status,
                invoice: o.invoiceNo,
                by: o.createdBy.name,
              })),
            ]
              .sort((a, b) => b.date.getTime() - a.date.getTime())
              .slice(0, 10)
              .map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Badge variant={r.kind === "买入" ? "secondary" : "outline"}>
                      {r.kind}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={r.href} className="font-medium underline-offset-4 hover:underline">
                      {r.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateString(r.date)}</TableCell>
                  <TableCell>{r.counterparty}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUSD(r.amount)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <OrderStatusBadge status={r.status} />
                      {r.invoice && <span className="text-xs text-muted-foreground">{r.invoice}</span>}
                    </div>
                  </TableCell>
                  <TableCell>{r.by}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
