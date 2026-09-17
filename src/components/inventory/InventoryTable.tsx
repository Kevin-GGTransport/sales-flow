"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PartKindBadge, type PartKindValue } from "@/components/parts/PartKindBadge";
import { StockAdjustDialog } from "@/components/parts/StockAdjustDialog";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";

export type InventoryRow = {
  id: string;
  partNumber: string;
  name: string;
  kind: PartKindValue;
  minQty: number;
  qty: number;
  avgText: string;
  avg: number | null;
  valueText: string;
  value: number | null;
  status: "normal" | "low" | "negative";
};

// 列工厂闭包 isAdmin（自营盘盈亏仅 ADMIN 行内可见；寄卖调整 STAFF 也可），
// 组件内 useMemo 包裹保持引用稳定（DataTable 的 useMemo 依赖它）——同 PaymentsTables 先例
function createColumns(isAdmin: boolean, custodyOnly: boolean): DataTableColumn<InventoryRow>[] {
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
      sortValue: (r) => r.kind,
      cell: (r) => <PartKindBadge kind={r.kind} />,
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
    {
      key: "actions",
      header: "操作",
      className: "w-0",
      cell: (r) =>
        r.kind !== "OWNED" || isAdmin ? (
          <StockAdjustDialog
            partId={r.id}
            partNumber={r.partNumber}
            kind={r.kind}
            compact
          />
        ) : null,
    },
  ];
  return custodyOnly
    ? columns.filter((column) => !["type", "minQty", "avg", "value"].includes(column.key))
    : columns;
}

export function InventoryTable({
  rows,
  isAdmin = false,
  custodyOnly = false,
  empty,
}: {
  rows: InventoryRow[];
  isAdmin?: boolean;
  custodyOnly?: boolean;
  empty?: React.ReactNode;
}) {
  const columns = useMemo(
    () => createColumns(isAdmin, custodyOnly),
    [isAdmin, custodyOnly],
  );
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      empty={empty ?? "还没有库存数据"}
      initialSort={custodyOnly ? { key: "partNumber", dir: "asc" } : { key: "value", dir: "desc" }}
    />
  );
}
