import Link from "next/link";
import { notFound } from "next/navigation";
import { Copy } from "lucide-react";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
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
import { TablePanel } from "@/components/ui/table-panel";
import { PageHeader } from "@/components/ui/page-header";

export default async function PurchaseDetailPage({
  params,
}: PageProps<"/purchases/[id]">) {
  const { id } = await params;
  const [order, session] = await Promise.all([
    prisma.purchaseOrder.findUnique({
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

  return (
    <div className="space-y-4">
      <PageHeader
        title={order.orderNo}
        back={{ href: "/orders?tab=purchases", label: "← 买入单" }}
        meta={<OrderStatusBadge status={order.status} />}
        actions={
          <div className="flex gap-2">
            {order.status === "ACTIVE" && (
              <Button asChild variant="outline" size="sm">
                <Link href={`/purchases/new?copyFrom=${order.id}`}>
                  <Copy className="size-4" />
                  复制重开
                </Link>
              </Button>
            )}
            {isAdminFlag && order.status === "ACTIVE" && (
              <VoidOrderDialog kind="purchase" orderId={order.id} />
            )}
          </div>
        }
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">单据信息</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm md:grid-cols-2">
          <p>日期：{formatDateString(order.orderDate)}</p>
          <p>供应商：{order.supplierName}</p>
          <p>总金额：<span className="font-medium">{formatUSD(order.totalAmount)}</span></p>
          <p>录单人：{order.createdBy.name}</p>
          {order.note && <p className="md:col-span-2">备注：{order.note}</p>}
          {order.status === "VOID" && (
            <p className="md:col-span-2 text-destructive">
              作废原因：{order.voidReason}（{order.voidedBy?.name ?? ""} 于{" "}
              {order.voidedAt ? formatDateString(order.voidedAt) : ""}）
            </p>
          )}
        </CardContent>
      </Card>

      <TablePanel>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配件号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">单价</TableHead>
              <TableHead className="text-right">小计</TableHead>
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
                <TableCell>{line.part.name}</TableCell>
                <TableCell className="text-right">{line.qty}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUSD(line.unitPrice)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatUSD(line.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="border-t-[3px] border-double bg-muted/40">
              <TableCell colSpan={4} className="text-right font-medium">
                合计
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatUSD(order.totalAmount)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TablePanel>

      {order.status === "ACTIVE" && (
        <PaymentsCard
          kind="purchase"
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
          单据保存后不可修改；录错了请「作废」后「复制重开」（<Badge variant="outline">寄卖</Badge>{" "}
          件不能走买入单）；有付款记录的单须先删付款才能作废。
        </p>
      )}
    </div>
  );
}
