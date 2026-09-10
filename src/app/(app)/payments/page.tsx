import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatDateString, PAYMENT_METHOD_LABEL } from "@/lib/validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddPaymentDialog } from "@/components/payments/PaymentsCard";

export default async function PaymentsPage() {
  const [sales, purchases, recentPayments] = await Promise.all([
    prisma.saleOrder.findMany({
      where: { status: "ACTIVE" },
      include: { payments: { select: { amount: true } } },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.purchaseOrder.findMany({
      where: { status: "ACTIVE" },
      include: { payments: { select: { amount: true } } },
      orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
      take: 200,
    }),
    prisma.payment.findMany({
      include: {
        createdBy: { select: { name: true } },
        saleOrder: { select: { orderNo: true } },
        purchaseOrder: { select: { orderNo: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const outstanding = (total: { toNumber: () => number }, ps: { amount: { toNumber: () => number } }[]) =>
    total.toNumber() - ps.reduce((s, p) => s + p.amount.toNumber(), 0);

  const receivables = sales
    .map((o) => ({ order: o, due: outstanding(o.totalAmount, o.payments) }))
    .filter((r) => r.due > 0.004);
  const payables = purchases
    .map((o) => ({ order: o, due: outstanding(o.totalAmount, o.payments) }))
    .filter((r) => r.due > 0.004);

  const totalReceivable = receivables.reduce((s, r) => s + r.due, 0);
  const totalPayable = payables.reduce((s, r) => s + r.due, 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">销账</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              应收欠款总额（客户欠我们）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-destructive">
              {formatUSD(totalReceivable)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              应付欠款总额（我们欠供应商）
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatUSD(totalPayable)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-sm font-medium">应收 · 未结清卖出单</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>单号</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>客户</TableHead>
              <TableHead className="text-right">总金额</TableHead>
              <TableHead className="text-right">已收</TableHead>
              <TableHead className="text-right">未结</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {receivables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                  没有未结清的卖出单
                </TableCell>
              </TableRow>
            ) : (
              receivables.map(({ order, due }) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/sales/${order.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {order.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateString(order.orderDate)}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUSD(order.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUSD(order.totalAmount.toNumber() - due)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-destructive">
                    {formatUSD(due)}
                  </TableCell>
                  <TableCell>
                    <AddPaymentDialog
                      kind="sale"
                      orderId={order.id}
                      defaultAmount={due.toFixed(2)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-sm font-medium">应付 · 未结清买入单</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>单号</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>供应商</TableHead>
              <TableHead className="text-right">总金额</TableHead>
              <TableHead className="text-right">已付</TableHead>
              <TableHead className="text-right">未结</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                  没有未结清的买入单
                </TableCell>
              </TableRow>
            ) : (
              payables.map(({ order, due }) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/purchases/${order.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {order.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateString(order.orderDate)}</TableCell>
                  <TableCell>{order.supplierName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUSD(order.totalAmount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUSD(order.totalAmount.toNumber() - due)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums text-destructive">
                    {formatUSD(due)}
                  </TableCell>
                  <TableCell>
                    <AddPaymentDialog
                      kind="purchase"
                      orderId={order.id}
                      defaultAmount={due.toFixed(2)}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-sm font-medium">近期收付款流水</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>方向</TableHead>
              <TableHead>单号</TableHead>
              <TableHead>方式</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>备注</TableHead>
              <TableHead>经办</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                  还没有收付款记录
                </TableCell>
              </TableRow>
            ) : (
              recentPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{formatDateString(p.payDate)}</TableCell>
                  <TableCell>
                    {p.saleOrderId ? (
                      <span className="text-primary">收入</span>
                    ) : (
                      <span className="text-muted-foreground">支出</span>
                    )}
                  </TableCell>
                  <TableCell>{p.saleOrder?.orderNo ?? p.purchaseOrder?.orderNo}</TableCell>
                  <TableCell>{PAYMENT_METHOD_LABEL[p.method]}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUSD(p.amount)}
                  </TableCell>
                  <TableCell>{p.note ?? "-"}</TableCell>
                  <TableCell>{p.createdBy.name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
