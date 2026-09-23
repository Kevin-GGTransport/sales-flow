"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { formatUSDNumber } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PartOption,
  PartPicker,
} from "@/components/parts/PartPicker";
import { PartQuickAddDialog } from "@/components/parts/PartQuickAddDialog";

export type OrderLine = {
  key: string;
  partId: string;
  qty: string;
  unitPrice: string;
};

let rowKeySeed = 0;
export const newRow = (): OrderLine => ({
  key: `row-${++rowKeySeed}-${Date.now()}`,
  partId: "",
  qty: "",
  unitPrice: "",
});

export function OrderLineEditor({
  parts: initialParts,
  value,
  onChange,
  allowConsignment = false,
  useSuggestedSalePrice = false,
}: {
  parts: PartOption[];
  value: OrderLine[];
  onChange: (rows: OrderLine[]) => void;
  /** 卖出单允许寄卖件；买入单禁选 */
  allowConsignment?: boolean;
  /** 卖出单选中 SKU 时自动带入建议售价；买入单不启用 */
  useSuggestedSalePrice?: boolean;
}) {
  const [parts, setParts] = useState(initialParts);
  // 行级配件查找 O(1)：替代每行每渲染的 parts.find（O(行×配件)）
  const partById = useMemo(
    () => new Map(parts.map((p) => [p.id, p])),
    [parts],
  );

  const money = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const total = useMemo(
    () => value.reduce((sum, r) => sum + money(r.qty) * money(r.unitPrice), 0),
    [value],
  );

  function update(key: string, patch: Partial<OrderLine>) {
    onChange(value.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_80px_110px_110px_40px] items-center gap-2 text-xs text-muted-foreground">
        <span>配件</span>
        <span>数量</span>
        <span>单价($)</span>
        <span className="text-right">小计</span>
        <span />
      </div>

      {value.map((row) => {
        const part = partById.get(row.partId);
        const subtotal = money(row.qty) * money(row.unitPrice);
        return (
          <div
            key={row.key}
            className="grid grid-cols-[1fr_80px_110px_110px_40px] items-center gap-2"
          >
            <div className="min-w-0 space-y-1">
              <PartPicker
                parts={parts}
                value={row.partId}
                onChange={(partId) => {
                  const selected = partById.get(partId);
                  update(row.key, {
                    partId,
                    ...(useSuggestedSalePrice
                      ? { unitPrice: selected?.suggestedSalePrice ?? "" }
                      : {}),
                  });
                }}
                allowConsignment={allowConsignment}
              />
              {part?.kind === "CONSIGNMENT" && allowConsignment && (
                <Badge variant="outline">寄卖 · 卖出只消库存</Badge>
              )}
            </div>
            <Input
              inputMode="numeric"
              value={row.qty}
              onChange={(e) =>
                update(row.key, { qty: e.target.value.replace(/[^\d]/g, "") })
              }
              placeholder="0"
              className="text-right"
            />
            <Input
              inputMode="decimal"
              value={row.unitPrice}
              onChange={(e) =>
                update(row.key, {
                  unitPrice: e.target.value.replace(/[^\d.]/g, ""),
                })
              }
              placeholder="0.00"
              className="text-right"
            />
            <span className="text-right text-sm tabular-nums">
              {formatUSDNumber(subtotal || null)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(value.filter((r) => r.key !== row.key))}
              aria-label="删除该行"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        );
      })}

      <div className="flex items-center justify-between pt-1">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...value, newRow()])}
          >
            <Plus className="size-4" />
            加一行
          </Button>
          <PartQuickAddDialog
            showConsignmentSwitch={allowConsignment}
            onCreated={(part) => {
              setParts((prev) =>
                prev.some((p) => p.id === part.id) ? prev : [...prev, part],
              );
              const firstEmpty = value.find((r) => !r.partId);
              if (firstEmpty) {
                update(firstEmpty.key, {
                  partId: part.id,
                  ...(useSuggestedSalePrice
                    ? { unitPrice: part.suggestedSalePrice ?? "" }
                    : {}),
                });
              }
            }}
          />
        </div>
        <p className="text-sm font-medium tabular-nums">
          合计：<span className="text-base">{formatUSDNumber(total)}</span>
        </p>
      </div>
    </div>
  );
}
