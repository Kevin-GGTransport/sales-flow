"use client";

import { addCustodyMovement } from "@/actions/custody";
import { todayISO } from "@/lib/format";
import { DialogFormError, useActionDialog } from "@/lib/use-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** 入库 / 退回，受控单例（由 CustodyItemsTable 持有 target 行） */
export function CustodyMoveDialog({
  custodyItemId,
  ownerName,
  partNumber,
  qty,
  open,
  onOpenChange,
}: {
  custodyItemId: string;
  ownerName: string;
  partNumber: string;
  qty: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pending, error, run } = useActionDialog({ open, onOpenChange });
  const today = todayISO();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qtyIn = Number(String(fd.get("qty") ?? ""));
    await run(
      () =>
        addCustodyMovement({
          custodyItemId,
          qty: qtyIn,
          reason: String(fd.get("reason") ?? ""),
          moveDate: String(fd.get("moveDate") ?? today),
        }),
      qtyIn > 0 ? `已入库 ${qtyIn} 件` : `已退回 ${-qtyIn} 件`,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>入库 / 退回（{partNumber}）</DialogTitle>
          <DialogDescription>
            货主 {ownerName} · 现存 {qty} 件。正数 = 入库存放；负数 = 退回给货主（不能超过现存）。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="cm-qty">数量（退回用负数，如 -3）*</Label>
            <Input id="cm-qty" name="qty" inputMode="numeric" placeholder="如 10 或 -3" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cm-date">日期</Label>
            <Input id="cm-date" name="moveDate" type="date" defaultValue={today} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cm-reason">备注</Label>
            <Input id="cm-reason" name="reason" placeholder="如 三洋送来一批" />
          </div>
          <DialogFormError msg={error} />
          <Button type="submit" disabled={pending}>
            {pending ? "保存中…" : "保存"}
          </Button>
        </form>
        <DialogFooter className="sr-only">
          <Button type="button" variant="outline">取消</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
