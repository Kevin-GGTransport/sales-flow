import { prisma } from "@/lib/prisma";
import { Decimal, formatUSD } from "@/lib/money";
import { formatDateString, PAYMENT_METHOD_LABEL } from "@/lib/validation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PayablesTable,
  PaymentFlowTable,
  ReceivablesTable,
  type OutstandingRow,
  type PaymentFlowRow,
} from "@/components/payments/PaymentsTables";

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

  const toRows = (
    orders: {
      id: string;
      orderNo: string;
      orderDate: Date;
      totalAmount: Decimal;
      payments: { amount: Decimal }[];
      partyName: string;
    }[],
  ): OutstandingRow[] =>
    orders
      .map((o) => {
        const total = o.totalAmount.toNumber();
        const due = total - o.payments.reduce((s, p) => s + p.amount.toNumber(), 0);
        return {
          orderId: o.id,
          orderNo: o.orderNo,
          orderDate: formatDateString(o.orderDate),
          partyName: o.partyName,
          totalText: formatUSD(o.totalAmount),
          total,
          paidText: formatUSD(o.totalAmount.minus(due)),
          paid: total - due,
          dueText: formatUSD(due),
          due,
        };
      })
      .filter((r) => r.due > 0.004);

  const receivables = toRows(sales.map((o) => ({ ...o, partyName: o.customerName })));
  const payables = toRows(purchases.map((o) => ({ ...o, partyName: o.supplierName })));

  const totalReceivable = receivables.reduce((s, r) => s + r.due, 0);
  const totalPayable = payables.reduce((s, r) => s + r.due, 0);

  const flowRows: PaymentFlowRow[] = recentPayments.map((p) => ({
    id: p.id,
    payDate: formatDateString(p.payDate),
    direction: p.saleOrderId ? "收入" : "支出",
    orderNo: p.saleOrder?.orderNo ?? p.purchaseOrder?.orderNo ?? null,
    method: PAYMENT_METHOD_LABEL[p.method],
    amountText: formatUSD(p.amount),
    amount: p.amount.toNumber(),
    note: p.note,
    createdBy: p.createdBy.name,
  }));

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
            <p className="font-mono text-2xl font-semibold tracking-tight text-destructive">
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
            <p className="font-mono text-2xl font-semibold tracking-tight">
              {formatUSD(totalPayable)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-sm font-medium">应收 · 未结清卖出单</div>
        <ReceivablesTable rows={receivables} />
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-sm font-medium">应付 · 未结清买入单</div>
        <PayablesTable rows={payables} />
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-sm font-medium">近期收付款流水</div>
        <PaymentFlowTable rows={flowRows} />
      </div>
    </div>
  );
}
