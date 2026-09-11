"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

export type RecentOrderRow = {
  id: string;
  kind: "买入" | "卖出";
  href: string;
  orderNo: string;
  orderDate: string;
  counterparty: string;
  amountText: string;
  amount: number;
  status: "ACTIVE" | "VOID";
  invoiceNo: string | null;
  createdBy: string;
};

export function RecentOrdersTable({ rows }: { rows: RecentOrderRow[] }) {
  const columns: DataTableColumn<RecentOrderRow>[] = [
    {
      key: "kind",
      header: "类型",
      sortValue: (r) => r.kind,
      cell: (r) => (
        <Badge variant={r.kind === "买入" ? "secondary" : "outline"}>
          {r.kind}
        </Badge>
      ),
    },
    {
      key: "orderNo",
      header: "单号",
      mono: true,
      sortValue: (r) => r.orderNo,
      cell: (r) => (
        <Link
          href={r.href}
          className="text-[13px] font-medium underline-offset-4 hover:underline"
        >
          {r.orderNo}
        </Link>
      ),
    },
    { key: "orderDate", header: "日期", sortValue: (r) => r.orderDate, cell: (r) => r.orderDate },
    { key: "party", header: "对方", sortValue: (r) => r.counterparty, cell: (r) => r.counterparty },
    { key: "amount", header: "金额", align: "right", mono: true, sortValue: (r) => r.amount, cell: (r) => r.amountText },
    {
      key: "status",
      header: "状态",
      cell: (r) => (
        <div className="flex items-center gap-1">
          <OrderStatusBadge status={r.status} />
          {r.invoiceNo && (
            <span className="font-mono text-xs text-muted-foreground">{r.invoiceNo}</span>
          )}
        </div>
      ),
    },
    { key: "by", header: "录单人", sortValue: (r) => r.createdBy, cell: (r) => r.createdBy },
  ];

  return (
    <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty="还没有单据" />
  );
}
