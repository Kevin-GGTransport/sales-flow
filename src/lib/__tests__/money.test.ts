import { describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { formatUSD, lineTotalOf, round2, round4 } from "@/lib/money";

const Decimal = Prisma.Decimal;

describe("formatUSD", () => {
  it("两位小数千分位", () => {
    expect(formatUSD("1234.5")).toBe("$1,234.50");
    expect(formatUSD("0")).toBe("$0.00");
    expect(formatUSD("1234567.89")).toBe("$1,234,567.89");
  });

  it("空值显示 -", () => {
    expect(formatUSD(null)).toBe("-");
    expect(formatUSD(undefined)).toBe("-");
  });

  it("接受 Decimal / number / string", () => {
    expect(formatUSD(new Decimal("10.25"))).toBe("$10.25");
    expect(formatUSD(10.25)).toBe("$10.25");
    expect(formatUSD("10.25")).toBe("$10.25");
  });
});

describe("round2 / round4 half-up", () => {
  it("0.125 → 0.13（half-up，非银行家舍入）", () => {
    expect(round2(new Decimal("0.125")).toString()).toBe("0.13");
  });
  it("1.00005 → 1.0001（4 位 half-up）", () => {
    expect(round4(new Decimal("1.00005")).toString()).toBe("1.0001");
  });
});

describe("lineTotalOf", () => {
  it("数量 × 单价 → 两位小数", () => {
    expect(lineTotalOf(3, "10.25").toString()).toBe("30.75");
    expect(lineTotalOf(1, "0.005").toString()).toBe("0.01");
  });
});
