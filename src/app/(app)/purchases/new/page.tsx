import { prisma } from "@/lib/prisma";
import { PurchaseOrderForm } from "@/components/orders/PurchaseOrderForm";
import type { PartOption } from "@/components/parts/PartPicker";
import { PageHeader } from "@/components/ui/page-header";

export default async function NewPurchasePage({
  searchParams,
}: PageProps<"/purchases/new">) {
  const { copyFrom } = await searchParams;

  // 配件清单与「复制重开」来源单互不依赖，并行取
  const [partRows, src, paymentMethodRows] = await Promise.all([
    prisma.part.findMany({
      where: { isActive: true, kind: "OWNED" },
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
      ? prisma.purchaseOrder.findUnique({
          where: { id: String(copyFrom) },
          include: { lines: true },
        })
      : Promise.resolve(null),
    prisma.purchaseOrder.findMany({
      where: { paymentMethod: { not: null } },
      select: { paymentMethod: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);
  const parts: PartOption[] = partRows.map((p) => ({
    ...p,
    qty: p.inventory?.qty ?? 0,
  }));

  let copyFromData: Parameters<typeof PurchaseOrderForm>[0]["copyFrom"];
  if (src && src.status === "ACTIVE") {
    copyFromData = {
      supplierName: src.supplierName,
      paymentMethod: src.paymentMethod ?? "",
      note: src.note ?? "",
      lines: src.lines.map((l) => ({
        partId: l.partId,
        qty: l.qty,
        unitPrice: l.unitPrice.toString(),
      })),
    };
  }
  const paymentMethodHistory = [
    ...new Set(
      paymentMethodRows.flatMap((row) =>
        row.paymentMethod?.trim() ? [row.paymentMethod.trim()] : [],
      ),
    ),
  ].slice(0, 12);

  return (
    <div className="space-y-4">
      <PageHeader
        title={copyFromData ? "复制重开买入单" : "新建买入单"}
      />
      <PurchaseOrderForm
        parts={parts}
        copyFrom={copyFromData}
        paymentMethodHistory={paymentMethodHistory}
      />
    </div>
  );
}
