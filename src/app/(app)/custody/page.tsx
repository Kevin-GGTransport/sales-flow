import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateString } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  CustodyItemsTable,
  CustodyFlowTable,
  type CustodyFlowRow,
  type CustodyItemRow,
} from "@/components/custody/CustodyTables";
import { NewCustodyItemDialog } from "@/components/custody/CustodyDialogs";

const FLOW_PAGE_SIZE = 50;

export default async function CustodyPage({
  searchParams,
}: PageProps<"/custody">) {
  const sp = await searchParams;
  const keyword = ((sp.q ?? "").toString()).trim();
  const ownerFilter = ((sp.owner ?? "").toString()).trim();
  const showInactive = sp.showInactive === "1";

  const where = {
    ...(showInactive ? {} : { isActive: true }),
    ...(keyword
      ? {
          OR: [
            { ownerName: { contains: keyword, mode: "insensitive" as const } },
            { partNumber: { contains: keyword, mode: "insensitive" as const } },
            { partName: { contains: keyword, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(ownerFilter ? { ownerName: ownerFilter } : {}),
  };

  const items = await prisma.custodyItem.findMany({
    where,
    orderBy: [{ ownerName: "asc" }, { partNumber: "asc" }],
  });

  const [movements, ownerCounts] = await Promise.all([
    items.length
      ? prisma.custodyMovement.findMany({
          where: { custodyItemId: { in: items.map((i) => i.id) } },
          include: { createdBy: { select: { name: true } } },
          orderBy: [{ moveDate: "desc" }, { createdAt: "desc" }],
          take: FLOW_PAGE_SIZE,
        })
      : Promise.resolve([]),
    prisma.custodyItem.groupBy({
      by: ["ownerName"],
      where: { isActive: true },
      _sum: { qty: true },
      _count: { _all: true },
    }),
  ]);

  // 汇总基于未筛选的在管全集
  const activeTotal = ownerCounts.reduce((s, o) => s + (o._sum.qty ?? 0), 0);
  const activeKinds = ownerCounts.reduce((s, o) => s + o._count._all, 0);
  const summary = [
    { label: "货主数", value: String(ownerCounts.length) },
    { label: "在管品类数", value: String(activeKinds) },
    { label: "在管总件数", value: String(activeTotal) },
  ];

  const qs = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const base: Record<string, string> = {
      ...(keyword ? { q: keyword } : {}),
      ...(ownerFilter ? { owner: ownerFilter } : {}),
      ...(showInactive ? { showInactive: "1" } : {}),
    };
    for (const [k, v] of Object.entries(over)) {
      if (v == null || v === "") delete base[k];
      else base[k] = v;
    }
    for (const [k, v] of Object.entries(base)) params.set(k, v);
    const s = params.toString();
    return s ? `/custody?${s}` : "/custody";
  };

  const itemById = new Map(items.map((i) => [i.id, i]));

  const itemRows: CustodyItemRow[] = items.map((i) => ({
    id: i.id,
    ownerName: i.ownerName,
    partNumber: i.partNumber,
    partName: i.partName,
    qty: i.qty,
    note: i.note,
    isActive: i.isActive,
  }));

  const flowRows: CustodyFlowRow[] = movements.map((m) => {
    const item = itemById.get(m.custodyItemId)!;
    return {
      id: m.id,
      moveDate: formatDateString(m.moveDate),
      label: `${item.ownerName} / ${item.partNumber}`,
      qty: m.qty,
      note: m.reason,
      createdBy: m.createdBy.name,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">代保管</h1>
        <NewCustodyItemDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xl font-semibold tracking-tight">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-2">
        {ownerFilter && <input type="hidden" name="owner" value={ownerFilter} />}
        <Input name="q" defaultValue={keyword} placeholder="搜索货主 / 配件号 / 名称" className="w-72" />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="showInactive"
            value="1"
            defaultChecked={showInactive}
            className="size-4 accent-(--color-primary)"
          />
          显示已停用
        </label>
        <Button type="submit" variant="secondary">
          搜索
        </Button>
      </form>

      {ownerCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={qs({ owner: "" })}
            className={
              !ownerFilter
                ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                : "rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent"
            }
          >
            全部货主
          </Link>
          {ownerCounts
            .slice()
            .sort((a, b) => a.ownerName.localeCompare(b.ownerName))
            .map((o) => (
              <Link
                key={o.ownerName}
                href={qs({ owner: o.ownerName })}
                className={
                  ownerFilter === o.ownerName
                    ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                    : "rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent"
                }
              >
                {o.ownerName}（{o._sum.qty ?? 0}）
              </Link>
            ))}
        </div>
      )}

      <div className="rounded-lg border">
        <CustodyItemsTable
          rows={itemRows}
          empty={
            keyword || ownerFilter ? "没有匹配的代保管货品" : undefined
          }
        />
      </div>

      {items.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b p-3 text-sm font-medium">
            出入流水（当前列表{movements.length === FLOW_PAGE_SIZE ? ` · 仅显示最近 ${FLOW_PAGE_SIZE} 条` : ""}）
          </div>
          <CustodyFlowTable rows={flowRows} />
        </div>
      )}
    </div>
  );
}
