"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { AddPaymentDialog } from "@/components/payments/AddPaymentDialog";
import { Button } from "@/components/ui/button";

export type OutstandingRow = {
  orderId: string;
  orderNo: string;
  orderDate: string;
  partyName: string;
  totalText: string;
  total: number;
  paidText: string;
  paid: number;
  dueText: string;
  due: number;
};

export type PaymentFlowRow = {
  id: string;
  payDate: string;
  direction: "收入" | "支出";
  orderNo: string | null;
  method: string;
  amountText: string;
  amount: number;
  note: string | null;
  createdBy: string;
};

function outstandingColumns(
  kind: "sale" | "purchase",
  onAdd: (row: OutstandingRow) => void,
): DataTableColumn<OutstandingRow>[] {
  return [
    {
      key: "orderNo",
      header: "单号",
      mono: true,
      cell: (r) => (
        <Link
          href={kind === "sale" ? `/sales/${r.orderId}` : `/purchases/${r.orderId}`}
          className="text-[13px] font-medium underline-offset-4 hover:underline"
        >
          {r.orderNo}
        </Link>
      ),
    },
    { key: "orderDate", header: "日期", sortValue: (r) => r.orderDate, cell: (r) => r.orderDate },
    { key: "party", header: kind === "sale" ? "客户" : "供应商", sortValue: (r) => r.partyName, cell: (r) => r.partyName },
    { key: "total", header: "总金额", align: "right", mono: true, sortValue: (r) => r.total, cell: (r) => r.totalText },
    { key: "paid", header: kind === "sale" ? "已收" : "已付", align: "right", mono: true, sortValue: (r) => r.paid, cell: (r) => r.paidText },
    {
      key: "due",
      header: "未结",
      align: "right",
      mono: true,
      sortValue: (r) => r.due,
      cell: (r) => <span className="font-medium text-destructive">{r.dueText}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-0",
      cell: (r) => (
        <Button size="sm" variant="outline" type="button" onClick={() => onAdd(r)}>
          <Plus className="size-4" />
          {kind === "sale" ? "记收款" : "记付款"}
        </Button>
      ),
    },
  ];
}

/**
 * 未结清单 + 单例「记收款/付款」弹窗：每行只渲染一个轻按钮，
 * 点开才挂载唯一的 AddPaymentDialog（key=orderId 换行重置表单）。
 */
function OutstandingTable({
  kind,
  rows,
  empty,
}: {
  kind: "sale" | "purchase";
  rows: OutstandingRow[];
  empty: string;
}) {
  const [target, setTarget] = useState<OutstandingRow | null>(null);
  // setTarget 引用稳定，列数组只在 kind 变化时重建
  const columns = useMemo(() => outstandingColumns(kind, setTarget), [kind, setTarget]);

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.orderId}
        empty={empty}
      />
      {target && (
        <AddPaymentDialog
          key={target.orderId}
          kind={kind}
          orderId={target.orderId}
          defaultAmount={target.due.toFixed(2)}
          open
          onOpenChange={(o) => !o && setTarget(null)}
        />
      )}
    </>
  );
}

export function ReceivablesTable({ rows }: { rows: OutstandingRow[] }) {
  return (
    <OutstandingTable kind="sale" rows={rows} empty="没有未结清的卖出单" />
  );
}

export function PayablesTable({ rows }: { rows: OutstandingRow[] }) {
  return (
    <OutstandingTable kind="purchase" rows={rows} empty="没有未结清的买入单" />
  );
}

const flowColumns: DataTableColumn<PaymentFlowRow>[] = [
  { key: "payDate", header: "日期", sortValue: (r) => r.payDate, cell: (r) => r.payDate },
  {
    key: "direction",
    header: "方向",
    card: "badge",
    sortValue: (r) => r.direction,
    cell: (r) =>
      r.direction === "收入" ? (
        <span className="text-primary">{r.direction}</span>
      ) : (
        <span className="text-muted-foreground">{r.direction}</span>
      ),
  },
  {
    key: "orderNo",
    header: "单号",
    mono: true,
    sortValue: (r) => r.orderNo,
    cell: (r) => r.orderNo ?? "-",
  },
  { key: "method", header: "方式", sortValue: (r) => r.method, cell: (r) => r.method },
  { key: "amount", header: "金额", align: "right", mono: true, sortValue: (r) => r.amount, cell: (r) => r.amountText },
  { key: "note", header: "备注", cell: (r) => r.note ?? "-" },
  { key: "by", header: "经办", sortValue: (r) => r.createdBy, cell: (r) => r.createdBy },
];

export function PaymentFlowTable({ rows }: { rows: PaymentFlowRow[] }) {
  return (
    <DataTable
      columns={flowColumns}
      rows={rows}
      rowKey={(r) => r.id}
      empty="还没有收付款记录"
    />
  );
}
