import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy } from "lucide-react";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Decimal, formatUSD } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { VoidOrderDialog } from "@/components/orders/VoidOrderDialog";
import { PaymentsCard } from "@/components/payments/PaymentsCard";

export default async function SaleDetailPage({
  params,
}: PageProps<"/sales/[id]">) {
  const { id } = await params;
  const [order, session] = await Promise.all([
    prisma.saleOrder.findUnique({
      where: { id },
      include: {
        lines: { include: { part: true } },
        createdBy: { select: { name: true } },
        voidedBy: { select: { name: true } },
        payments: {
          include: { createdBy: { select: { name: true } } },
          orderBy: { payDate: "asc" },
        },
      },
    }),
    auth(),
  ]);
  if (!order) notFound();

  const isAdminFlag = isAdmin(session);
  const grossProfit = order.lines
    .filter((l) => !l.isConsignment)
    .reduce((sum, l) => sum.add(l.lineTotal.sub(l.costTotal)), new Decimal(0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/orders?tab=sales"
            className="text-sm text-muted-foreground hover:underline"
          >
            ← 卖出单
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{order.orderNo}</h1>
          <OrderStatusBadge status={order.status} />
          {order.invoiceNo && <Badge>已开票 {order.invoiceNo}</Badge>}
        </div>
        <div className="flex gap-2">
          {order.status === "ACTIVE" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/sales/new?copyFrom=${order.id}`}>
                <Copy className="size-4" />
                复制重开
              </Link>
            </Button>
          )}
          {isAdminFlag && order.status === "ACTIVE" && (
            <VoidOrderDialog
              kind="sale"
              orderId={order.id}
              disabled={Boolean(order.invoiceNo)}
              disabledReason="已开票的单不能直接作废：请先在「开票」页撤销开票。"
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">单据信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm md:grid-cols-2">
          <p>日期：{formatDateString(order.orderDate)}</p>
          <p>客户：{order.customerName}</p>
          {order.customerContact && <p>联系方式：{order.customerContact}</p>}
          <p>总金额：<span className="font-medium">{formatUSD(order.totalAmount)}</span></p>
          <p>自营毛利：<span className="font-medium">{formatUSD(grossProfit)}</span></p>
          <p>录单人：{order.createdBy.name}</p>
          {order.invoiceNo && (
            <p>
              开票：{order.invoiceNo}（{formatDateString(order.invoiceDate)}）
            </p>
          )}
          {order.note && <p className="md:col-span-2">备注：{order.note}</p>}
          {order.status === "VOID" && (
            <p className="md:col-span-2 text-destructive">
              作废原因：{order.voidReason}（{order.voidedBy?.name ?? ""} 于{" "}
              {order.voidedAt ? formatDateString(order.voidedAt) : ""}）
            </p>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配件号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">售价</TableHead>
              <TableHead className="text-right">小计</TableHead>
              <TableHead className="text-right">成本/件</TableHead>
              <TableHead className="text-right">成本合计</TableHead>
              <TableHead className="text-right">毛利</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {order.lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <Link
                    href={`/parts/${line.partId}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {line.part.partNumber}
                  </Link>
                </TableCell>
                <TableCell>
                  {line.part.name}
                  {line.isConsignment && (
                    <Badge variant="outline" className="ml-1.5">
                      寄卖
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">{line.qty}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUSD(line.unitPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUSD(line.lineTotal)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {line.isConsignment ? "-" : formatUSD(line.costAtSale)}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {line.isConsignment ? "-" : formatUSD(line.costTotal)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {line.isConsignment ? (
                    <span className="text-muted-foreground">寄卖不计</span>
                  ) : (
                    formatUSD(line.lineTotal.sub(line.costTotal))
                  )}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={4} className="text-right font-medium">
                合计
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatUSD(order.totalAmount)}
              </TableCell>
              <TableCell colSpan={2} />
              <TableCell className="text-right font-medium tabular-nums">
                {formatUSD(grossProfit)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {order.status === "ACTIVE" && (
        <PaymentsCard
          kind="sale"
          orderId={order.id}
          totalAmount={order.totalAmount.toString()}
          payments={order.payments.map((p) => ({
            id: p.id,
            method: p.method,
            amount: p.amount.toString(),
            payDate: formatDateString(p.payDate),
            note: p.note,
            by: p.createdBy.name,
          }))}
          isAdmin={isAdminFlag}
        />
      )}

      {order.status === "ACTIVE" && (
        <p className="text-xs text-muted-foreground">
          成本为卖出当时的加权平均成本快照，不随后续进货变化；开票与收款相互独立。
        </p>
      )}
    </div>
  );
}
