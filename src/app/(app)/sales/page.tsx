import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ListFilterForm,
  StatusSelect,
} from "@/components/ui/list-filter-form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SalesTable, type SaleRow } from "@/components/sales/SalesTable";

export default async function SalesPage({
  searchParams,
}: PageProps<"/sales">) {
  const sp = await searchParams;
  const keyword = (sp.q ?? "").toString().trim();
  const statusParam = (sp.status ?? "ACTIVE").toString();
  const status = statusParam === "ALL" ? undefined : statusParam;
  const invoiceParam = (sp.invoice ?? "ALL").toString();

  const orders = await prisma.saleOrder.findMany({
    where: {
      ...(status ? { status: status as "ACTIVE" | "VOID" } : {}),
      ...(invoiceParam === "UNINVOICED"
        ? { status: "ACTIVE", invoiceNo: null }
        : invoiceParam === "INVOICED"
          ? { invoiceNo: { not: null } }
          : {}),
      ...(keyword
        ? {
            OR: [
              { orderNo: { contains: keyword, mode: "insensitive" } },
              { customerName: { contains: keyword, mode: "insensitive" } },
              { invoiceNo: { contains: keyword, mode: "insensitive" } },
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

  const rows: SaleRow[] = orders.map((o) => ({
    id: o.id,
    orderNo: o.orderNo,
    orderDate: formatDateString(o.orderDate),
    customerName: o.customerName,
    lines: o._count.lines,
    totalAmountText: formatUSD(o.totalAmount),
    totalAmount: o.totalAmount.toNumber(),
    invoiceNo: o.invoiceNo,
    status: o.status,
    createdBy: o.createdBy.name,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">卖出单</h1>
        <Button asChild>
          <Link href="/sales/new">新建卖出单</Link>
        </Button>
      </div>

      <ListFilterForm>
        <Input
          name="q"
          defaultValue={keyword}
          placeholder="搜索单号 / 客户 / 发票号"
          className="w-64"
        />
        <StatusSelect defaultValue={status ?? "ALL"} />
        <Select name="invoice" defaultValue={invoiceParam}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">开票不限</SelectItem>
            <SelectItem value="UNINVOICED">未开票</SelectItem>
            <SelectItem value="INVOICED">已开票</SelectItem>
          </SelectContent>
        </Select>
      </ListFilterForm>

      <div className="rounded-lg border">
        <SalesTable rows={rows} />
      </div>
    </div>
  );
}
