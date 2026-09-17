import { describe, expect, it } from "vitest";
import { partSchema } from "@/lib/validation";

const basePart = {
  partNumber: "TEST-001",
  name: "测试配件",
  brand: "",
  description: "",
  minQty: "0",
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
