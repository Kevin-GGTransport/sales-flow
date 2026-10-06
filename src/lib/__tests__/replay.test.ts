import { describe, expect, it } from "vitest";
import { Decimal } from "@/lib/money";
import { foldEvents, sortEvents, type ReplayEvent } from "@/lib/replay";

const d = (day: string) => new Date(`${day}T00:00:00.000Z`);
const dec = (s: string) => new Decimal(s);

function ev(
  overrides: Partial<ReplayEvent> & {
    seq: number;
    kind: "IN" | "OUT";
    qty: number;
  },
): ReplayEvent {
  return {
    date: d("2026-01-10"),
    createdAt: d("2026-01-10"),
    ...overrides,
  };
}

/** 复刻 recomputeWithOrderSnapshot 的快照观察：目标单首个 OUT 前的 avgCost */
function snapshotOf(events: ReplayEvent[], orderId: string): string | null {
  let snap: string | null = null;
  foldEvents("OWNED", sortEvents(events), (e, before) => {
    if (e.orderId === orderId && snap === null) snap = before.avgCost.toString();
  });
  return snap;
}

describe("重放事件排序不变量", () => {
  it("同 (date, createdAt) 平局组内 IN 恒在 OUT 前（收集序 seq 保证）", () => {
    const tie = d("2026-01-05");
    const events = sortEvents([
      ev({ seq: 5, kind: "OUT", qty: 3, orderId: "SO-1", date: tie, createdAt: tie }),
      ev({ seq: 0, kind: "IN", qty: 10, price: dec("10"), date: tie, createdAt: tie }),
    ]);
    expect(events[0].kind).toBe("IN");
    const state = foldEvents("OWNED", events);
    expect(state.qty).toBe(7);
    expect(state.avgCost.toNumber()).toBe(10);
  });
});

describe("foldEvents 时点均价快照", () => {
  it("同单同配件多行：时点均价一致", () => {
    const snap = snapshotOf(
      [
        ev({
          seq: 0,
          kind: "IN",
          qty: 10,
          price: dec("10"),
          date: d("2026-01-01"),
          createdAt: d("2026-01-01"),
        }),
        ev({ seq: 5, kind: "OUT", qty: 2, orderId: "SO-1", date: d("2026-01-05"), createdAt: d("2026-01-05") }),
        ev({ seq: 6, kind: "OUT", qty: 3, orderId: "SO-1", date: d("2026-01-05"), createdAt: d("2026-01-05") }),
      ],
      "SO-1",
    );
    expect(snap).toBe("10");
  });

  it("卖出时点均价随日期位置变化：进货前 0 / 两笔进货之间 10 / 之后 blend 15", () => {
    const purchases = [
      ev({
        seq: 0,
        kind: "IN",
        qty: 10,
        price: dec("10"),
        date: d("2026-01-01"),
        createdAt: d("2026-01-01"),
      }),
      ev({
        seq: 1,
        kind: "IN",
        qty: 10,
        price: dec("20"),
        date: d("2026-01-10"),
        createdAt: d("2026-01-10"),
      }),
    ];
    const outAt = (day: string) =>
      snapshotOf(
        [
          ...purchases,
          ev({ seq: 9, kind: "OUT", qty: 1, orderId: "SO-1", date: d(day), createdAt: d(day) }),
        ],
        "SO-1",
      );
    expect(outAt("2025-12-31")).toBe("0");
    expect(outAt("2026-01-05")).toBe("10");
    expect(outAt("2026-01-15")).toBe("15");
  });
});

describe("foldEvents 回归", () => {
  it("负库存后进货 reset 均价", () => {
    const state = foldEvents(
      "OWNED",
      sortEvents([
        ev({ seq: 1, kind: "OUT", qty: 5, date: d("2026-01-02"), createdAt: d("2026-01-02") }),
        ev({
          seq: 0,
          kind: "IN",
          qty: 10,
          price: dec("20"),
          date: d("2026-01-03"),
          createdAt: d("2026-01-03"),
        }),
      ]),
    );
    expect(state.qty).toBe(5);
    expect(state.avgCost.toNumber()).toBe(20);
  });

  it("寄卖件只动数量，均价恒 0", () => {
    const state = foldEvents("CONSIGNMENT", [
      ev({ seq: 0, kind: "IN", qty: 5 }),
      ev({ seq: 1, kind: "OUT", qty: 2 }),
    ]);
    expect(state.qty).toBe(3);
    expect(state.avgCost.toNumber()).toBe(0);
  });
});
