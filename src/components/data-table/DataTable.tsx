"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  compareValues,
  nextSortState,
  type SortState,
  type SortValue,
} from "./sort";

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  /** 数字列：右对齐 + 等宽字体（台账惯例） */
  align?: "left" | "right";
  mono?: boolean;
  /** 提供即排序；null 值恒排最后（如寄卖件的成本/价值） */
  sortValue?: (row: T) => SortValue;
  cell: (row: T) => React.ReactNode;
  className?: string;
};

/**
 * 列表页公共表格：声明式列配置 + 点列头排序（客户端排序，不动 URL）。
 * 页面侧约定：Server Component 取数并序列化（金额给显示字符串 + 排序数值），
 * 传给本组件的行必须是可序列化的纯数据。
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  initialSort = null,
  empty = "暂无数据",
  rowClassName,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  initialSort?: SortState;
  empty?: React.ReactNode;
  rowClassName?: (row: T) => string;
  className?: string;
}) {
  const [sort, setSort] = useState<SortState>(initialSort);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const valueOf = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      // 方向只作用于非 null 比较，保证 null 恒沉底
      if (va === null || vb === null) return compareValues(va, vb);
      const cmp = compareValues(va, vb);
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, columns, sort]);

  function renderHead<T2>(col: DataTableColumn<T2>, key: string) {
    const active = sort?.key === key;
    const SortIcon =
      active && sort?.dir === "asc"
        ? ArrowUp
        : active && sort?.dir === "desc"
          ? ArrowDown
          : ChevronsUpDown;
    return (
      <TableHead
        key={key}
        aria-sort={
          col.sortValue
            ? active
              ? sort?.dir === "asc"
                ? "ascending"
                : "descending"
              : "none"
            : undefined
        }
        className={cn(
          "p-0",
          col.sortValue && "group/head",
          col.align === "right" && "text-right",
          col.className,
        )}
      >
        {col.sortValue ? (
          <button
            type="button"
            onClick={() => setSort((s) => nextSortState(s, key))}
            className={cn(
              "inline-flex h-10 w-full items-center gap-1 px-2 text-left font-medium whitespace-nowrap rounded-sm outline-none transition-colors",
              "hover:bg-muted/60 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
              col.align === "right" && "justify-end text-right",
              active && "text-foreground",
            )}
          >
            {col.header}
            <SortIcon
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 transition-opacity",
                active
                  ? "text-primary opacity-100"
                  : "opacity-0 group-hover/head:opacity-40 focus-visible:opacity-40",
              )}
            />
          </button>
        ) : (
          <span className="inline-flex h-10 items-center px-2 font-medium">
            {col.header}
          </span>
        )}
      </TableHead>
    );
  }

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((col) => renderHead(col, col.key))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedRows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={columns.length}
              className="h-24 text-center text-muted-foreground"
            >
              {empty}
            </TableCell>
          </TableRow>
        ) : (
          sortedRows.map((row) => (
            <TableRow key={rowKey(row)} className={rowClassName?.(row)}>
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    col.align === "right" && "text-right",
                    col.mono && "font-mono",
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
