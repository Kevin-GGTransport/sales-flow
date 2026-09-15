import Link from "next/link";
import { formatUSD, formatCost } from "@/lib/money";
import {
  inventoryReport,
  monthlyByOrderDate,
  monthlyCashByPayDate,
  outstandingSummary,
  profitByMonth,
  profitByPart,
} from "@/lib/reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ConsignmentBadge } from "@/components/parts/ConsignmentBadge";
import { TablePanel } from "@/components/ui/table-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyRow,
} from "@/components/ui/table";

export default async function ReportsPage({
  searchParams,
}: PageProps<"/reports">) {
  const sp = await searchParams;
  const year = Number((sp.year ?? new Date().getUTCFullYear()).toString()) || new Date().getUTCFullYear();

  const [inventory, monthly, cash, profitMonths, profitParts, outstanding] =
    await Promise.all([
      inventoryReport(),
      monthlyByOrderDate(year),
      monthlyCashByPayDate(year),
      profitByMonth(year),
      profitByPart(year),
      outstandingSummary(),
    ]);

  const years = Array.from({ length: 3 }, (_, i) => new Date().getUTCFullYear() - i);

  return (
    <div className="space-y-6">
      <PageHeader
        title="统计报表"
        actions={
          <div className="flex gap-2">
            {years.map((y) => (
              <Button key={y} asChild variant={y === year ? "default" : "outline"} size="sm">
                <Link href={`/reports?year=${y}`}>{y}</Link>
              </Button>
            ))}
          </div>
        }
      />

      <TablePanel
        title={
          <>
            库存报表 · 自营总价值 <span className="text-primary">{formatUSD(inventory.ownedTotalValue)}</span>
          </>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配件号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="text-right">库存</TableHead>
              <TableHead className="text-right">平均成本</TableHead>
              <TableHead className="text-right">库存价值</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.owned.length === 0 ? (
              <EmptyRow colSpan={5}>没有自营配件</EmptyRow>
            ) : (
              inventory.owned.map((r) => (
                <TableRow key={r.partId}>
                  <TableCell>
                    <Link href={`/parts/${r.partId}`} className="font-medium underline-offset-4 hover:underline">
                      {r.partNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className={r.qty < 0 ? "text-right text-destructive" : "text-right"}>{r.qty}</TableCell>
                  <TableCell className="text-right tabular-nums">${formatCost(r.avgCost)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUSD(r.value)}</TableCell>
                </TableRow>
              ))
            )}
            <TableRow className="border-t-[3px] border-double bg-muted/40">
              <TableCell colSpan={4} className="text-right font-medium">合计</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatUSD(inventory.ownedTotalValue)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TablePanel>

      <TablePanel title="寄卖库存（明治等 · 只有数量，无成本价值）">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配件号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>品牌</TableHead>
              <TableHead className="text-right">库存数量</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inventory.consignment.length === 0 ? (
              <EmptyRow colSpan={4}>没有寄卖配件</EmptyRow>
            ) : (
              inventory.consignment.map((r) => (
                <TableRow key={r.partId}>
                  <TableCell>
                    <Link href={`/parts/${r.partId}`} className="font-medium underline-offset-4 hover:underline">
                      {r.partNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell><ConsignmentBadge isConsignment /></TableCell>
                  <TableCell className="text-right">{r.qty}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TablePanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <TablePanel title={`月度单据口径（按单据日期 ${year}）`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>月份</TableHead>
                <TableHead className="text-right">买入(钱出)</TableHead>
                <TableHead className="text-right">卖出(钱入)</TableHead>
                <TableHead className="text-right">其中寄卖</TableHead>
                <TableHead className="text-right">净额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthly.length === 0 ? (
                <EmptyRow colSpan={5}>{year} 年没有单据</EmptyRow>
              ) : (
                monthly.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell>{r.month}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUSD(r.purchaseAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUSD(r.saleAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatUSD(r.consignmentSale)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatUSD(r.netAmount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TablePanel>

        <TablePanel title={`月度现金口径（按收/付日期 ${year}）`}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>月份</TableHead>
                <TableHead className="text-right">实收</TableHead>
                <TableHead className="text-right">实付</TableHead>
                <TableHead className="text-right">净现金流</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cash.length === 0 ? (
                <EmptyRow colSpan={4}>{year} 年没有收付款</EmptyRow>
              ) : (
                cash.map((r) => (
                  <TableRow key={r.month}>
                    <TableCell>{r.month}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUSD(r.received)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatUSD(r.paid)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatUSD(r.net)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TablePanel>
      </div>

      <TablePanel title={`利润统计 · 按月（仅自营件，${year}）`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>月份</TableHead>
              <TableHead className="text-right">自营收入</TableHead>
              <TableHead className="text-right">成本</TableHead>
              <TableHead className="text-right">毛利</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profitMonths.length === 0 ? (
              <EmptyRow colSpan={4}>{year} 年没有自营卖出</EmptyRow>
            ) : (
              profitMonths.map((r) => (
                <TableRow key={r.month}>
                  <TableCell>{r.month}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUSD(r.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUSD(r.cost)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-primary">
                    {formatUSD(r.profit)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TablePanel>

      <TablePanel title={`利润统计 · 按配件（仅自营件，${year}）`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配件号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="text-right">卖出数量</TableHead>
              <TableHead className="text-right">收入</TableHead>
              <TableHead className="text-right">成本</TableHead>
              <TableHead className="text-right">毛利</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profitParts.length === 0 ? (
              <EmptyRow colSpan={6}>{year} 年没有自营卖出</EmptyRow>
            ) : (
              profitParts.map((r) => (
                <TableRow key={r.partId}>
                  <TableCell>
                    <Link href={`/parts/${r.partId}`} className="font-medium underline-offset-4 hover:underline">
                      {r.partNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-right">{r.qtySold}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUSD(r.revenue)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatUSD(r.cost)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium text-primary">
                    {formatUSD(r.profit)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TablePanel>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              应收欠款（客户欠我们）：{formatUSD(outstanding.totalReceivable)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {outstanding.receivables.length === 0 ? (
              <p className="text-muted-foreground">无欠款</p>
            ) : (
              outstanding.receivables.map((r) => (
                <p key={r.orderId}>
                  {r.customerName} · {r.orderNo} —{" "}
                  <span className="text-destructive">{formatUSD(r.due)}</span>
                </p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              应付欠款（我们欠供应商）：{formatUSD(outstanding.totalPayable)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {outstanding.payables.length === 0 ? (
              <p className="text-muted-foreground">无欠款</p>
            ) : (
              outstanding.payables.map((r) => (
                <p key={r.orderId}>
                  {r.supplierName} · {r.orderNo} — {formatUSD(r.due)}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
