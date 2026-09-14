/**
 * 客户端安全的格式化工具。红线：本文件不得 import Prisma / Decimal——
 * lib/money.ts 顶部依赖 Prisma generated client，把它拖进浏览器会毁掉 bundle。
 * 服务端金额格式化继续用 lib/money.ts 的 formatUSD（Decimal 全链路），
 * 本文件的 formatUSDNumber 只服务于客户端组件里已序列化的 number。
 */

/** 今天的 UTC 日期串（业务日期一律 UTC 零点，口径同 lib/validation.ts） */
export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** 客户端 number 金额展示（千分位 + 固定 2 位小数）；null/undefined 显示 - */
export function formatUSDNumber(n: number | null | undefined): string {
  return n == null ? "-" : usdFormatter.format(n);
}
