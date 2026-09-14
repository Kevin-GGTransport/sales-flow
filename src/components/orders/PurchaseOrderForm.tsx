"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createPurchaseOrder } from "@/actions/purchase-orders";
import { todayISO } from "@/lib/format";
import type { ActionResult } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { PartOption } from "@/components/parts/PartPicker";
import {
  OrderLineEditor,
  newRow,
  type OrderLine,
} from "@/components/orders/OrderLineEditor";

export type CopyFromData = {
  supplierName: string;
  note: string;
  lines: { partId: string; qty: number; unitPrice: string }[];
};

export function PurchaseOrderForm({
  parts,
  copyFrom,
}: {
  parts: PartOption[];
  copyFrom?: CopyFromData;
}) {
  const today = todayISO();
  const [rows, setRows] = useState<OrderLine[]>(() =>
    copyFrom?.lines.length
      ? copyFrom.lines.map((l) => ({
          ...newRow(),
          partId: l.partId,
          qty: String(l.qty),
          unitPrice: l.unitPrice,
        }))
      : [newRow()],
  );

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createPurchaseOrder,
    null,
  );

  useEffect(() => {
    if (state && !state.ok) toast.error(state.error);
  }, [state]);

  // 只有行数据变化才重算序列化（键入供应商名等字段不再触发）
  const linesJson = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((r) => r.partId && Number(r.qty) > 0)
          .map((r) => ({ partId: r.partId, qty: Number(r.qty), unitPrice: r.unitPrice })),
      ),
    [rows],
  );

  return (
    <form action={formAction} className="grid max-w-4xl gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="orderDate">日期 *</Label>
          <Input id="orderDate" name="orderDate" type="date" defaultValue={today} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="supplierName">供应商 *</Label>
          <Input
            id="supplierName"
            name="supplierName"
            defaultValue={copyFrom?.supplierName}
            placeholder="从谁买"
            required
          />
        </div>
      </div>

      <div className="grid gap-2">
        <OrderLineEditor parts={parts} value={rows} onChange={setRows} />
        <input type="hidden" name="lines" value={linesJson} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="note">备注</Label>
        <Textarea id="note" name="note" rows={2} defaultValue={copyFrom?.note} />
      </div>

      <div className="grid gap-2 rounded-lg border p-3 md:max-w-md">
        <Label>当场付款（可选）</Label>
        <div className="grid grid-cols-2 gap-2">
          <Select name="payNowMethod" defaultValue="NONE">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">暂不付款</SelectItem>
              <SelectItem value="CASH">现金付清</SelectItem>
              <SelectItem value="CHECK">支票付清</SelectItem>
              <SelectItem value="ONLINE">线上付清</SelectItem>
            </SelectContent>
          </Select>
          <Input
            name="payNowAmount"
            inputMode="decimal"
            placeholder="金额，默认全额"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          买的时候当场给钱的选这里，建单同时记一笔付款；留空金额 = 按全额记。
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存买入单"}
        </Button>
      </div>
    </form>
  );
}
