"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileText, Undo2 } from "lucide-react";
import { markInvoiced, revokeInvoice } from "@/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export function InvoiceBoard({
  uninvoiced,
  invoiced,
  isAdmin,
}: {
  uninvoiced: UninvoicedOrder[];
  invoiced: InvoicedOrder[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [invoiceDate, setInvoiceDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [pending, startTransition] = useTransition();
  const selectedTotal = useMemo(
    () =>
      uninvoiced
        .filter((o) => selected.has(o.id))
        .reduce((s, o) => s + Number(o.totalAmount), 0),
    [uninvoiced, selected],
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === uninvoiced.length ? new Set() : new Set(uninvoiced.map((o) => o.id)),
    );
  }

  async function handleMarkInvoiced() {
    if (selected.size === 0) {
      toast.error("请先勾选要开票的卖出单");
      return;
    }
    const result = await markInvoiced([...selected], invoiceDate);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`已开票 ${selected.size} 张`);
    setSelected(new Set());
    startTransition(() => router.refresh());
  }

  async function handleRevoke(id: string) {
    const result = await revokeInvoice(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("已撤销开票，该单回到未开票区");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
          <span className="text-sm font-medium">
            未开票 · 有效卖出单（{uninvoiced.length}）
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-40"
            />
            <Button size="sm" onClick={handleMarkInvoiced} disabled={pending}>
              <FileText className="size-4" />
              批量开票（{selected.size} 张 / ${selectedTotal.toFixed(2)}）
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={uninvoiced.length > 0 && selected.size === uninvoiced.length}
                  onChange={toggleAll}
                  aria-label="全选"
                  className="size-4"
                />
              </TableHead>
              <TableHead>单号</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>客户</TableHead>
              <TableHead className="text-right">金额</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {uninvoiced.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                  没有待开票的卖出单
                </TableCell>
              </TableRow>
            ) : (
              uninvoiced.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      aria-label={`选择 ${o.orderNo}`}
                      className="size-4"
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/sales/${o.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {o.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell>{o.orderDate}</TableCell>
                  <TableCell>{o.customerName}</TableCell>
                  <TableCell className="text-right tabular-nums">${o.totalAmount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-sm font-medium">
          已开票（{invoiced.length}）
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>发票号</TableHead>
              <TableHead>开票日期</TableHead>
              <TableHead>单号</TableHead>
              <TableHead>客户</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoiced.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                  还没有已开票的单
                </TableCell>
              </TableRow>
            ) : (
              invoiced.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.invoiceNo}</TableCell>
                  <TableCell>{o.invoiceDate}</TableCell>
                  <TableCell>
                    <Link
                      href={`/sales/${o.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {o.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell>{o.customerName}</TableCell>
                  <TableCell className="text-right tabular-nums">${o.totalAmount}</TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
