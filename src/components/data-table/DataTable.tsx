"use client";

import { Fragment, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/lib/use-desktop";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  compareValues,
  nextSortState,
  type SortDir,
  type SortState,
  type SortValue,
} from "./sort";

export type DataTableCardRole =
  | "title"
  | "badge"
  | "amount"
  | "meta"
  | "actions"
  | "hide";

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
  /**
   * 笔记本模式（视口 ≤1440px）卡片里的角色，缺省推断：
   * key === "actions" → actions；align==="right" 且 mono → amount；
   * 第一个无角色列 → title；其余 → meta。hide 在卡片中跳过。
   * 注意：卡片渲染器不使用 className（那是表格布局调参，如 w-0 会压塌卡片）。
   */
  card?: DataTableCardRole;
};

/** Radix Select 不接受空字符串 value，用哨兵代表「默认顺序」 */
const NO_SORT = "__none__";

/** 每列解析卡片角色：显式标注优先（含显式 title），其余按推断规则补齐 */
function resolveCardRoles<T>(
  columns: DataTableColumn<T>[],
): Map<string, DataTableCardRole> {
  const roles = new Map<string, DataTableCardRole>();
  // 已有人显式指名 title 时，前面的列不再按「第一个无角色列」抢标题位
  let titleTaken = columns.some((c) => c.card === "title");
  for (const col of columns) {
    if (col.card) {
      roles.set(col.key, col.card);
    } else if (col.key === "actions") {
      roles.set(col.key, "actions");
    } else if (col.align === "right" && col.mono) {
      roles.set(col.key, "amount");
    } else if (!titleTaken) {
      roles.set(col.key, "title");
      titleTaken = true;
    } else {
      roles.set(col.key, "meta");
    }
  }
  return roles;
}

/** 卡片模式的列分组：整个卡片列表只算一次（替代每行 5 次 filter/find） */
type CardColumnGroups<T> = {
  titleCol: DataTableColumn<T> | undefined;
  badgeCols: DataTableColumn<T>[];
  metaCols: DataTableColumn<T>[];
  amountCols: DataTableColumn<T>[];
  actionsCol: DataTableColumn<T> | undefined;
};

function partitionCardColumns<T>(
  columns: DataTableColumn<T>[],
  roles: Map<string, DataTableCardRole>,
): CardColumnGroups<T> {
  return {
    titleCol: columns.find((c) => roles.get(c.key) === "title"),
    badgeCols: columns.filter((c) => roles.get(c.key) === "badge"),
    metaCols: columns.filter((c) => roles.get(c.key) === "meta"),
    amountCols: columns.filter((c) => roles.get(c.key) === "amount"),
    actionsCol: columns.find((c) => roles.get(c.key) === "actions"),
  };
}

