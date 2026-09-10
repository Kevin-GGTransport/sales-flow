"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createPurchaseOrder } from "@/actions/purchase-orders";
import type { ActionResult } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
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

  const linesJson = JSON.stringify(
    rows
      .filter((r) => r.partId && Number(r.qty) > 0)
      .map((r) => ({ partId: r.partId, qty: Number(r.qty), unitPrice: r.unitPrice })),
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

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存买入单"}
        </Button>
      </div>
    </form>
  );
}
