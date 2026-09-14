"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

export type SaleRow = {
  id: string;
  orderNo: string;
  orderDate: string;
  customerName: string;
  lines: number;
  totalAmountText: string;
  totalAmount: number;
  invoiceNo: string | null;
  status: "ACTIVE" | "VOID";
  createdBy: string;
};

// 列定义不闭包任何 props，提升到模块级保持引用稳定（DataTable 的 useMemo 依赖它）
const columns: DataTableColumn<SaleRow>[] = [
    {
      key: "orderNo",
      header: "单号",
      mono: true,
      cell: (r) => (
        <Link
          href={`/sales/${r.id}`}
          className="text-[13px] font-medium underline-offset-4 hover:underline"
        >
          {r.orderNo}
        </Link>
      ),
    },
    { key: "orderDate", header: "日期", sortValue: (r) => r.orderDate, cell: (r) => r.orderDate },
    { key: "customer", header: "客户", sortValue: (r) => r.customerName, cell: (r) => r.customerName },
    { key: "lines", header: "行数", align: "right", mono: true, sortValue: (r) => r.lines, cell: (r) => r.lines },
    {
      key: "total",
      header: "总金额",
      align: "right",
      mono: true,
      sortValue: (r) => r.totalAmount,
      cell: (r) => r.totalAmountText,
    },
    {
      key: "invoice",
      header: "开票",
      card: "badge",
      sortValue: (r) => r.invoiceNo,
      cell: (r) =>
        r.invoiceNo ? (
          <span className="font-mono text-xs">{r.invoiceNo}</span>
        ) : r.status === "ACTIVE" ? (
          <Badge variant="secondary">未开票</Badge>
        ) : (
          "-"
        ),
    },
    { key: "status", header: "状态", card: "badge", cell: (r) => <OrderStatusBadge status={r.status} /> },
    { key: "by", header: "录单人", sortValue: (r) => r.createdBy, cell: (r) => r.createdBy },
];

export function SalesTable({ rows }: { rows: SaleRow[] }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      empty="没有卖出单"
      rowClassName={(r) => (r.status === "VOID" ? "opacity-60" : "")}
    />
  );
}
