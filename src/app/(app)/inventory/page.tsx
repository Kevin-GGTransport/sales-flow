import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Decimal, formatUSD } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * 状态判定（全局唯一定义，仪表盘共用）：
 * - 负库存 qty < 0；低库存 minQty > 0 且 0 ≤ qty ≤ minQty；零库存 qty = 0（minQty=0 不算异常）
 * - 异常 = 负库存 ∪ 低库存（互斥，计数可相加）
 */
const FILTERS = [
  { key: "all", label: "全部" },
  { key: "abnormal", label: "异常" },
  { key: "negative", label: "负库存" },
  { key: "low", label: "低库存" },
  { key: "zero", label: "零库存" },
  { key: "consignment", label: "寄卖" },
  { key: "owned", label: "自营" },
] as const;

const SORTS = [
  { key: "value-desc", label: "库存价值 高→低" },
  { key: "value-asc", label: "库存价值 低→高" },
  { key: "qty-desc", label: "库存数量 多→少" },
  { key: "qty-asc", label: "库存数量 少→多" },
  { key: "part", label: "配件号" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];
type SortKey = (typeof SORTS)[number]["key"];

type Row = {
  id: string;
  partNumber: string;
  name: string;
  isConsignment: boolean;
  minQty: number;
  qty: number;
  avg: Decimal | null;
  value: Decimal | null; // 寄卖件 null（排序时排最后，不当 0）
  status: "normal" | "low" | "negative";
};

export default async function InventoryPage({
  searchParams,
}: PageProps<"/inventory">) {
  const sp = await searchParams;
  const keyword = ((sp.q ?? "").toString()).trim();
  const filter = (FILTERS.some((f) => f.key === sp.filter) ? sp.filter : "all") as FilterKey;
  const sort = (SORTS.some((s) => s.key === sp.sort) ? sp.sort : "value-desc") as SortKey;

  const parts = await prisma.part.findMany({
    where: {
      isActive: true,
      ...(keyword
        ? {
            OR: [
              { partNumber: { contains: keyword, mode: "insensitive" } },
              { name: { contains: keyword, mode: "insensitive" } },
              { brand: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { inventory: true },
  });

  const rows: Row[] = parts.map((p) => {
    const qty = p.inventory?.qty ?? 0;
    const avg = p.inventory?.avgCost ?? null;
    const value = p.isConsignment ? null : avg ? avg.mul(qty) : null;
    return {
      id: p.id,
      partNumber: p.partNumber,
      name: p.name,
      isConsignment: p.isConsignment,
      minQty: p.minQty,
      qty,
      avg,
      value,
      status: qty < 0 ? "negative" : p.minQty > 0 && qty <= p.minQty ? "low" : "normal",
    };
  });

  // 汇总基于当前搜索结果（未筛选）全集
  const ownedValue = rows
    .filter((r) => !r.isConsignment)
    .reduce((s, r) => s.add(r.value ?? new Decimal(0)), new Decimal(0))
    .toDecimalPlaces(2);
  const negativeCount = rows.filter((r) => r.qty < 0).length;
  const lowCount = rows.filter((r) => r.qty >= 0 && r.minQty > 0 && r.qty <= r.minQty).length;

  const filtered = rows.filter((r) => {
    switch (filter) {
      case "abnormal":
        return r.status !== "normal";
      case "negative":
        return r.qty < 0;
      case "low":
        return r.status === "low";
      case "zero":
        return r.qty === 0;
      case "consignment":
        return r.isConsignment;
      case "owned":
        return !r.isConsignment;
      default:
        return true;
    }
  });

  const byPart = (a: Row, b: Row) => a.partNumber.localeCompare(b.partNumber);
  const numCmp = (a: number, b: number) => a - b;
  // Decimal 值比较；寄卖件（value=null）恒排数值行之后（不随升降序翻转）
  const valueCmp = (a: Row, b: Row, dir: 1 | -1) => {
    if (!a.value && !b.value) return byPart(a, b);
    if (!a.value) return 1;
    if (!b.value) return -1;
    return a.value.comparedTo(b.value) * dir;
  };
  filtered.sort((a, b) => {
    switch (sort) {
      case "value-asc":
        return valueCmp(a, b, 1);
      case "value-desc":
        return valueCmp(a, b, -1);
      case "qty-desc":
        return numCmp(b.qty, a.qty) || byPart(a, b);
      case "qty-asc":
        return numCmp(a.qty, b.qty) || byPart(a, b);
      default:
        return byPart(a, b);
    }
  });

  const qs = (over: Partial<Record<"filter" | "sort" | "q", string>>) => {
    const params = new URLSearchParams();
    const merged = { filter, sort, ...(keyword ? { q: keyword } : {}), ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all" && !(k === "sort" && v === "value-desc") && !(k === "q" && !v)) {
        params.set(k, v);
      }
    }
    const s = params.toString();
    return s ? `/inventory?${s}` : "/inventory";
  };

  const summary = [
    { label: "自营库存总价值", value: formatUSD(ownedValue), danger: false },
    { label: "配件总数（自营 + 寄卖）", value: String(rows.length), danger: false },
    { label: "负库存配件", value: String(negativeCount), danger: negativeCount > 0 },
    { label: "低库存配件", value: String(lowCount), danger: false },
    {
      label: "异常合计（负 + 低）",
      value: String(negativeCount + lowCount),
      danger: negativeCount + lowCount > 0,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">库存</h1>
        <Button asChild variant="secondary">
          <Link href="/parts">管理配件</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p
                className={
                  s.danger
                    ? "text-xl font-semibold tabular-nums text-destructive"
                    : "text-xl font-semibold tabular-nums"
                }
              >
                {s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={qs({ filter: f.key })}
            className={
              filter === f.key
                ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                : "rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="filter" value={filter} />
        <Input name="q" defaultValue={keyword} placeholder="搜索配件号 / 名称 / 品牌" className="w-72" />
        <select
          name="sort"
          defaultValue={sort}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          搜索
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配件号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead className="text-right">库存</TableHead>
              <TableHead className="text-right">安全库存</TableHead>
              <TableHead className="text-right">平均成本</TableHead>
              <TableHead className="text-right">库存价值</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  {keyword ? "没有匹配的配件" : "还没有库存数据"}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/parts/${r.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {r.partNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>
                    {r.isConsignment ? (
                      <Badge variant="outline">寄卖</Badge>
                    ) : (
                      <Badge variant="secondary">自营</Badge>
                    )}
                  </TableCell>
                  <TableCell
                    className={
                      r.qty < 0
                        ? "text-right font-medium tabular-nums text-destructive"
                        : "text-right tabular-nums"
                    }
                  >
                    {r.qty}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {r.minQty > 0 ? r.minQty : "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.isConsignment ? "-" : formatUSD(r.avg)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.isConsignment ? "-" : formatUSD(r.value)}
                  </TableCell>
                  <TableCell>
                    {r.status === "negative" ? (
                      <Badge variant="destructive">负库存</Badge>
                    ) : r.status === "low" ? (
                      <Badge variant="outline">低库存</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
