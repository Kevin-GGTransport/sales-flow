import { prisma } from "@/lib/prisma";
import { SaleOrderForm } from "@/components/orders/SaleOrderForm";
import type { PartOption } from "@/components/parts/PartPicker";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewSalePage({
  searchParams,
}: PageProps<"/sales/new">) {
  const { copyFrom } = await searchParams;

  // 配件清单与「复制重开」来源单互不依赖，并行取
  const [partRows, src] = await Promise.all([
    prisma.part.findMany({
      where: { isActive: true, kind: { not: "CUSTODY" } },
      select: {
        id: true,
        partNumber: true,
        name: true,
        brand: true,
        kind: true,
        inventory: { select: { qty: true } },
      },
      orderBy: { partNumber: "asc" },
    }),
    copyFrom
      ? prisma.saleOrder.findUnique({
          where: { id: String(copyFrom) },
          include: { lines: true },
        })
      : Promise.resolve(null),
  ]);
  const parts: PartOption[] = partRows.map((p) => ({
    ...p,
    qty: p.inventory?.qty ?? 0,
  }));

  let copyFromData: Parameters<typeof SaleOrderForm>[0]["copyFrom"];
  if (src && src.status === "ACTIVE") {
    copyFromData = {
      customerName: src.customerName,
      customerContact: src.customerContact ?? "",
      note: src.note ?? "",
      lines: src.lines.map((l) => ({
        partId: l.partId,
        qty: l.qty,
        unitPrice: l.unitPrice.toString(),
      })),
    };
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={copyFromData ? "复制重开卖出单" : "新建卖出单"}
      />
      <SaleOrderForm parts={parts} copyFrom={copyFromData} />
    </div>
  );
}
