"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Pencil } from "lucide-react";
import { toggleCustodyItem } from "@/actions/custody";
import { useActionRun } from "@/lib/use-action";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import { CustodyMoveDialog } from "@/components/custody/dialogs/CustodyMoveDialog";
import { EditCustodyItemDialog } from "@/components/custody/dialogs/EditCustodyItemDialog";
import { Button } from "@/components/ui/button";

export type CustodyItemRow = {
  id: string;
  ownerName: string;
  partNumber: string;
  partName: string;
  qty: number;
  note: string | null;
  isActive: boolean;
};

export type CustodyFlowRow = {
  id: string;
  moveDate: string;
  label: string;
  qty: number;
  note: string | null;
  createdBy: string;
};

function itemColumns(
  onMove: (row: CustodyItemRow) => void,
  onEdit: (row: CustodyItemRow) => void,
  onToggle: (row: CustodyItemRow) => void,
  togglePending: boolean,
): DataTableColumn<CustodyItemRow>[] {
  return [
    {
      key: "owner",
      header: "货主",
      sortValue: (r) => r.ownerName,
      cell: (r) => (
        <>
          <span className="font-medium">{r.ownerName}</span>
          {!r.isActive && (
            <span className="ml-2 text-xs text-muted-foreground">已停用</span>
          )}
        </>
      ),
    },
    { key: "partNumber", header: "配件号", mono: true, sortValue: (r) => r.partNumber, cell: (r) => r.partNumber },
    { key: "partName", header: "名称", sortValue: (r) => r.partName, cell: (r) => r.partName },
    { key: "qty", header: "现存数量", align: "right", mono: true, sortValue: (r) => r.qty, cell: (r) => r.qty },
    {
      key: "note",
      header: "备注",
      className: "max-w-48 truncate text-muted-foreground",
      cell: (r) => r.note ?? "-",
    },
    {
      key: "actions",
      header: "操作",
      align: "right",
      className: "w-0",
      cell: (r) => (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onMove(r)}>
            <ArrowDownUp className="size-4" /> 入库/退回
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(r)}>
            <Pencil className="size-4" /> 编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={togglePending}
            onClick={() => onToggle(r)}
          >
            {r.isActive ? "停用" : "启用"}
          </Button>
        </div>
      ),
    },
  ];
}

/**
 * 代保管条目清单：操作列只渲染轻按钮，入库/退回与编辑各挂一个单例弹窗
 * （key=id 换行重置表单），停用/启用为整表共享的直接动作。
 */
export function CustodyItemsTable({
  rows,
  empty,
}: {
  rows: CustodyItemRow[];
  empty?: React.ReactNode;
}) {
  const [moveTarget, setMoveTarget] = useState<CustodyItemRow | null>(null);
  const [editTarget, setEditTarget] = useState<CustodyItemRow | null>(null);
  const { pending: togglePending, run } = useActionRun();

  const columns = useMemo(
    () =>
      itemColumns(
        setMoveTarget,
        setEditTarget,
        (r) => {
          void run(
            () => toggleCustodyItem(r.id, !r.isActive),
            r.isActive ? "已停用" : "已启用",
          );
        },
        togglePending,
      ),
    [run, togglePending],
  );

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        empty={empty ?? "还没有代保管货品，点右上角「登记代保管」"}
        rowClassName={(r) => (r.isActive ? "" : "text-muted-foreground")}
      />
      {moveTarget && (
        <CustodyMoveDialog
          key={moveTarget.id}
          custodyItemId={moveTarget.id}
          ownerName={moveTarget.ownerName}
          partNumber={moveTarget.partNumber}
          qty={moveTarget.qty}
          open
          onOpenChange={(o) => !o && setMoveTarget(null)}
        />
      )}
      {editTarget && (
        <EditCustodyItemDialog
          key={editTarget.id}
          initial={{
            id: editTarget.id,
            ownerName: editTarget.ownerName,
            partNumber: editTarget.partNumber,
            partName: editTarget.partName,
            note: editTarget.note ?? "",
          }}
          open
          onOpenChange={(o) => !o && setEditTarget(null)}
        />
      )}
    </>
  );
}

// 列定义不闭包任何 props，模块级保持引用稳定（DataTable 的 useMemo 依赖它）
const flowColumns: DataTableColumn<CustodyFlowRow>[] = [
  { key: "moveDate", header: "日期", sortValue: (r) => r.moveDate, cell: (r) => r.moveDate },
  { key: "label", header: "货主 / 配件", card: "title", sortValue: (r) => r.label, cell: (r) => r.label },
  {
    key: "qty",
    header: "数量变动",
    align: "right",
    mono: true,
    sortValue: (r) => r.qty,
    cell: (r) => (
      <span className={r.qty > 0 ? "text-primary" : "text-muted-foreground"}>
        {r.qty > 0 ? `+${r.qty}` : r.qty}
      </span>
    ),
  },
  { key: "note", header: "备注", className: "text-muted-foreground", cell: (r) => r.note ?? "-" },
  { key: "by", header: "经手人", sortValue: (r) => r.createdBy, cell: (r) => <span className="text-muted-foreground">{r.createdBy}</span> },
];

export function CustodyFlowTable({ rows }: { rows: CustodyFlowRow[] }) {
  return (
    <DataTable
      columns={flowColumns}
      rows={rows}
      rowKey={(r) => r.id}
      empty="还没有出入记录"
    />
  );
}
