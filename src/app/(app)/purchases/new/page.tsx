import { prisma } from "@/lib/prisma";
import { PurchaseOrderForm } from "@/components/orders/PurchaseOrderForm";
import type { PartOption } from "@/components/parts/PartPicker";

export default async function NewPurchasePage({
  searchParams,
}: PageProps<"/purchases/new">) {
  const { copyFrom } = await searchParams;

  const parts: PartOption[] = await prisma.part.findMany({
    where: { isActive: true },
    select: {
      id: true,
      partNumber: true,
      name: true,
      brand: true,
      isConsignment: true,
      inventory: { select: { qty: true } },
    },
    orderBy: { partNumber: "asc" },
  }).then((rows) =>
    rows.map((p) => ({ ...p, qty: p.inventory?.qty ?? 0 })),
  );

  let copyFromData: Parameters<typeof PurchaseOrderForm>[0]["copyFrom"];
  if (copyFrom) {
    const src = await prisma.purchaseOrder.findUnique({
      where: { id: String(copyFrom) },
      include: { lines: true },
    });
    if (src && src.status === "ACTIVE") {
      copyFromData = {
        supplierName: src.supplierName,
        note: src.note ?? "",
        lines: src.lines.map((l) => ({
          partId: l.partId,
          qty: l.qty,
          unitPrice: l.unitPrice.toString(),
        })),
      };
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">
        {copyFromData ? "复制重开买入单" : "新建买入单"}
      </h1>
      <PurchaseOrderForm parts={parts} copyFrom={copyFromData} />
    </div>
  );
}
