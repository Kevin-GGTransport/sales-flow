import { z } from "zod";

/** 金额输入：非负，最多两位小数（如 10 / 10.5 / 10.25） */
export const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "金额须为非负数字，最多两位小数");

export const partSchema = z.object({
  partNumber: z.string().trim().min(1, "配件号必填").max(64, "配件号过长"),
  name: z.string().trim().min(1, "名称必填").max(200, "名称过长"),
  brand: z.string().trim().max(100, "品牌过长"),
  description: z.string().trim().max(500, "备注过长"),
  kind: z.enum(["OWNED", "CONSIGNMENT", "CUSTODY"]),
  // 安全库存阈值：空值/缺省 → 0（不预警）
  minQty: z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(v)),
    z
      .number()
      .int("安全库存阈值必须为整数")
      .min(0, "安全库存阈值不能为负")
      .max(1_000_000, "安全库存阈值过大"),
  ),
});

export type PartInput = z.infer<typeof partSchema>;

/** 单据日期：yyyy-mm-dd */
export const dateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式 yyyy-mm-dd");

/**
 * 日期统一按 UTC 零点入库（业务日期无时分概念，UTC 避免时区漂移）。
 * 空值 → 今天。
 */
export function dateToUtcMidnight(value: unknown): Date {
  const s = String(value ?? "").trim();
  const m = /^\d{4}-\d{2}-\d{2}$/.exec(s);
  if (!m) {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  return new Date(`${s}T00:00:00.000Z`);
}

/** Date（UTC 零点）→ yyyy-mm-dd（展示/默认值） */
export function formatDateString(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

/** 单据明细行（买入/卖出共用） */
export const orderLineInput = z.object({
  partId: z.string().min(1, "请选择配件"),
  qty: z.coerce.number().int("数量必须为整数").positive("数量必须为正"),
  unitPrice: moneyString,
});

export const purchaseOrderSchema = z.object({
  orderDate: dateString,
  supplierName: z.string().trim().min(1, "供应商必填").max(200, "供应商名过长"),
  note: z.string().trim().max(500, "备注过长"),
  lines: z.array(orderLineInput).min(1, "至少需要一行明细"),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

export const saleOrderSchema = z.object({
  orderDate: dateString,
  customerName: z.string().trim().min(1, "客户必填").max(200, "客户名过长"),
  customerContact: z.string().trim().max(300, "联系方式过长"),
  note: z.string().trim().max(500, "备注过长"),
  lines: z.array(orderLineInput).min(1, "至少需要一行明细"),
});

export type SaleOrderInput = z.infer<typeof saleOrderSchema>;

export const paymentSchema = z.object({
  method: z.enum(["CASH", "CHECK", "ONLINE"]),
  amount: moneyString.refine((v) => Number(v) > 0, "金额必须大于 0"),
  payDate: dateString,
  note: z.string().trim().max(200, "备注过长"),
  saleOrderId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;

export const PAYMENT_METHOD_LABEL: Record<"CASH" | "CHECK" | "ONLINE", string> = {
  CASH: "现金",
  CHECK: "支票",
  ONLINE: "线上",
};

/** 从 FormData 解析单据（表单把明细行 JSON 放在 lines 字段） */
export function parseLinesFromForm(formData: FormData): unknown {
  const raw = String(formData.get("lines") ?? "[]");
  try {
    return JSON.parse(raw);
  } catch {
    return [{ partId: "", qty: 0, unitPrice: "x" }]; // 触发 zod 报错
  }
}
