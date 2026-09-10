import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditPartDialog } from "@/components/parts/EditPartDialog";
import { StockAdjustDialog } from "@/components/parts/StockAdjustDialog";

type HistoryRow = {
  key: string;
  date: Date;
  kind: "IN" | "OUT" | "ADJ";
  label: string;
  ref: string;
  href: string;
  qty: number;
  amount: string;
  voided: boolean;
};

export default async function PartDetailPage({
  params,
}: PageProps<"/parts/[id]">) {
  const { id } = await params;
  const part = await prisma.part.findUnique({
    where: { id },
    include: {
      inventory: true,
      purchaseLines: {
        include: { order: { select: { orderNo: true, orderDate: true, status: true } } },
      },
      saleLines: {
        include: { order: { select: { orderNo: true, orderDate: true, status: true } } },
      },
      adjustments: true,
    },
  });
  if (!part) notFound();

  const qty = part.inventory?.qty ?? 0;
  const avg = part.inventory?.avgCost ?? null;

  const history: HistoryRow[] = [
    ...part.purchaseLines.map((l) => ({
      key: `p-${l.id}`,
      date: l.order.orderDate,
      kind: "IN" as const,
      label: "买入",
      ref: l.order.orderNo,
      href: "#",
      qty: l.qty,
      amount: formatUSD(l.lineTotal),
      voided: l.order.status === "VOID",
    })),
    ...part.saleLines.map((l) => ({
      key: `s-${l.id}`,
      date: l.order.orderDate,
      kind: "OUT" as const,
      label: "卖出",
      ref: l.order.orderNo,
      href: "#",
      qty: -l.qty,
      amount: formatUSD(l.lineTotal),
      voided: l.order.status === "VOID",
    })),
    ...part.adjustments.map((a) => ({
      key: `a-${a.id}`,
      date: a.adjDate,
      kind: "ADJ" as const,
      label: "寄卖调整",
      ref: a.reason ?? "",
      href: "#",
      qty: a.qty,
      amount: "-",
      voided: false,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/parts" className="text-sm text-muted-foreground hover:underline">
            ← 配件
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">{part.partNumber}</h1>
          {part.isConsignment ? (
            <Badge variant="outline">寄卖</Badge>
          ) : (
            <Badge variant="secondary">自营</Badge>
          )}
          {!part.isActive && <Badge variant="destructive">已停用</Badge>}
        </div>
        <div className="flex gap-2">
          {part.isConsignment && (
            <StockAdjustDialog partId={part.id} partNumber={part.partNumber} />
          )}
          <EditPartDialog
            initial={{
              id: part.id,
              partNumber: part.partNumber,
              name: part.name,
              brand: part.brand ?? "",
              description: part.description ?? "",
              isConsignment: part.isConsignment,
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">库存数量</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={qty < 0 ? "text-2xl font-semibold text-destructive" : "text-2xl font-semibold"}>
              {qty}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均成本</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {part.isConsignment ? "-" : formatUSD(avg)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">库存价值</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {part.isConsignment ? "-" : formatUSD(avg ? avg.mul(qty) : null)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">档案</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p>名称：{part.name}</p>
          <p>品牌：{part.brand ?? "-"}</p>
          <p className="whitespace-pre-wrap">备注：{part.description ?? "-"}</p>
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        <div className="border-b p-3 text-sm font-medium">出入历史（新→旧）</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>单据/说明</TableHead>
              <TableHead className="text-right">数量变动</TableHead>
              <TableHead className="text-right">金额</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                  还没有出入记录
                </TableCell>
              </TableRow>
            ) : (
              history.map((row) => (
                <TableRow key={row.key} className={row.voided ? "opacity-50" : ""}>
                  <TableCell>{formatDateString(row.date)}</TableCell>
                  <TableCell>{row.label}{row.voided && "（已作废）"}</TableCell>
                  <TableCell>{row.ref || "-"}</TableCell>
                  <TableCell
                    className={
                      row.qty >= 0
                        ? "text-right tabular-nums text-primary"
                        : "text-right tabular-nums text-muted-foreground"
                    }
                  >
                    {row.qty > 0 ? `+${row.qty}` : row.qty}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.amount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
