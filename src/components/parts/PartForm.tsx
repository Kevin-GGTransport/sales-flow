"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPart, updatePart, type ActionResult } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type PartFormValues = {
  id?: string;
  partNumber: string;
  name: string;
  brand: string;
  description: string;
  isConsignment: boolean;
  minQty?: number;
};

export function PartForm({ initial }: { initial?: PartFormValues }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    async (prev, formData) =>
      isEdit ? updatePart(initial!.id!, prev, formData) : createPart(prev, formData),
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(isEdit ? "已保存" : "配件已创建");
      if (!isEdit && state.id) router.push(`/parts/${state.id}`);
      else router.refresh();
    } else {
      toast.error(state.error);
    }
  }, [state, isEdit, router]);

  return (
    <form action={formAction} className="grid max-w-xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="partNumber">配件号 *</Label>
        <Input
          id="partNumber"
          name="partNumber"
          defaultValue={initial?.partNumber}
          placeholder="如 BR-1234"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">名称 *</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial?.name}
          placeholder="如 刹车片 前轮"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="brand">品牌</Label>
        <Input
          id="brand"
          name="brand"
          defaultValue={initial?.brand}
          placeholder="如 明治 / Bosch"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">规格 / 适配车型备注</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initial?.description}
          rows={3}
        />
      </div>
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <Switch
          id="isConsignment"
          name="isConsignment"
          defaultChecked={initial?.isConsignment}
        />
        <div className="grid gap-0.5">
          <Label htmlFor="isConsignment">寄卖件</Label>
          <p className="text-xs text-muted-foreground">
            寄卖件（如明治品牌）不进成本/利润体系：入库走「寄卖入库/退回」，卖出只消库存
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="minQty">安全库存阈值</Label>
        <Input
          id="minQty"
          name="minQty"
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          defaultValue={initial?.minQty ?? 0}
        />
        <p className="text-xs text-muted-foreground">
          库存数量 ≤ 该值时预警（库存页 / 汇总）；0 = 不预警。寄卖件也可设置
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : isEdit ? "保存" : "创建配件"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          返回
        </Button>
      </div>
    </form>
  );
}
