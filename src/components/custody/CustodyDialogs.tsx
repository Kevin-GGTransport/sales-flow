"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDownUp, Pencil, Plus } from "lucide-react";
import {
  addCustodyMovement,
  createCustodyItem,
  toggleCustodyItem,
  updateCustodyItem,
} from "@/actions/custody";
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
import { Textarea } from "@/components/ui/textarea";

function Err({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}

/** 新建代保管条目（货主 + 配件登记） */
export function NewCustodyItemDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const result = await createCustodyItem({
      ownerName: String(fd.get("ownerName") ?? ""),
      partNumber: String(fd.get("partNumber") ?? ""),
      partName: String(fd.get("partName") ?? ""),
      note: String(fd.get("note") ?? ""),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("代保管条目已登记");
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4" /> 登记代保管
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>登记代保管货品</DialogTitle>
          <DialogDescription>
            别家存放在我们仓库的货：只记数量与归属，不进库存价值，也不能卖出。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="cu-owner">货主（哪家）*</Label>
            <Input id="cu-owner" name="ownerName" placeholder="如 三洋运输" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-part">配件号 *</Label>
            <Input id="cu-part" name="partNumber" placeholder="如 TY-3300" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-name">名称 *</Label>
            <Input id="cu-name" name="partName" placeholder="如 轮胎 225/65R17" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cu-note">备注</Label>
            <Textarea id="cu-note" name="note" rows={2} />
          </div>
          <Err msg={error} />
          <Button type="submit" disabled={pending}>
            {pending ? "保存中…" : "登记"}
          </Button>
        </form>
        <DialogFooter className="sr-only">
          <Button type="button" variant="outline">取消</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** 入库 / 退回 */
export function CustodyMoveDialog({
  custodyItemId,
  ownerName,
  partNumber,
  qty,
}: {
  custodyItemId: string;
  ownerName: string;
  partNumber: string;
  qty: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const qtyIn = Number(String(fd.get("qty") ?? ""));
    setPending(true);
    setError(null);
    const result = await addCustodyMovement({
      custodyItemId,
      qty: qtyIn,
      reason: String(fd.get("reason") ?? ""),
      moveDate: String(fd.get("moveDate") ?? today),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success(qtyIn > 0 ? `已入库 ${qtyIn} 件` : `已退回 ${-qtyIn} 件`);
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ArrowDownUp className="size-4" /> 入库/退回
        </Button>
      </DialogTrigger>
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
          <Err msg={error} />
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

/** 停用 / 启用（有存量的条目先退清才能停用，action 层校验） */
export function ToggleCustodyItemButton({
  custodyItemId,
  isActive,
  label,
}: {
  custodyItemId: string;
  isActive: boolean;
  label: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [, startTransition] = useTransition();

  async function handleToggle() {
    setPending(true);
    const result = await toggleCustodyItem(custodyItemId, !isActive);
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(isActive ? "已停用" : "已启用");
    startTransition(() => router.refresh());
  }

  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={handleToggle}>
      {label}
    </Button>
  );
}

/** 编辑代保管档案（不动数量） */
export function EditCustodyItemDialog({
  initial,
}: {
  initial: {
    id: string;
    ownerName: string;
    partNumber: string;
    partName: string;
    note: string;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    const result = await updateCustodyItem(initial.id, {
      ownerName: String(fd.get("ownerName") ?? ""),
      partNumber: String(fd.get("partNumber") ?? ""),
      partName: String(fd.get("partName") ?? ""),
      note: String(fd.get("note") ?? ""),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    toast.success("已保存");
    setOpen(false);
    startTransition(() => router.refresh());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="size-4" /> 编辑
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑代保管档案</DialogTitle>
          <DialogDescription>修改登记信息；出入流水不受影响。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="eu-owner">货主（哪家）*</Label>
            <Input id="eu-owner" name="ownerName" defaultValue={initial.ownerName} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eu-part">配件号 *</Label>
            <Input id="eu-part" name="partNumber" defaultValue={initial.partNumber} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eu-name">名称 *</Label>
            <Input id="eu-name" name="partName" defaultValue={initial.partName} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="eu-note">备注</Label>
            <Textarea id="eu-note" name="note" rows={2} defaultValue={initial.note} />
          </div>
          <Err msg={error} />
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
