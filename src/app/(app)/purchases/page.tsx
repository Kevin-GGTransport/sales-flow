import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PurchasesTable, type PurchaseRow } from "@/components/purchases/PurchasesTable";

export default async function PurchasesPage({
  searchParams,
}: PageProps<"/purchases">) {
  const sp = await searchParams;
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">买入单</h1>
        <Button asChild>
          <Link href="/purchases/new">新建买入单</Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={keyword}
          placeholder="搜索单号 / 供应商"
          className="w-64"
        />
        <Select name="status" defaultValue={status ?? "ALL"}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">有效</SelectItem>
            <SelectItem value="VOID">已作废</SelectItem>
            <SelectItem value="ALL">全部</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          筛选
        </Button>
      </form>

      <div className="rounded-lg border">
        <PurchasesTable rows={rows} />
      </div>
    </div>
  );
}
