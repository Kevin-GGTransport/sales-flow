"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { createSaleOrder } from "@/actions/sale-orders";
import { todayISO } from "@/lib/format";
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
  customerName: string;
  customerContact: string;
  note: string;
  lines: { partId: string; qty: number; unitPrice: string }[];
};

export function SaleOrderForm({
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
    createSaleOrder,
    null,
  );

  useEffect(() => {
    if (state && !state.ok) toast.error(state.error);
  }, [state]);

  // 只有行数据变化才重算序列化（键入客户名等字段不再触发）
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
          <Label htmlFor="customerName">客户 *</Label>
          <Input
            id="customerName"
            name="customerName"
            defaultValue={copyFrom?.customerName}
            placeholder="卖给谁"
            required
          />
        </div>
        <div className="grid gap-2 md:col-span-2">
          <Label htmlFor="customerContact">客户联系方式</Label>
          <Input
            id="customerContact"
            name="customerContact"
            defaultValue={copyFrom?.customerContact}
            placeholder="电话 / 邮箱 / 地址（开发票时用）"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <OrderLineEditor
          parts={parts}
          value={rows}
          onChange={setRows}
          allowConsignment
        />
        <input type="hidden" name="lines" value={linesJson} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="note">备注</Label>
        <Textarea id="note" name="note" rows={2} defaultValue={copyFrom?.note} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : "保存卖出单"}
        </Button>
      </div>
    </form>
  );
}
