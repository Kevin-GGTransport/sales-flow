import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">卖出单</h1>
        <Button asChild>
          <Link href="/sales/new">新建卖出单</Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={keyword}
          placeholder="搜索单号 / 客户 / 发票号"
          className="w-64"
        />
        <Select name="status" defaultValue={status ?? "ALL"}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">有效</SelectItem>
            <SelectItem value="VOID">已作废</SelectItem>
            <SelectItem value="ALL">全部</SelectItem>
          </SelectContent>
        </Select>
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
        <Button type="submit" variant="secondary">
          筛选
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>单号</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>客户</TableHead>
              <TableHead className="text-right">行数</TableHead>
              <TableHead className="text-right">总金额</TableHead>
              <TableHead>开票</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>录单人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  没有卖出单
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className={order.status === "VOID" ? "opacity-60" : ""}>
                  <TableCell>
                    <Link
                      href={`/sales/${order.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {order.orderNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateString(order.orderDate)}</TableCell>
                  <TableCell>{order.customerName}</TableCell>
                  <TableCell className="text-right">{order._count.lines}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUSD(order.totalAmount)}
                  </TableCell>
                  <TableCell>
                    {order.invoiceNo ? (
                      <span className="text-xs">{order.invoiceNo}</span>
                    ) : order.status === "ACTIVE" ? (
                      <Badge variant="secondary">未开票</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>{order.createdBy.name}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
