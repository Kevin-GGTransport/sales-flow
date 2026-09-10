import { describe, expect, it } from "vitest";
import { nextOrderNo, orderNoOf } from "@/lib/order-no";

const date = new Date("2026-09-10T00:00:00.000Z");

describe("orderNoOf", () => {
  it("格式：PO-20260910-001", () => {
    expect(orderNoOf("PO", date, 1)).toBe("PO-20260910-001");
    expect(orderNoOf("SO", date, 42)).toBe("SO-20260910-042");
    expect(orderNoOf("INV", date, 1234)).toBe("INV-20260910-1234");
  });
});

describe("nextOrderNo", () => {
  it("当天无单据 → 序号 1", async () => {
    const no = await nextOrderNo("PO", date, {
      countSameDay: async () => 0,
      isTaken: async () => false,
    });
    expect(no).toBe("PO-20260910-001");
  });

  it("当天已有 2 张 → 序号 3", async () => {
    const no = await nextOrderNo("SO", date, {
      countSameDay: async () => 2,
      isTaken: async () => false,
    });
    expect(no).toBe("SO-20260910-003");
  });

  it("候选号被占用（作废单仍占号）→ 递增避让", async () => {
    const taken = new Set(["PO-20260910-003", "PO-20260910-004"]);
    const no = await nextOrderNo("PO", date, {
      countSameDay: async () => 2,
      isTaken: async (candidate) => taken.has(candidate),
    });
    expect(no).toBe("PO-20260910-005");
  });
});
