import Link from "next/link";
import { Landmark, PackageCheck, ReceiptText, TrendingUp } from "lucide-react";
import { ConsignmentBadge } from "@/components/parts/ConsignmentBadge";
import {
  CashTrendChart,
  InventoryValueChart,
  OrderTrendChart,
  PartProfitChart,
  ProfitTrendChart,
} from "@/components/reports/ReportCharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { TablePanel } from "@/components/ui/table-panel";
import { EmptyRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCost, formatUSD } from "@/lib/money";
import {
  inventoryReport,
  monthlyByOrderDate,
  monthlyCashByPayDate,
  outstandingSummary,
  profitByMonth,
  profitByPart,
} from "@/lib/reports";

function sum<T>(rows: T[], field: keyof T): number {
  return rows.reduce((total, row) => {
    const value = Number(row[field] ?? 0);
    return total + (Number.isFinite(value) ? value : 0);
  }, 0);
}

export default async function ReportsPage({ searchParams }: PageProps<"/reports">) {
  const sp = await searchParams;
  const currentYear = new Date().getUTCFullYear();
  const year = Number((sp.year ?? currentYear).toString()) || currentYear;

  const [inventory, monthly, cash, profitMonths, profitParts, outstanding] = await Promise.all([
    inventoryReport(),
    monthlyByOrderDate(year),
    monthlyCashByPayDate(year),
    profitByMonth(year),
    profitByPart(year),
    outstandingSummary(),
  ]);

  const years = Array.from({ length: 3 }, (_, index) => currentYear - index);
  const annualSales = sum(monthly, "saleAmount");
  const annualPurchases = sum(monthly, "purchaseAmount");
  const annualCashNet = sum(cash, "net");
  const annualProfit = sum(profitMonths, "profit");
  const ownedRevenue = sum(profitMonths, "revenue");
  const margin = ownedRevenue > 0 ? (annualProfit / ownedRevenue) * 100 : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="统计报表"
        meta={<span className="text-sm text-muted-foreground">{year} 年经营脉搏</span>}
        actions={
          <nav className="flex gap-2" aria-label="选择统计年份">
            {years.map((item) => (
              <Button key={item} asChild variant={item === year ? "default" : "outline"} size="sm">
                <Link href={`/reports?year=${item}`} aria-current={item === year ? "page" : undefined}>{item}</Link>
              </Button>
            ))}
          </nav>
        }
      />

      <section aria-labelledby="annual-summary-title">
        <SectionTitle id="annual-summary-title" icon={Landmark}>年度总览</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="年度卖出" value={formatUSD(annualSales)} size="lg" />
          <StatCard label="年度买入" value={formatUSD(annualPurchases)} size="lg" />
          <StatCard label="净现金流" value={formatUSD(annualCashNet)} size="lg" tone={annualCashNet < 0 ? "destructive" : "default"} />
          <StatCard label="自营毛利" value={formatUSD(annualProfit)} size="lg" tone={annualProfit < 0 ? "destructive" : "default"}>
            <p className="mt-1 text-xs text-muted-foreground">毛利率 {margin.toFixed(1)}%</p>
          </StatCard>
        </div>
      </section>

      <section aria-labelledby="trend-title">
        <SectionTitle id="trend-title" icon={TrendingUp}>经营趋势</SectionTitle>
        <div className="grid gap-4 xl:grid-cols-2">
          <OrderTrendChart rows={monthly} year={year} />
          <CashTrendChart rows={cash} year={year} />
          <ProfitTrendChart rows={profitMonths} year={year} />
          <PartProfitChart rows={profitParts} year={year} />
        </div>
      </section>

      <section aria-labelledby="position-title">
        <SectionTitle id="position-title" icon={PackageCheck}>库存与往来</SectionTitle>
        <div className="grid gap-4 xl:grid-cols-2">
          <InventoryValueChart rows={inventory.owned} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <DebtCard
              title="应收欠款"
              description={`客户欠我们 · ${outstanding.receivables.length} 笔未结`}
              total={outstanding.totalReceivable}
              destructive
              rows={outstanding.receivables.map((row) => ({ id: row.orderId, label: `${row.customerName} · ${row.orderNo}`, due: row.due }))}
            />
            <DebtCard
              title="应付欠款"
              description={`我们欠供应商 · ${outstanding.payables.length} 笔未结`}
              total={outstanding.totalPayable}
              rows={outstanding.payables.map((row) => ({ id: row.orderId, label: `${row.supplierName} · ${row.orderNo}`, due: row.due }))}
            />
          </div>
        </div>
      </section>

      <details className="group rounded-lg border bg-card shadow-xs">
        <summary className="cursor-pointer list-none px-4 py-3 font-heading text-sm font-medium marker:hidden">
          库存明细
          <span className="ml-2 font-sans text-xs font-normal text-muted-foreground group-open:hidden">展开查看全部配件</span>
          <span className="ml-2 hidden font-sans text-xs font-normal text-muted-foreground group-open:inline">收起明细</span>
        </summary>
        <div className="space-y-4 border-t p-4">
          <OwnedInventoryTable rows={inventory.owned} total={inventory.ownedTotalValue} />
          <ConsignmentInventoryTable rows={inventory.consignment} />
        </div>
      </details>
    </div>
  );
}

