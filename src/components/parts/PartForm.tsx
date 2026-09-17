"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createPart, updatePart, type ActionResult } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PartKindValue } from "@/components/parts/PartKindBadge";

export type PartFormValues = {
  id?: string;
  partNumber: string;
  name: string;
  brand: string;
  description: string;
  kind: PartKindValue;
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
      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">库存类型 *</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: "OWNED", label: "自营", hint: "正常买入、卖出和成本" },
            { value: "CONSIGNMENT", label: "寄卖", hint: "可卖出，不计库存成本" },
            { value: "CUSTODY", label: "代保管", hint: "可增加或消耗库存，不可买卖" },
          ].map((option) => (
            <label
              key={option.value}
              className="has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer gap-2 rounded-lg border p-3 transition-colors"
            >
              <input
                type="radio"
                name="kind"
                value={option.value}
                defaultChecked={(initial?.kind ?? "OWNED") === option.value}
                className="mt-0.5 accent-primary"
              />
              <span className="grid gap-0.5">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
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
          库存数量 ≤ 该值时预警（库存页 / 汇总）；0 = 不预警
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
