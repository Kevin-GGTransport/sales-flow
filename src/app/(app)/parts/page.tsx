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
import { TablePanel } from "@/components/ui/table-panel";
import { PageHeader } from "@/components/ui/page-header";

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
    const hasCost = p.kind === "OWNED";
    const value = hasCost && avg ? avg.mul(qty) : null;
    return {
      id: p.id,
      partNumber: p.partNumber,
      name: p.name,
      brand: p.brand,
      kind: p.kind,
      qty,
      avgText: hasCost ? formatUSD(avg) : "-",
      avg: hasCost && avg ? avg.toNumber() : null,
      suggestedSalePriceText: formatUSD(p.suggestedSalePrice),
      suggestedSalePrice: p.suggestedSalePrice?.toNumber() ?? null,
      valueText: hasCost ? formatUSD(value) : "-",
      value: value ? value.toNumber() : null,
      isActive: p.isActive,
    };
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="配件"
        actions={
          <Button asChild>
            <Link href="/parts/new">新建配件</Link>
          </Button>
        }
      />

      <ListFilterForm submitLabel="搜索">
        <Input name="q" defaultValue={keyword} placeholder="搜索配件号 / 名称 / 品牌" className="w-72" />
        <ShowInactiveCheckbox defaultChecked={includeInactive} />
      </ListFilterForm>

      <TablePanel>
        <PartsTable
          rows={rows}
          empty={keyword ? "没有匹配的配件" : undefined}
        />
      </TablePanel>
    </div>
  );
}
