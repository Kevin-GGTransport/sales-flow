"use client";

import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";
import {
  CustodyMoveDialog,
  EditCustodyItemDialog,
  ToggleCustodyItemButton,
} from "@/components/custody/CustodyDialogs";

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

export function CustodyItemsTable({
  rows,
  empty,
}: {
  rows: CustodyItemRow[];
  empty?: React.ReactNode;
}) {
  const columns: DataTableColumn<CustodyItemRow>[] = [
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
          <CustodyMoveDialog
            custodyItemId={r.id}
            ownerName={r.ownerName}
            partNumber={r.partNumber}
            qty={r.qty}
          />
          <EditCustodyItemDialog
            initial={{
              id: r.id,
              ownerName: r.ownerName,
              partNumber: r.partNumber,
              partName: r.partName,
              note: r.note ?? "",
            }}
          />
          <ToggleCustodyItemButton
            custodyItemId={r.id}
            isActive={r.isActive}
            label={r.isActive ? "停用" : "启用"}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      empty={empty ?? "还没有代保管货品，点右上角「登记代保管」"}
      rowClassName={(r) => (r.isActive ? "" : "opacity-50")}
    />
  );
}

export function CustodyFlowTable({ rows }: { rows: CustodyFlowRow[] }) {
  const columns: DataTableColumn<CustodyFlowRow>[] = [
    { key: "moveDate", header: "日期", sortValue: (r) => r.moveDate, cell: (r) => r.moveDate },
    { key: "label", header: "货主 / 配件", sortValue: (r) => r.label, cell: (r) => r.label },
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

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      empty="还没有出入记录"
    />
  );
}
