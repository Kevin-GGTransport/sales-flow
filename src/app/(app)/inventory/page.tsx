import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Decimal, formatUSD } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ListFilterForm } from "@/components/ui/list-filter-form";
import { StatCard } from "@/components/ui/stat-card";
import { InventoryTable, type InventoryRow } from "@/components/inventory/InventoryTable";

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

type FilterKey = (typeof FILTERS)[number]["key"];

export default async function InventoryPage({
  searchParams,
}: PageProps<"/inventory">) {
  const sp = await searchParams;
  const keyword = ((sp.q ?? "").toString()).trim();
  const filter = (FILTERS.some((f) => f.key === sp.filter) ? sp.filter : "all") as FilterKey;

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

  const rows: InventoryRow[] = parts.map((p) => {
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
      avgText: p.isConsignment ? "-" : formatUSD(avg),
      avg: p.isConsignment ? null : avg ? avg.toNumber() : null,
      valueText: p.isConsignment ? "-" : formatUSD(value),
      value: value ? value.toNumber() : null,
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

  const qs = (over: Partial<Record<"filter" | "q", string>>) => {
    const params = new URLSearchParams();
    const merged = { filter, ...(keyword ? { q: keyword } : {}), ...over };
    for (const [k, v] of Object.entries(merged)) {
      if (v && v !== "all") {
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
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            tone={s.danger ? "destructive" : "default"}
          />
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

      <ListFilterForm hidden={{ filter }} submitLabel="搜索">
        <Input name="q" defaultValue={keyword} placeholder="搜索配件号 / 名称 / 品牌" className="w-72" />
      </ListFilterForm>

      <div className="rounded-lg border">
        <InventoryTable
          rows={filtered}
          empty={keyword ? "没有匹配的配件" : undefined}
        />
      </div>
    </div>
  );
}
