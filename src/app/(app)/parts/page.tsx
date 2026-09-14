import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ListFilterForm,
  ShowInactiveCheckbox,
} from "@/components/ui/list-filter-form";
import { PartsTable, type PartRow } from "@/components/parts/PartsTable";

export default async function PartsPage({
  searchParams,
}: PageProps<"/parts">) {
  const { q, showInactive } = await searchParams;
  const keyword = (q ?? "").toString().trim();
  const includeInactive = showInactive === "1";

  const parts = await prisma.part.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
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
    orderBy: { partNumber: "asc" },
  });

  const rows: PartRow[] = parts.map((p) => {
    const qty = p.inventory?.qty ?? 0;
    const avg = p.inventory?.avgCost ?? null;
    const value = p.isConsignment ? null : avg ? avg.mul(qty) : null;
    return {
      id: p.id,
      partNumber: p.partNumber,
      name: p.name,
      brand: p.brand,
      isConsignment: p.isConsignment,
      qty,
      avgText: p.isConsignment ? "-" : formatUSD(avg),
      avg: p.isConsignment ? null : avg ? avg.toNumber() : null,
      valueText: p.isConsignment ? "-" : formatUSD(value),
      value: value ? value.toNumber() : null,
      isActive: p.isActive,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">配件</h1>
        <Button asChild>
          <Link href="/parts/new">新建配件</Link>
        </Button>
      </div>

      <ListFilterForm submitLabel="搜索">
        <Input name="q" defaultValue={keyword} placeholder="搜索配件号 / 名称 / 品牌" className="w-72" />
        <ShowInactiveCheckbox defaultChecked={includeInactive} />
      </ListFilterForm>

      <div className="rounded-lg border">
        <PartsTable
          rows={rows}
          empty={keyword ? "没有匹配的配件" : undefined}
        />
      </div>
    </div>
  );
}
