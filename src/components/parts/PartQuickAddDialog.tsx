"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createPart } from "@/actions/parts";
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
import { PartOption } from "@/components/parts/PartPicker";

/** 录单时 inline 快速新建配件，成功后回填到行 */
export function PartQuickAddDialog({
  onCreated,
  showConsignmentSwitch,
}: {
  onCreated: (part: PartOption) => void;
  showConsignmentSwitch: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setPending(true);
    const result = await createPart(null, formData);
    setPending(false);
    if (!result.ok || !result.id) {
      toast.error(result.ok ? "创建失败" : result.error);
      return;
    }
    onCreated({
      id: result.id,
      partNumber: String(formData.get("partNumber") ?? ""),
      name: String(formData.get("name") ?? ""),
      brand: String(formData.get("brand") ?? "") || null,
      kind: String(formData.get("kind") ?? "OWNED") as "OWNED" | "CONSIGNMENT",
      qty: 0,
    });
    setOpen(false);
    toast.success("配件已创建");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" type="button">
          <Plus className="size-4" />
          快速新建配件
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>快速新建配件</DialogTitle>
          <DialogDescription>只填基础信息，保存后自动选入当前行。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="qa-partNumber">配件号 *</Label>
            <Input id="qa-partNumber" name="partNumber" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qa-name">名称 *</Label>
            <Input id="qa-name" name="name" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qa-brand">品牌</Label>
            <Input id="qa-brand" name="brand" />
          </div>
          {showConsignmentSwitch && (
            <div className="grid gap-2">
              <Label htmlFor="qa-kind">库存类型</Label>
              <select
                id="qa-kind"
                name="kind"
                defaultValue="OWNED"
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="OWNED">自营</option>
                <option value="CONSIGNMENT">寄卖（不算成本利润）</option>
              </select>
            </div>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "创建中…" : "创建"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
