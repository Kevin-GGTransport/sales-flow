"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

export type PurchaseRow = {
  id: string;
  orderNo: string;
  orderDate: string;
  supplierName: string;
  lines: number;
  totalAmountText: string;
  totalAmount: number;
  status: "ACTIVE" | "VOID";
  createdBy: string;
};

export function PurchasesTable({ rows }: { rows: PurchaseRow[] }) {
  const columns: DataTableColumn<PurchaseRow>[] = [
    {
      key: "orderNo",
      header: "单号",
      mono: true,
      cell: (r) => (
        <Link
          href={`/purchases/${r.id}`}
          className="text-[13px] font-medium underline-offset-4 hover:underline"
        >
          {r.orderNo}
        </Link>
      ),
    },
    { key: "orderDate", header: "日期", sortValue: (r) => r.orderDate, cell: (r) => r.orderDate },
    { key: "supplier", header: "供应商", sortValue: (r) => r.supplierName, cell: (r) => r.supplierName },
    { key: "lines", header: "行数", align: "right", mono: true, sortValue: (r) => r.lines, cell: (r) => r.lines },
    {
      key: "total",
      header: "总金额",
      align: "right",
      mono: true,
      sortValue: (r) => r.totalAmount,
      cell: (r) => r.totalAmountText,
    },
    { key: "status", header: "状态", cell: (r) => <OrderStatusBadge status={r.status} /> },
    { key: "by", header: "录单人", sortValue: (r) => r.createdBy, cell: (r) => r.createdBy },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      empty="没有买入单"
      rowClassName={(r) => (r.status === "VOID" ? "opacity-60" : "")}
    />
  );
}
