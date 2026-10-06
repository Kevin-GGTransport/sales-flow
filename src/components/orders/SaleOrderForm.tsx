"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createSaleOrder, updateSaleOrder } from "@/actions/sale-orders";
import { todayISO } from "@/lib/format";
import { DEFAULT_SALES_TAX_RATE } from "@/lib/validation";
import type { ActionResult } from "@/actions/parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PartOption } from "@/components/parts/PartPicker";
import { PaymentMethodInput } from "@/components/orders/PaymentMethodInput";
import {
  OrderLineEditor,
  newRow,
  type OrderLine,
} from "@/components/orders/OrderLineEditor";

/** 表单预填数据：复制重开与编辑共用（orderId 存在即编辑模式） */
export type SaleOrderInitial = {
  orderId?: string;
  /** 编辑时预填原单日期；复制重开不传（保持「今天重录」语义） */
  orderDate?: string;
  customerName: string;
  customerContact: string;
  customerAddress: string;
  paymentMethod: string;
  note: string;
  taxRate: string;
  lines: { partId: string; qty: number; unitPrice: string }[];
};

export function SaleOrderForm({
  parts,
  initial,
  paymentMethodHistory,
  onSaved,
}: {
  parts: PartOption[];
  initial?: SaleOrderInitial;
  paymentMethodHistory: string[];
  /** 弹窗模式：保存成功后回调（关弹窗等），不传则跳转详情页 */
  onSaved?: (result: { id?: string; orderNo?: string }) => void;
}) {
  const isEdit = Boolean(initial?.orderId);
  const today = todayISO();
  const [rows, setRows] = useState<OrderLine[]>(() =>
    initial?.lines.length
      ? initial.lines.map((l) => ({
          ...newRow(),
          partId: l.partId,
          qty: String(l.qty),
          unitPrice: l.unitPrice,
        }))
      : [newRow()],
  );
  // 复制重开忠实带出原单税率（历史单为 0）；新建默认 10.75%
  const [taxRate, setTaxRate] = useState(
    initial ? initial.taxRate : DEFAULT_SALES_TAX_RATE,
  );

  const router = useRouter();
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    isEdit ? updateSaleOrder : createSaleOrder,
    null,
  );

  useEffect(() => {
    if (!state) return;
    if (!state.ok) {
      toast.error(state.error);
      return;
    }
    if (onSaved) {
      onSaved(state);
      return;
    }
    router.push(state.id ? `/sales/${state.id}` : "/orders?tab=sales");
  }, [state, onSaved, router]);

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
      {isEdit && <input type="hidden" name="orderId" value={initial?.orderId} />}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="orderDate">日期 *</Label>
          <Input
            id="orderDate"
            name="orderDate"
            type="date"
            defaultValue={initial?.orderDate ?? today}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customerName">客户 *</Label>
          <Input
            id="customerName"
            name="customerName"
            defaultValue={initial?.customerName}
            placeholder="卖给谁"
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customerContact">客户联系方式</Label>
          <Input
            id="customerContact"
            name="customerContact"
            defaultValue={initial?.customerContact}
            placeholder="电话 / 邮箱（开发票时用）"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="customerAddress">客户地址</Label>
          <Input
            id="customerAddress"
            name="customerAddress"
            defaultValue={initial?.customerAddress}
            placeholder="客户地址（开发票时用）"
          />
        </div>
        <PaymentMethodInput
          id="salePaymentMethod"
          defaultValue={initial?.paymentMethod}
          history={paymentMethodHistory}
        />
      </div>

      <div className="grid gap-2">
        <OrderLineEditor
          parts={parts}
          value={rows}
          onChange={setRows}
          allowConsignment
          useSuggestedSalePrice
          taxRate={taxRate}
          onTaxRateChange={setTaxRate}
        />
        <input type="hidden" name="lines" value={linesJson} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="note">备注</Label>
        <Textarea id="note" name="note" rows={2} defaultValue={initial?.note} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "保存中…" : isEdit ? "保存修改" : "保存卖出单"}
        </Button>
      </div>
    </form>
  );
}
