import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
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
import { TablePanel } from "@/components/ui/table-panel";

/** 单据中心 · 卖出 Tab（原 /sales 列表主体搬迁；tab 由隐藏域随筛选保留） */
export async function SalesPanel({
  sp,
}: {
  sp: Record<string, string | string[] | undefined>;
}) {
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
      <ListFilterForm hidden={{ tab: "sales" }}>
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

      <TablePanel>
        <SalesTable rows={rows} />
      </TablePanel>
    </div>
  );
}
