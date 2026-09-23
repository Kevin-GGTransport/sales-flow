"use client";

import Link from "next/link";
import { PartKindBadge, type PartKindValue } from "@/components/parts/PartKindBadge";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";

export type PartRow = {
  id: string;
  partNumber: string;
  name: string;
  brand: string | null;
  kind: PartKindValue;
  qty: number;
  avgText: string;
  avg: number | null;
  suggestedSalePriceText: string;
  suggestedSalePrice: number | null;
  valueText: string;
  value: number | null;
  isActive: boolean;
};

// 列定义不闭包任何 props，提升到模块级保持引用稳定（DataTable 的 useMemo 依赖它）
const columns: DataTableColumn<PartRow>[] = [
    {
      key: "partNumber",
      header: "配件号",
      sortValue: (r) => r.partNumber,
      cell: (r) => (
        <>
          <Link
            href={`/parts/${r.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {r.partNumber}
          </Link>
          {!r.isActive && (
            <span className="ml-2 text-xs text-muted-foreground">已停用</span>
          )}
        </>
      ),
    },
    { key: "name", header: "名称", sortValue: (r) => r.name, cell: (r) => r.name },
    { key: "brand", header: "品牌", sortValue: (r) => r.brand, cell: (r) => r.brand ?? "-" },
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
      key: "avg",
      header: "平均成本",
      align: "right",
      mono: true,
      sortValue: (r) => r.avg,
      cell: (r) => r.avgText,
    },
    {
      key: "suggestedSalePrice",
      header: "建议售价",
      align: "right",
      mono: true,
      sortValue: (r) => r.suggestedSalePrice,
      cell: (r) => r.suggestedSalePriceText,
    },
    {
      key: "value",
      header: "库存价值",
      align: "right",
      mono: true,
      sortValue: (r) => r.value,
      cell: (r) => r.valueText,
    },
];

export function PartsTable({ rows, empty }: { rows: PartRow[]; empty?: React.ReactNode }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      empty={empty ?? "还没有配件，点右上角「新建配件」"}
      initialSort={{ key: "partNumber", dir: "asc" }}
      rowClassName={(r) => (r.isActive ? "" : "text-muted-foreground")}
    />
  );
}
