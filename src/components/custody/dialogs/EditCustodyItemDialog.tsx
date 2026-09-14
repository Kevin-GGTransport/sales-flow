"use client";

import { updateCustodyItem } from "@/actions/custody";
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
import { Textarea } from "@/components/ui/textarea";

/** 编辑代保管档案（不动数量），受控单例（由 CustodyItemsTable 持有 target 行） */
export function EditCustodyItemDialog({
  initial,
  open,
  onOpenChange,
}: {
  initial: {
    id: string;
    ownerName: string;
    partNumber: string;
    partName: string;
    note: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { pending, error, run } = useActionDialog({ open, onOpenChange });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await run(
      () =>
        updateCustodyItem(initial.id, {
          ownerName: String(fd.get("ownerName") ?? ""),
          partNumber: String(fd.get("partNumber") ?? ""),
          partName: String(fd.get("partName") ?? ""),
          note: String(fd.get("note") ?? ""),
        }),
      "已保存",
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
