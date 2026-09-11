export type SortDir = "asc" | "desc";

export type SortValue = string | number | null;

export type SortState = { key: string; dir: SortDir } | null;

/** null 恒排最后（不随升降序翻转）——沿用库存页寄卖件的既有约定 */
export function compareValues(a: SortValue, b: SortValue): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  // numeric: true 让 "SO-20260911-2" 排在 "SO-20260911-10" 前面
  return String(a).localeCompare(String(b), "zh-Hans-CN", { numeric: true });
}

/** 点击同一列：无 → 升 → 降 → 无（第三次点击回到服务端原始顺序） */
export function nextSortState(current: SortState, key: string): SortState {
  if (!current || current.key !== key) return { key, dir: "asc" };
  if (current.dir === "asc") return { key, dir: "desc" };
  return null;
}
