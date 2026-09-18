"use client";

import { memo, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, FileText, Undo2 } from "lucide-react";
import { markInvoiced, revokeInvoice } from "@/actions/invoices";
import { formatUSDNumber, todayISO } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablePanel } from "@/components/ui/table-panel";
import { DataTable, type DataTableColumn } from "@/components/data-table/DataTable";

export type UninvoicedOrder = {
  id: string;
  orderNo: string;
  orderDate: string;
  customerName: string;
  totalAmount: string;
};

export type InvoicedOrder = {
  id: string;
  orderNo: string;
  invoiceNo: string;
  invoiceDate: string;
  customerName: string;
  totalAmount: string;
};

/**
 * 开票操作区：日期输入自持状态——每敲一位只重渲本区，
 * 不触碰下方两张表。批量开票成功后 onComplete 清空勾选并刷新。
 */
function InvoiceActions({
  selectedIds,
  selectedTotal,
  onComplete,
}: {
  selectedIds: string[];
  selectedTotal: number;
  onComplete: () => void;
}) {
  const [invoiceDate, setInvoiceDate] = useState(todayISO);
  const [marking, setMarking] = useState(false);

  async function handleSubmit() {
    if (selectedIds.length === 0) {
      toast.error("请先勾选要开票的卖出单");
      return;
    }
    setMarking(true);
    const result = await markInvoiced(selectedIds, invoiceDate);
    setMarking(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`已开票 ${selectedIds.length} 张`);
    onComplete();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="date"
        value={invoiceDate}
        onChange={(e) => setInvoiceDate(e.target.value)}
        className="w-40"
      />
      <Button size="sm" onClick={handleSubmit} disabled={marking}>
        <FileText className="size-4" />
        批量开票（{selectedIds.length} 张 / {formatUSDNumber(selectedTotal)}）
      </Button>
    </div>
  );
}

/** 未开票区：勾选状态自持，只在勾选变化时重渲本区（已开票区零感知） */
function UninvoicedPanel({ uninvoiced }: { uninvoiced: UninvoicedOrder[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedTotal = useMemo(
    () => uninvoiced.reduce(
      (total, order) => selected.has(order.id)
        ? total + Number(order.totalAmount)
        : total,
      0,
    ),
    [uninvoiced, selected],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === uninvoiced.length ? new Set() : new Set(uninvoiced.map((o) => o.id)),
    );
  }, [uninvoiced]);

  // 表头勾选框（表格模式）与卡片模式「全选」共用
  const allChecked = uninvoiced.length > 0 && selected.size === uninvoiced.length;

  const columns = useMemo<DataTableColumn<UninvoicedOrder>[]>(
    () => [
      {
        key: "check",
        header: (
          <input
            type="checkbox"
            checked={allChecked}
            onChange={toggleAll}
            aria-label="全选"
            className="size-4"
          />
        ),
        className: "w-10",
        card: "badge",
        cell: (o) => (
          <input
            type="checkbox"
            checked={selected.has(o.id)}
            onChange={() => toggle(o.id)}
            aria-label={`选择 ${o.orderNo}`}
            className="size-4"
          />
        ),
      },
      {
        key: "orderNo",
        header: "单号",
        mono: true,
        sortValue: (o) => o.orderNo,
        cell: (o) => (
          <Link
            href={`/sales/${o.id}`}
            className="text-[13px] font-medium underline-offset-4 hover:underline"
          >
            {o.orderNo}
          </Link>
        ),
      },
      { key: "orderDate", header: "日期", sortValue: (o) => o.orderDate, cell: (o) => o.orderDate },
      { key: "customer", header: "客户", sortValue: (o) => o.customerName, cell: (o) => o.customerName },
      {
        key: "amount",
        header: "金额",
        align: "right",
        mono: true,
        sortValue: (o) => Number(o.totalAmount),
        cell: (o) => formatUSDNumber(Number(o.totalAmount)),
      },
    ],
    [selected, allChecked, toggle, toggleAll],
  );

  return (
    <TablePanel
      title={`未开票 · 有效卖出单（${uninvoiced.length}）`}
      actions={
        <InvoiceActions
          selectedIds={[...selected]}
          selectedTotal={selectedTotal}
          onComplete={() => setSelected(new Set())}
        />
      }
    >
      <DataTable
        columns={columns}
        rows={uninvoiced}
        rowKey={(o) => o.id}
        empty="没有待开票的卖出单"
        cardToolbar={
          <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={toggleAll}
              aria-label="全选"
              className="size-4"
            />
            全选
          </label>
        }
      />
    </TablePanel>
  );
}

/** 已开票区：memo 隔离，未开票区的勾选/输入与它互不触发重渲 */
const InvoicedPanel = memo(function InvoicedPanel({
  invoiced,
  isAdmin,
}: {
  invoiced: InvoicedOrder[];
  isAdmin: boolean;
}) {
  const [pending, setPending] = useState(false);

  const handleRevoke = useCallback(
    async (id: string) => {
      setPending(true);
      const result = await revokeInvoice(id);
      setPending(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("已撤销开票，该单回到未开票区");
    },
    [],
  );

  const columns = useMemo<DataTableColumn<InvoicedOrder>[]>(
    () => [
      { key: "invoiceNo", header: "发票号", mono: true, sortValue: (o) => o.invoiceNo, cell: (o) => <span className="font-medium">{o.invoiceNo}</span> },
      { key: "invoiceDate", header: "开票日期", sortValue: (o) => o.invoiceDate, cell: (o) => o.invoiceDate },
      {
        key: "orderNo",
        header: "单号",
        mono: true,
        sortValue: (o) => o.orderNo,
        cell: (o) => (
          <Link
            href={`/sales/${o.id}`}
            className="text-[13px] underline-offset-4 hover:underline"
          >
            {o.orderNo}
          </Link>
        ),
      },
      { key: "customer", header: "客户", sortValue: (o) => o.customerName, cell: (o) => o.customerName },
      {
        key: "amount",
        header: "金额",
        align: "right",
        mono: true,
        sortValue: (o) => Number(o.totalAmount),
        cell: (o) => formatUSDNumber(Number(o.totalAmount)),
      },
      {
        key: "actions",
        header: "操作",
        className: "w-0",
        cell: (o) => (
          <div className="flex gap-1">
            <Button asChild variant="ghost" size="sm">
              <a href={`/api/invoices/${o.id}/pdf`} target="_blank" rel="noreferrer">
                <Download className="size-4" />
                PDF
              </a>
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRevoke(o.id)}
                disabled={pending}
              >
                <Undo2 className="size-4" />
                撤销
              </Button>
            )}
          </div>
        ),
      },
    ],
    [isAdmin, pending, handleRevoke],
  );

  return (
    <TablePanel title={`已开票（${invoiced.length}）`}>
      <DataTable
        columns={columns}
        rows={invoiced}
        rowKey={(o) => o.id}
        empty="还没有已开票的单"
      />
    </TablePanel>
  );
});

export function InvoiceBoard({
  uninvoiced,
  invoiced,
  isAdmin,
}: {
  uninvoiced: UninvoicedOrder[];
  invoiced: InvoicedOrder[];
  isAdmin: boolean;
}) {
  return (
    <div className="space-y-4">
      <UninvoicedPanel uninvoiced={uninvoiced} />
      <InvoicedPanel invoiced={invoiced} isAdmin={isAdmin} />
    </div>
  );
}
