import { z } from "zod";

/** 金额输入：非负，最多两位小数（如 10 / 10.5 / 10.25） */
export const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "金额须为非负数字，最多两位小数");

/** 复选框：FormData 的 "on"/"true" → true，缺省 → false */
export const checkbox = z.preprocess(
  (v) => v === "on" || v === "true" || v === true,
  z.boolean(),
);

export const partSchema = z.object({
  partNumber: z.string().trim().min(1, "配件号必填").max(64, "配件号过长"),
  name: z.string().trim().min(1, "名称必填").max(200, "名称过长"),
  brand: z.string().trim().max(100, "品牌过长"),
  description: z.string().trim().max(500, "备注过长"),
  isConsignment: checkbox,
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
