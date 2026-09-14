import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
import { Input } from "@/components/ui/input";
import {
  ListFilterForm,
  StatusSelect,
} from "@/components/ui/list-filter-form";
import { PurchasesTable, type PurchaseRow } from "@/components/purchases/PurchasesTable";

/** 单据中心 · 买入 Tab（原 /purchases 列表主体搬迁；tab 由隐藏域随筛选保留） */
export async function PurchasesPanel({
  sp,
}: {
  sp: Record<string, string | string[] | undefined>;
}) {
  const keyword = (sp.q ?? "").toString().trim();
  const statusParam = (sp.status ?? "ACTIVE").toString();
  const status = statusParam === "ALL" ? undefined : statusParam;

  const orders = await prisma.purchaseOrder.findMany({
    where: {
      ...(status ? { status: status as "ACTIVE" | "VOID" } : {}),
      ...(keyword
        ? {
            OR: [
              { orderNo: { contains: keyword, mode: "insensitive" } },
              { supplierName: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: [{ orderDate: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  const rows: PurchaseRow[] = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    orderDate: formatDateString(o.orderDate),
    supplierName: o.supplierName,
    lines: o._count.lines,
    totalAmountText: formatUSD(o.totalAmount),
    totalAmount: o.totalAmount.toNumber(),
    status: o.status,
    createdBy: o.createdBy.name,
  }));

  return (
    <div className="space-y-4">
      <ListFilterForm hidden={{ tab: "purchases" }}>
        <Input
          name="q"
          defaultValue={keyword}
          placeholder="搜索单号 / 供应商"
          className="w-64"
        />
        <StatusSelect defaultValue={status ?? "ALL"} className="w-32" />
      </ListFilterForm>

      <div className="rounded-lg border">
        <PurchasesTable rows={rows} />
      </div>
    </div>
  );
}
