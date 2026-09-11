import { describe, expect, it } from "vitest";
import { compareValues, nextSortState } from "./sort";

describe("compareValues", () => {
  it("数值比较", () => {
    expect(compareValues(1, 2)).toBeLessThan(0);
    expect(compareValues(2, 1)).toBeGreaterThan(0);
    expect(compareValues(1.5, 1.5)).toBe(0);
  });

  it("字符串按数值感知比较（单号流水）", () => {
    expect(compareValues("SO-20260911-2", "SO-20260911-10")).toBeLessThan(0);
    expect(compareValues("PO-20260911-9", "PO-20260911-10")).toBeLessThan(0);
  });

  it("ISO 日期字符串按时间先后比较", () => {
    expect(compareValues("2026-09-01", "2026-09-10")).toBeLessThan(0);
  });

  it("null 恒排最后：正序反序都不动", () => {
    expect(compareValues(null, 5)).toBeGreaterThan(0);
    expect(compareValues(5, null)).toBeLessThan(0);
    expect(compareValues(null, null)).toBe(0);
    expect(compareValues(null, "abc")).toBeGreaterThan(0);
  });

  it("null 与 0 是两回事", () => {
    expect(compareValues(0, null)).toBeLessThan(0);
  });
});

describe("nextSortState", () => {
  it("无 → 升 → 降 → 无", () => {
    expect(nextSortState(null, "qty")).toEqual({ key: "qty", dir: "asc" });
    expect(nextSortState({ key: "qty", dir: "asc" }, "qty")).toEqual({
      key: "qty",
      dir: "desc",
    });
    expect(nextSortState({ key: "qty", dir: "desc" }, "qty")).toBeNull();
  });

  it("换列从升序重新开始", () => {
    expect(nextSortState({ key: "qty", dir: "desc" }, "amount")).toEqual({
      key: "amount",
      dir: "asc",
    });
  });
});
