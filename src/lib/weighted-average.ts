import { Decimal, round4 } from "@/lib/money";

export type InventoryState = { qty: number; avgCost: Decimal };

export const ZERO_STATE = (): InventoryState => ({ qty: 0, avgCost: new Decimal(0) });

function assertPositiveInt(qty: number, label: string) {
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new Error(`${label}必须为正整数`);
  }
}

/**
 * 买入对库存的影响（加权平均成本）：
 * - 库存 ≤ 0 时：平均成本直接重置为本次进价（先卖后补的场景，旧均价已无意义，
 *   此时 blend 会得出虚高成本——例如 -5 件后买 10@20，blend 会算出 40）
 * - 库存 > 0 时：加权平均 (qty*avg + inQty*inPrice) / (qty+inQty)，4 位小数 half-up
 */
export function applyPurchase(
  state: InventoryState,
  inQty: number,
  inPrice: Decimal,
): InventoryState {
  assertPositiveInt(inQty, "入库数量");
  if (inPrice.isNegative()) throw new Error("进价不能为负");
  if (state.qty <= 0) {
    return { qty: state.qty + inQty, avgCost: round4(inPrice) };
  }
  const blended = state.avgCost
    .mul(state.qty)
    .add(inPrice.mul(inQty))
    .div(state.qty + inQty);
  return { qty: state.qty + inQty, avgCost: round4(blended) };
}

/**
 * 卖出对库存的影响：只减数量，均价不变（允许穿透为负；
 * 超出库存部分按当前均价计成本——全新配件先卖时 avgCost=0，成本记 0，属已知语义）。
 */
export function applySale(state: InventoryState, outQty: number): InventoryState {
  assertPositiveInt(outQty, "出库数量");
  return { qty: state.qty - outQty, avgCost: state.avgCost };
}

/**
 * 库存调整（盘盈/盘亏）对库存的影响：只动数量，均价不变。
 * 盘盈（+）的成本基础视为 0——不是采购，不进加权平均；
 * 盘亏（−）只核销数量，同卖出但不产生收入/成本行。
 */
export function applyAdjustment(
  state: InventoryState,
  signedQty: number,
): InventoryState {
  if (!Number.isInteger(signedQty) || signedQty === 0) {
    throw new Error("调整数量必须为非零整数");
  }
  return { qty: state.qty + signedQty, avgCost: state.avgCost };
}