function SectionTitle({ id, icon: Icon, children }: { id: string; icon: typeof Landmark; children: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <h2 id={id} className="font-heading text-sm font-semibold">{children}</h2>
    </div>
  );
}

function DebtCard({ title, description, total, rows, destructive = false }: {
  title: string;
  description: string;
  total: string;
  rows: { id: string; label: string; due: string }[];
  destructive?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <ReceiptText className={destructive ? "size-4 text-destructive" : "size-4 text-muted-foreground"} aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={destructive ? "font-mono text-2xl font-semibold text-destructive" : "font-mono text-2xl font-semibold"}>{formatUSD(total)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        <div className="mt-4 space-y-2 border-t pt-3 text-sm">
          {rows.slice(0, 4).map((row) => (
            <div key={row.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">{row.label}</span>
              <span className="shrink-0 font-mono">{formatUSD(row.due)}</span>
            </div>
          ))}
          {rows.length === 0 && <p className="text-muted-foreground">当前无欠款</p>}
          {rows.length > 4 && (
            <Button asChild variant="link" size="sm" className="h-auto px-0 text-xs">
              <Link href="/settlement?tab=payments">查看其余 {rows.length - 4} 笔</Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type InventoryRows = Awaited<ReturnType<typeof inventoryReport>>["owned"];

function OwnedInventoryTable({ rows, total }: { rows: InventoryRows; total: string }) {
  return (
    <TablePanel title={<>自营库存 · 总价值 <span className="text-primary">{formatUSD(total)}</span></>}>
      <Table>
        <TableHeader><TableRow><TableHead>配件号</TableHead><TableHead>名称</TableHead><TableHead className="text-right">库存</TableHead><TableHead className="text-right">平均成本</TableHead><TableHead className="text-right">库存价值</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 ? <EmptyRow colSpan={5}>没有自营配件</EmptyRow> : rows.map((row) => (
            <TableRow key={row.partId}>
              <TableCell><PartLink id={row.partId}>{row.partNumber}</PartLink></TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell className={row.qty < 0 ? "text-right text-destructive" : "text-right"}>{row.qty}</TableCell>
              <TableCell className="text-right tabular-nums">${formatCost(row.avgCost)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatUSD(row.value)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TablePanel>
  );
}

function ConsignmentInventoryTable({ rows }: { rows: InventoryRows }) {
  return (
    <TablePanel title="寄卖库存（仅统计数量）">
      <Table>
        <TableHeader><TableRow><TableHead>配件号</TableHead><TableHead>名称</TableHead><TableHead>类型</TableHead><TableHead className="text-right">库存数量</TableHead></TableRow></TableHeader>
        <TableBody>
          {rows.length === 0 ? <EmptyRow colSpan={4}>没有寄卖配件</EmptyRow> : rows.map((row) => (
            <TableRow key={row.partId}>
              <TableCell><PartLink id={row.partId}>{row.partNumber}</PartLink></TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell><ConsignmentBadge isConsignment /></TableCell>
              <TableCell className="text-right">{row.qty}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TablePanel>
  );
}

function PartLink({ id, children }: { id: string; children: React.ReactNode }) {
  return <Link href={`/parts/${id}`} className="font-medium underline-offset-4 hover:underline">{children}</Link>;
}