/** 卡片模式顶部的细栏：左侧 cardToolbar（如全选），右侧排序下拉（与表头共享同一状态） */
function CardSortBar<T>({
  columns,
  sort,
  onSortChange,
  toolbar,
}: {
  columns: DataTableColumn<T>[];
  sort: SortState;
  onSortChange: (next: SortState) => void;
  toolbar?: React.ReactNode;
}) {
  const sortableCols = columns.filter((c) => c.sortValue);
  if (sortableCols.length === 0 && !toolbar) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
      {toolbar}
      {sortableCols.length > 0 && (
        <div className="ms-auto flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">排序</span>
          <Select
            value={sort?.key ?? NO_SORT}
            onValueChange={(v) =>
              onSortChange(
                v === NO_SORT ? null : { key: v, dir: sort?.dir ?? "asc" },
              )
            }
          >
            <SelectTrigger size="sm" className="w-28" aria-label="排序字段">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_SORT}>默认</SelectItem>
              {sortableCols.map((c) => (
                <SelectItem key={c.key} value={c.key}>
                  {c.header}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort?.dir ?? "asc"}
            disabled={!sort}
            onValueChange={(d) =>
              onSortChange(sort ? { ...sort, dir: d as SortDir } : null)
            }
          >
            <SelectTrigger size="sm" className="w-20" aria-label="排序方向">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">升序</SelectItem>
              <SelectItem value="desc">降序</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

/** 单行卡片：标题行（title + badge 角标）→ 「表头: 值」网格 → 双线上的金额行 → 操作脚注 */
function RowCard<T>({
  row,
  groups,
  className,
}: {
  row: T;
  groups: CardColumnGroups<T>;
  className?: string;
}) {
  const { titleCol, badgeCols, metaCols, amountCols, actionsCol } = groups;

  return (
    <Card size="sm" className={className}>
      {(titleCol || badgeCols.length > 0) && (
        <CardHeader>
          {titleCol && (
            <CardTitle
              className={cn(
                "min-w-0 truncate",
                titleCol.mono && "font-mono text-[13px]",
              )}
            >
              {titleCol.cell(row)}
            </CardTitle>
          )}
          {badgeCols.length > 0 && (
            <CardAction className="flex flex-wrap items-center justify-end gap-1.5">
              {badgeCols.map((c) => (
                <Fragment key={c.key}>{c.cell(row)}</Fragment>
              ))}
            </CardAction>
          )}
        </CardHeader>
      )}
      {(metaCols.length > 0 || amountCols.length > 0) && (
        <CardContent>
          {metaCols.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {metaCols.map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{c.header}</dt>
                  <dd className="truncate text-sm">{c.cell(row)}</dd>
                </div>
              ))}
            </dl>
          )}
          {amountCols.length > 0 && (
            <div
              className={cn(
                "flex flex-wrap items-baseline justify-end gap-x-5 gap-y-1 border-t-[3px] border-double border-border pt-2",
                metaCols.length > 0 && "mt-3",
              )}
            >
              {amountCols.map((c) => (
                <span key={c.key} className="flex items-baseline gap-1.5">
                  <span className="text-xs text-muted-foreground">
                    {c.header}
                  </span>
                  <span className="font-mono text-sm tabular-nums">
                    {c.cell(row)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      )}
      {actionsCol && (
        <CardFooter className="justify-end">{actionsCol.cell(row)}</CardFooter>
      )}
    </Card>
  );
}

/** 桌面表格视图（≥1441px） */
function TableView<T>({
  columns,
  sortedRows,
  sort,
  onSortChange,
  empty,
  rowClassName,
  className,
  rowKey,
}: {
  columns: DataTableColumn<T>[];
  sortedRows: T[];
  sort: SortState;
  onSortChange: (next: SortState) => void;
  empty: React.ReactNode;
  rowClassName?: (row: T) => string;
  className?: string;
  rowKey: (row: T) => string;
}) {
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
            onClick={() => onSortChange(nextSortState(sort, key))}
            className={cn(
              "inline-flex h-10 w-full items-center gap-1 px-2 text-left font-medium whitespace-nowrap rounded-sm outline-none transition-colors",
              "hover:bg-foreground/10 hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring",
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

/** 笔记本模式卡片视图（≤1440px） */
function CardListView<T>({
  columns,
  sortedRows,
  roles,
  sort,
  onSortChange,
  toolbar,
  empty,
  rowClassName,
  rowKey,
}: {
  columns: DataTableColumn<T>[];
  sortedRows: T[];
  roles: Map<string, DataTableCardRole>;
  sort: SortState;
  onSortChange: (next: SortState) => void;
  toolbar?: React.ReactNode;
  empty: React.ReactNode;
  rowClassName?: (row: T) => string;
  rowKey: (row: T) => string;
}) {
  const groups = useMemo(
    () => partitionCardColumns(columns, roles),
    [columns, roles],
  );

  return (
    <>
      <CardSortBar
        columns={columns}
        sort={sort}
        onSortChange={onSortChange}
        toolbar={toolbar}
      />
      {sortedRows.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      ) : (
        <div className="grid gap-3 p-3">
          {sortedRows.map((row) => (
            <RowCard
              key={rowKey(row)}
              row={row}
              groups={groups}
              className={rowClassName?.(row)}
            />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * 列表页公共表格：声明式列配置 + 点列头排序（客户端排序，不动 URL）。
 * 页面侧约定：Server Component 取数并序列化（金额给显示字符串 + 排序数值），
 * 传给本组件的行必须是可序列化的纯数据。
 *
 * 响应式：≥1441px 渲染表格（点列头三态排序）；≤1440px（笔记本模式）渲染
 * 单列卡片 + 排序下拉，卡片布局由列的 card 角色标注/推断生成。两副渲染
 * 共享同一排序状态，由 useIsDesktop 条件渲染切换（单棵树挂载）；SSR 先出
 * 表格侧，hydration 后按实际视口同步切换，无闪烁。
 *
 * 注意：columns 含 cell/sortValue 闭包，消费组件必须保持引用稳定
 * （模块级常量或 useMemo），否则下方 useMemo 会退化为每次重算。
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  initialSort = null,
  empty = "暂无数据",
  rowClassName,
  className,
  cardToolbar,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  initialSort?: SortState;
  empty?: React.ReactNode;
  rowClassName?: (row: T) => string;
  className?: string;
  /** 仅卡片模式渲染在排序栏左侧（如开票页「全选」） */
  cardToolbar?: React.ReactNode;
}) {
  const [sort, setSort] = useState<SortState>(initialSort);
  const cardRoles = useMemo(() => resolveCardRoles(columns), [columns]);

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

  const isDesktop = useIsDesktop();

  return isDesktop ? (
    <TableView
      columns={columns}
      sortedRows={sortedRows}
      sort={sort}
      onSortChange={setSort}
      empty={empty}
      rowClassName={rowClassName}
      className={className}
      rowKey={rowKey}
    />
  ) : (
    <CardListView
      columns={columns}
      sortedRows={sortedRows}
      roles={cardRoles}
      sort={sort}
      onSortChange={setSort}
      toolbar={cardToolbar}
      empty={empty}
      rowClassName={rowClassName}
      rowKey={rowKey}
    />
  );
}
