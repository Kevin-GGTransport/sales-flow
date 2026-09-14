import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatDateString, PAYMENT_METHOD_LABEL } from "@/lib/validation";
import {
  outstandingDueTotals,
  outstandingOrders,
  type OutstandingOrder,
} from "@/lib/reports";
import { StatCard } from "@/components/ui/stat-card";
import { TablePanel } from "@/components/ui/table-panel";
import {
  PayablesTable,
  PaymentFlowTable,
  ReceivablesTable,
  type OutstandingRow,
  type PaymentFlowRow,
} from "@/components/payments/PaymentsTables";

/** 结算中心 · 销账 Tab（原 /payments 列表主体搬迁） */
export async function PaymentsPanel() {
  const [totals, sales, purchases, recentPayments] = await Promise.all([
    outstandingDueTotals(),
    outstandingOrders("sale"),
    outstandingOrders("purchase"),
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

  // Decimal 只留在服务端：客户端组件拿显示字符串 + 排序数值双字段
  const toRows = (orders: OutstandingOrder[]): OutstandingRow[] =>
    orders.map((o) => ({
      orderId: o.orderId,
      orderNo: o.orderNo,
      orderDate: o.orderDate,
      partyName: o.partyName,
      totalText: formatUSD(o.total),
      total: o.total.toNumber(),
      paidText: formatUSD(o.paid),
      paid: o.paid.toNumber(),
      dueText: formatUSD(o.due),
      due: o.due.toNumber(),
    }));

  const receivables = toRows(sales);
  const payables = toRows(purchases);

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
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          label="应收欠款总额（客户欠我们）"
          value={formatUSD(totals.receivable)}
          size="lg"
          labelSize="sm"
          tone="destructive"
        />
        <StatCard
          label="应付欠款总额（我们欠供应商）"
          value={formatUSD(totals.payable)}
          size="lg"
          labelSize="sm"
        />
      </div>

      <TablePanel title="应收 · 未结清卖出单">
        <ReceivablesTable rows={receivables} />
      </TablePanel>
      <TablePanel title="应付 · 未结清买入单">
        <PayablesTable rows={payables} />
      </TablePanel>
      <TablePanel title="近期收付款流水">
        <PaymentFlowTable rows={flowRows} />
      </TablePanel>
    </div>
  );
}
