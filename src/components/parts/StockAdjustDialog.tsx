"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownUp } from "lucide-react";
import { addStockAdjustment } from "@/actions/stock-adjustments";
import { todayISO } from "@/lib/format";
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

/**
 * 库存调整（配件详情页 / 库存总览行内）：
 * - 寄卖件（STAFF 可见）：寄卖入库 / 退回，只记数量不记钱
 * - 自营件（仅 ADMIN 可见）：盘盈 / 盘亏，成本基础记 0 不改均价
 * compact：表格行内的图标小按钮（短文案），避免撑高行
 */
export function StockAdjustDialog({
  partId,
  partNumber,
  kind,
  compact = false,
}: {
  partId: string;
  partNumber: string;
  kind: "OWNED" | "CONSIGNMENT" | "CUSTODY";
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();
  const today = todayISO();

  const copy = kind === "CONSIGNMENT"
    ? {
        button: compact ? "调整" : "寄卖入库/退回",
        title: `寄卖入库 / 退回（${partNumber}）`,
        description: "只记数量不记钱。正数 = 明治的件送来了；负数 = 退回给寄卖方。",
        qtyLabel: "数量（退回用负数，如 -3）*",
        reasonPlaceholder: "如 新一批到货",
        toast: (qty: number) =>
          qty > 0 ? `已寄卖入库 ${qty} 件` : `已退回 ${-qty} 件`,
      }
    : kind === "CUSTODY"
      ? {
          button: compact ? "增减" : "增加/消耗代保管库存",
          title: `增加 / 消耗库存（${partNumber}）`,
          description: "只记数量不记成本。正数 = 增加库存；负数 = 消耗库存，不能扣成负数。",
          qtyLabel: "数量（消耗用负数，如 -3）*",
          reasonPlaceholder: "如 收到 10 件 / 领用 3 件",
          toast: (qty: number) =>
            qty > 0 ? `已增加 ${qty} 件` : `已消耗 ${-qty} 件`,
        }
      : {
        button: compact ? "盘点" : "库存调整（盘盈/盘亏）",
        title: `盘盈 / 盘亏（${partNumber}）`,
        description:
          "盘点纠偏，仅管理员。正数 = 盘盈（成本基础记 0，不改变平均成本）；负数 = 盘亏。正常进货请用买入单。",
        qtyLabel: "数量（盘亏用负数，如 -2）*",
        reasonPlaceholder: "如 月末盘点差异",
        toast: (qty: number) =>
          qty > 0 ? `已盘盈 ${qty} 件` : `已盘亏 ${-qty} 件`,
        };

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
    toast.success(copy.toast(qty));
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant={compact ? "ghost" : "outline"}
          size={compact ? "icon" : "sm"}
          aria-label={copy.button}
          title={copy.button}
        >
          <ArrowDownUp className="size-4" />
          {!compact && copy.button}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="adj-qty">{copy.qtyLabel}</Label>
            <Input
              id="adj-qty"
              name="qty"
              inputMode="numeric"
              placeholder={kind === "OWNED" ? "如 3 或 -2" : "如 10 或 -3"}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adj-date">日期</Label>
            <Input id="adj-date" name="adjDate" type="date" defaultValue={today} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adj-reason">备注</Label>
            <Input id="adj-reason" name="reason" placeholder={copy.reasonPlaceholder} />
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
