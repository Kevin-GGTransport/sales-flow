import { describe, expect, it } from "vitest";
import { partSchema, purchaseOrderSchema, saleOrderSchema } from "@/lib/validation";

const basePart = {
  partNumber: "TEST-001",
  name: "测试配件",
  brand: "",
  description: "",
  minQty: "0",
  suggestedSalePrice: "",
};

describe("partSchema 库存类型", () => {
  it.each(["OWNED", "CONSIGNMENT", "CUSTODY"] as const)(
    "接受 %s",
    (kind) => {
      expect(partSchema.safeParse({ ...basePart, kind }).success).toBe(true);
    },
  );

  it("拒绝未知类型", () => {
    expect(partSchema.safeParse({ ...basePart, kind: "UNKNOWN" }).success).toBe(false);
  });
});

describe("partSchema 建议售价", () => {
  it("允许留空", () => {
    const parsed = partSchema.safeParse({ ...basePart, kind: "OWNED" });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.suggestedSalePrice).toBeNull();
  });

  it("接受最多两位小数并去除首尾空格", () => {
    const parsed = partSchema.safeParse({
      ...basePart,
      kind: "OWNED",
      suggestedSalePrice: " 128.50 ",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.suggestedSalePrice).toBe("128.50");
  });

  it("拒绝三位小数", () => {
    expect(
      partSchema.safeParse({
        ...basePart,
        kind: "OWNED",
        suggestedSalePrice: "128.555",
      }).success,
    ).toBe(false);
  });

  it("接受数据库字段上限并拒绝溢出值", () => {
    expect(
      partSchema.safeParse({
        ...basePart,
        kind: "OWNED",
        suggestedSalePrice: "9999999999.99",
      }).success,
    ).toBe(true);
    expect(
      partSchema.safeParse({
        ...basePart,
        kind: "OWNED",
        suggestedSalePrice: "10000000000",
      }).success,
    ).toBe(false);
  });
});

const baseLine = [{ partId: "part-1", qty: 1, unitPrice: "10.00" }];

describe("订单付款方式", () => {
  it("买入单必须填写付款方式并去除首尾空格", () => {
    const parsed = purchaseOrderSchema.safeParse({
      orderDate: "2026-09-23",
      supplierName: "供应商",
      paymentMethod: "  银行转账  ",
      note: "",
      lines: baseLine,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.paymentMethod).toBe("银行转账");
  });

  it("卖出单拒绝空付款方式", () => {
    expect(
      saleOrderSchema.safeParse({
        orderDate: "2026-09-23",
        customerName: "客户",
        customerContact: "",
        paymentMethod: "   ",
        note: "",
        lines: baseLine,
      }).success,
    ).toBe(false);
  });
});
