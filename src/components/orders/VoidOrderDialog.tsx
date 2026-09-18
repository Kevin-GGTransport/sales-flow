"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function VoidOrderDialog({
  kind,
  orderId,
  disabled,
  disabledReason,
}: {
  kind: "purchase" | "sale";
  orderId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function handleVoid() {
    if (!reason.trim()) {
      toast.error("请填写作废原因");
      return;
    }
    const { voidPurchaseOrder } = await import("@/actions/purchase-orders");
    const { voidSaleOrder } = await import("@/actions/sale-orders");
    setPending(true);
    const result =
      kind === "purchase"
        ? await voidPurchaseOrder(orderId, reason)
        : await voidSaleOrder(orderId, reason);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("已作废");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={disabled}>
          <Ban className="size-4" />
          作废
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>作废单据</DialogTitle>
          <DialogDescription>
            {disabled && disabledReason
              ? disabledReason
              : "作废后留痕不可恢复，库存将按剩余有效单据重算。录错了？保存后用「复制重开」快速重录一张。"}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label htmlFor="void-reason">作废原因 *</Label>
          <Textarea
            id="void-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="如：数量录错"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button variant="destructive" onClick={handleVoid} disabled={pending}>
            {pending ? "处理中…" : "确认作废"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
