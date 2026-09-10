export type OrderNoKind = "PO" | "SO" | "INV";

/** 生成单号：PO-20260910-001（日期取 UTC；序号 3 位补零） */
export function orderNoOf(kind: OrderNoKind, date: Date, seq: number): string {
  const ymd = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `${kind}-${ymd}-${String(seq).padStart(3, "0")}`;
}

export interface OrderNoDeps {
  /** 当天（按 UTC 日期）已有单据数 */
  countSameDay: () => Promise<number>;
  /** 该单号是否已被占用（unique 约束之外的应用层避让） */
  isTaken: (orderNo: string) => Promise<boolean>;
}

/**
 * 分配下一个单号：count+1 起步，若被占用（作废单仍占号）则递增避让。
 * 实际使用时在数据库事务内调用，注入 tx 的查询。
 */
export async function nextOrderNo(
  kind: OrderNoKind,
  date: Date,
  deps: OrderNoDeps,
): Promise<string> {
  let seq = (await deps.countSameDay()) + 1;
  let candidate = orderNoOf(kind, date, seq);
  while (await deps.isTaken(candidate)) {
    seq += 1;
    candidate = orderNoOf(kind, date, seq);
  }
  return candidate;
}
