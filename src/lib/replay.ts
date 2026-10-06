import { Decimal } from "@/lib/money";
import {
  applyAdjustment,
  applyPurchase,
  applySale,
  type InventoryState,
} from "@/lib/weighted-average";

export type PartKind = "OWNED" | "CONSIGNMENT" | "CUSTODY";

export type ReplayEvent = {
  date: Date;
  createdAt: Date;
  seq: number;
  kind: "IN" | "OUT";
  qty: number;
  price?: Decimal;
  /** 库存调整（寄卖入库/退回、自营盘盈/盘亏）：只动数量不动均价（盘盈成本基础 0） */
  qtyOnly?: boolean;
  /** 事件归属单据（买入/卖出行事件带上；编辑时取时点均价快照用） */
  orderId?: string;
};

/**
 * 事件排序：orderDate → createdAt → seq。
 *
 * 不变量（收集端保证，快照正确性依赖它）：同一 (date, createdAt) 平局组内
 * IN 恒排在 OUT 前——收集器把买入行（IN）的 seq 段整体分配在卖出行（OUT）之前。
 * 由此可证「同一单同一配件的多个 OUT 事件之间不可能夹 IN」：同单行共享
 * date/createdAt，其余单据的事件 createdAt 不同（无法插入平局组），而 applySale
 * 不动均价——所以同一 (order, partId) 的时点均价是单值，编辑回填快照取
 * 首个 OUT 前的 avgCost 即可。
 */
export function sortEvents(events: ReplayEvent[]): ReplayEvent[] {
  return [...events].sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.seq - b.seq,
  );
}

/**
 * 从 {qty:0, avg:0} 起逐笔折叠事件，返回库存终态。
 * onOut：每个 OUT 事件折叠前回调（stateBefore 为该事件发生前的库存态），
 * 编辑单据时用它观察目标单卖出时点的 avgCost。
 *
 * 为什么重放而不是逆向冲销：作废/修改中间一笔买入会改变其后所有进货的
 * reset/blend 分支（负库存时进价直接重置均价），逆向减法在数学上不封闭；
 * 重放永远精确。内部工具数据量下成本可忽略。
 *
 * 注意：不重算其他卖出单已落的 costAtSale（快照原则，有意为之）。
 */
export function foldEvents(
  partKind: PartKind,
  events: ReplayEvent[],
  onOut?: (ev: ReplayEvent, stateBefore: InventoryState) => void,
): InventoryState {
  let state: InventoryState = { qty: 0, avgCost: new Decimal(0) };
  for (const ev of events) {
    if (partKind !== "OWNED") {
      // 寄卖/代保管：只动数量，无成本体系
      state = {
        qty: state.qty + (ev.kind === "IN" ? ev.qty : -ev.qty),
        avgCost: state.avgCost,
      };
    } else if (ev.qtyOnly) {
      // 盘盈/盘亏：只动数量不动均价（adjustment 无 price，不能走 applyPurchase）
      state = applyAdjustment(state, ev.kind === "IN" ? ev.qty : -ev.qty);
    } else if (ev.kind === "IN") {
      state = applyPurchase(state, ev.qty, ev.price!);
    } else {
      onOut?.(ev, state);
      state = applySale(state, ev.qty);
    }
  }
  return state;
}
