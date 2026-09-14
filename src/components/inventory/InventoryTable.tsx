"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ConsignmentBadge } from "@/components/parts/ConsignmentBadge";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";

export type InventoryRow = {
  id: string;
  partNumber: string;
  name: string;
  isConsignment: boolean;
  minQty: number;
  qty: number;
  avgText: string;
  avg: number | null;
  valueText: string;
  value: number | null;
  status: "normal" | "low" | "negative";
};

// 列定义不闭包任何 props，提升到模块级保持引用稳定（DataTable 的 useMemo 依赖它）
const columns: DataTableColumn<InventoryRow>[] = [
    {
      key: "partNumber",
      header: "配件号",
      sortValue: (r) => r.partNumber,
      cell: (r) => (
        <Link
          href={`/parts/${r.id}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {r.partNumber}
        </Link>
      ),
    },
    { key: "name", header: "名称", sortValue: (r) => r.name, cell: (r) => r.name },
    {
      key: "type",
      header: "类型",
      card: "badge",
      sortValue: (r) => (r.isConsignment ? "寄卖" : "自营"),
      cell: (r) => <ConsignmentBadge isConsignment={r.isConsignment} />,
    },
    {
      key: "qty",
      header: "库存",
      align: "right",
      mono: true,
      sortValue: (r) => r.qty,
      cell: (r) => (
        <span className={r.qty < 0 ? "font-medium text-destructive" : undefined}>
          {r.qty}
        </span>
      ),
    },
    {
      key: "minQty",
      header: "安全库存",
      align: "right",
      mono: true,
      sortValue: (r) => r.minQty,
      cell: (r) => (r.minQty > 0 ? r.minQty : "-"),
    },
    {
      key: "avg",
      header: "平均成本",
      align: "right",
      mono: true,
      sortValue: (r) => r.avg,
      cell: (r) => r.avgText,
    },
    {
      key: "value",
      header: "库存价值",
      align: "right",
      mono: true,
      sortValue: (r) => r.value,
      cell: (r) => r.valueText,
    },
    {
      key: "status",
      header: "状态",
      card: "badge",
      cell: (r) =>
        r.status === "negative" ? (
          <Badge variant="destructive">负库存</Badge>
        ) : r.status === "low" ? (
          <Badge variant="outline">低库存</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
];

export function InventoryTable({
  rows,
  empty,
}: {
  rows: InventoryRow[];
  empty?: React.ReactNode;
}) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      empty={empty ?? "还没有库存数据"}
      initialSort={{ key: "value", dir: "desc" }}
    />
  );
}
