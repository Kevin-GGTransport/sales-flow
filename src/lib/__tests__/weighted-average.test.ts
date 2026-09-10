import { describe, expect, it } from "vitest";
import { applyPurchase, applySale, ZERO_STATE } from "@/lib/weighted-average";
import { Decimal } from "@/lib/money";

const d = (v: string | number) => new Decimal(v);

describe("applyPurchase 加权平均", () => {
  it("正常 blend：10@10 再买 10@20 → 20 件均价 15", () => {
    const next = applyPurchase({ qty: 10, avgCost: d(10) }, 10, d(20));
    expect(next.qty).toBe(20);
    expect(next.avgCost.toNumber()).toBe(15);
  });

  it("库存为负时重置：-5 件再买 10@20 → 5 件均价 20（不是 blend 出的 40）", () => {
    const next = applyPurchase({ qty: -5, avgCost: d(10) }, 10, d(20));
    expect(next.qty).toBe(5);
    expect(next.avgCost.toNumber()).toBe(20);
  });

  it("库存为零时同样重置：0 件再买 10@20 → 10 件均价 20", () => {
    const next = applyPurchase({ qty: 0, avgCost: d(99) }, 10, d(20));
    expect(next.qty).toBe(10);
    expect(next.avgCost.toNumber()).toBe(20);
  });

  it("精度：blend 结果 4 位小数 half-up（1@1.0000 买 2@1.0001 → 1.0001）", () => {
    const next = applyPurchase({ qty: 1, avgCost: d("1.0000") }, 2, d("1.0001"));
    expect(next.qty).toBe(3);
    expect(next.avgCost.toString()).toBe("1.0001");
  });

  it("全新配件（0@0）买入 → 均价=进价", () => {
    const next = applyPurchase(ZERO_STATE(), 5, d("12.5"));
    expect(next.qty).toBe(5);
    expect(next.avgCost.toNumber()).toBe(12.5);
  });

  it("非法输入：非正数量 / 负进价抛错", () => {
    expect(() => applyPurchase(ZERO_STATE(), 0, d(10))).toThrow();
    expect(() => applyPurchase(ZERO_STATE(), -3, d(10))).toThrow();
    expect(() => applyPurchase(ZERO_STATE(), 2.5, d(10))).toThrow();
    expect(() => applyPurchase(ZERO_STATE(), 2, d(-1))).toThrow();
  });
});

describe("applySale 卖出", () => {
  it("正常卖出：20@15 卖 5 → 15 件均价不变", () => {
    const next = applySale({ qty: 20, avgCost: d(15) }, 5);
    expect(next.qty).toBe(15);
    expect(next.avgCost.toNumber()).toBe(15);
  });

  it("穿透负库存：3@10 卖 5 → -2 件，均价仍 10（超出部分按当前均价计成本）", () => {
    const next = applySale({ qty: 3, avgCost: d(10) }, 5);
    expect(next.qty).toBe(-2);
    expect(next.avgCost.toNumber()).toBe(10);
  });

  it("全新配件先卖：0@0 卖 4 → -4，costAtSale=0（先卖后入库记账的已知语义）", () => {
    const next = applySale(ZERO_STATE(), 4);
    expect(next.qty).toBe(-4);
    expect(next.avgCost.toNumber()).toBe(0);
  });

  it("非法输入：非正数量抛错", () => {
    expect(() => applySale(ZERO_STATE(), 0)).toThrow();
    expect(() => applySale(ZERO_STATE(), -1)).toThrow();
  });
});
