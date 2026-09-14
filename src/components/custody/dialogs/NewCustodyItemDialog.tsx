"use client";

import { Plus } from "lucide-react";
import { createCustodyItem } from "@/actions/custody";
import { DialogFormError, useActionDialog } from "@/lib/use-action";
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

/** 新建代保管条目（货主 + 配件登记），代保管页头部入口 */
export function NewCustodyItemDialog() {
  const { open, setOpen, pending, error, run } = useActionDialog();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(() =>
      createCustodyItem({
        ownerName: String(fd.get("ownerName") ?? ""),
        partNumber: String(fd.get("partNumber") ?? ""),
        partName: String(fd.get("partName") ?? ""),
        note: String(fd.get("note") ?? ""),
      }),
      "代保管条目已登记",
    );
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
          <DialogFormError msg={error} />
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
