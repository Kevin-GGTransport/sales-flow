"use client";

import { Plus } from "lucide-react";
import { addPayment } from "@/actions/payments";
import { todayISO } from "@/lib/format";
import { DialogFormError, useActionDialog } from "@/lib/use-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

/**
 * 记一笔收/付款。详情页头部单实例使用（自带触发按钮自管理开关）；
 * 销账列表行内由持有方控制开关（传 open/onOpenChange，用 key=orderId 重挂载重置表单）。
 */
export function AddPaymentDialog({
  kind,
  orderId,
  defaultAmount,
  open,
  onOpenChange,
  onDone,
}: {
  kind: "sale" | "purchase";
  orderId: string;
  defaultAmount: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDone?: () => void;
}) {
  const dialog = useActionDialog(
    open !== undefined && onOpenChange !== undefined
      ? { open, onOpenChange }
      : undefined,
  );
  const today = todayISO();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const ok = await dialog.run(
      () =>
        addPayment({
          saleOrderId: kind === "sale" ? orderId : undefined,
          purchaseOrderId: kind === "purchase" ? orderId : undefined,
          method: (fd.get("method") as "CASH" | "CHECK" | "ONLINE") ?? "CASH",
          amount: String(fd.get("amount") ?? ""),
          payDate: String(fd.get("payDate") ?? today),
          note: String(fd.get("note") ?? ""),
        }),
      kind === "sale" ? "已记收款" : "已记付款",
    );
    if (ok) onDone?.();
  }

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
      {open === undefined && (
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" type="button">
            <Plus className="size-4" />
            {kind === "sale" ? "记收款" : "记付款"}
          </Button>
        </DialogTrigger>
      )}
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
          <DialogFormError msg={dialog.error} />
          <Button type="submit" disabled={dialog.pending}>
            {dialog.pending ? "保存中…" : "保存"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
