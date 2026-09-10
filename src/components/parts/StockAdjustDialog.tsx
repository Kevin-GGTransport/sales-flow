"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownUp } from "lucide-react";
import { addStockAdjustment } from "@/actions/stock-adjustments";
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

/** 寄卖入库 / 退回（仅寄卖件详情页显示） */
export function StockAdjustDialog({
  partId,
  partNumber,
}: {
  partId: string;
  partNumber: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qty = Number(String(fd.get("qty") ?? ""));
    setPending(true);
    const result = await addStockAdjustment({
      partId,
      qty,
      reason: String(fd.get("reason") ?? ""),
      adjDate: String(fd.get("adjDate") ?? today),
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(qty > 0 ? `已寄卖入库 ${qty} 件` : `已退回 ${-qty} 件`);
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowDownUp className="size-4" />
          寄卖入库/退回
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>寄卖入库 / 退回（{partNumber}）</DialogTitle>
          <DialogDescription>
            只记数量不记钱。正数 = 明治的件送来了；负数 = 退回给寄卖方。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="adj-qty">数量（退回用负数，如 -3）*</Label>
            <Input id="adj-qty" name="qty" inputMode="numeric" placeholder="如 10 或 -3" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adj-date">日期</Label>
            <Input id="adj-date" name="adjDate" type="date" defaultValue={today} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adj-reason">备注</Label>
            <Input id="adj-reason" name="reason" placeholder="如 新一批到货" />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "保存中…" : "保存"}
          </Button>
        </form>
        <DialogFooter className="sr-only">
          <Button type="button" variant="outline">
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
