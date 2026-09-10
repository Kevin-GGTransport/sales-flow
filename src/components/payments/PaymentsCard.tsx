"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HandCoins, Plus, Trash2 } from "lucide-react";
import { addPayment, deletePayment } from "@/actions/payments";
import { PAYMENT_METHOD_LABEL } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PaymentRow = {
  id: string;
  method: "CASH" | "CHECK" | "ONLINE";
  amount: string;
  payDate: string;
  note: string | null;
  by: string;
};

function AddPaymentDialog({
  kind,
  orderId,
  defaultAmount,
  onDone,
}: {
  kind: "sale" | "purchase";
  orderId: string;
  defaultAmount: string;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    const result = await addPayment({
      saleOrderId: kind === "sale" ? orderId : undefined,
      purchaseOrderId: kind === "purchase" ? orderId : undefined,
      method: (fd.get("method") as "CASH" | "CHECK" | "ONLINE") ?? "CASH",
      amount: String(fd.get("amount") ?? ""),
      payDate: String(fd.get("payDate") ?? today),
      note: String(fd.get("note") ?? ""),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(kind === "sale" ? "已记收款" : "已记付款");
    setOpen(false);
    router.refresh();
    onDone?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" type="button">
          <Plus className="size-4" />
          {kind === "sale" ? "记收款" : "记付款"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{kind === "sale" ? "记一笔收款" : "记一笔付款"}</DialogTitle>
          <DialogDescription>金额不能超过未结余额。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label>方式</Label>
            <Select name="method" defaultValue="CASH">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">现金</SelectItem>
                <SelectItem value="CHECK">支票</SelectItem>
                <SelectItem value="ONLINE">线上</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pay-amount">金额($) *</Label>
            <Input
              id="pay-amount"
              name="amount"
              inputMode="decimal"
              defaultValue={defaultAmount}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pay-date">日期</Label>
            <Input id="pay-date" name="payDate" type="date" defaultValue={today} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="pay-note">备注</Label>
            <Input id="pay-note" name="note" placeholder="如支票号" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "保存中…" : "保存"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** 单据详情页的收付款区块 */
export function PaymentsCard({
  kind,
  orderId,
  totalAmount,
  payments,
  isAdmin,
}: {
  kind: "sale" | "purchase";
  orderId: string;
  totalAmount: string;
  payments: PaymentRow[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Math.max(Number(totalAmount) - paid, 0);
  const settled = Number(totalAmount) - paid <= 0.004;

  async function handleDelete(id: string) {
    const result = await deletePayment(id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("已删除");
    startTransition(() => router.refresh());
  }

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <HandCoins className="size-4" />
          {kind === "sale" ? "收款记录" : "付款记录"}
          {settled ? (
            <Badge>已结清</Badge>
          ) : (
            <Badge variant="destructive">
              未结 ${outstanding.toFixed(2)}
            </Badge>
          )}
        </div>
        {!settled && (
          <AddPaymentDialog
            kind={kind}
            orderId={orderId}
            defaultAmount={outstanding.toFixed(2)}
          />
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日期</TableHead>
            <TableHead>方式</TableHead>
            <TableHead className="text-right">金额</TableHead>
            <TableHead>备注</TableHead>
            <TableHead>经办</TableHead>
            {isAdmin && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin ? 6 : 5} className="h-16 text-center text-muted-foreground">
                还没有{kind === "sale" ? "收款" : "付款"}记录
              </TableCell>
            </TableRow>
          ) : (
            payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.payDate}</TableCell>
                <TableCell>{PAYMENT_METHOD_LABEL[p.method]}</TableCell>
                <TableCell className="text-right tabular-nums">${p.amount}</TableCell>
                <TableCell>{p.note ?? "-"}</TableCell>
                <TableCell>{p.by}</TableCell>
                {isAdmin && (
                  <TableCell className="w-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      aria-label="删除该笔记录"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export { AddPaymentDialog };
