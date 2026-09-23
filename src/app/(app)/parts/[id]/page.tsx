import { notFound } from "next/navigation";
import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { formatDateString } from "@/lib/validation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartKindBadge } from "@/components/parts/PartKindBadge";
import { StatCard } from "@/components/ui/stat-card";
import { TablePanel } from "@/components/ui/table-panel";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyRow,
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
  const [part, session] = await Promise.all([
    prisma.part.findUnique({
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
    }),
    auth(),
  ]);
  if (!part) notFound();

  // 页面层只控制按钮显隐（UX），真正的权限在 action 层强制
  const isAdminFlag = isAdmin(session);

  const qty = part.inventory?.qty ?? 0;
  const avg = part.inventory?.avgCost ?? null;
  const lowStock = part.minQty > 0 && qty >= 0 && qty <= part.minQty;
  const adjLabel = part.kind === "CONSIGNMENT" ? "寄卖调整" : part.kind === "CUSTODY" ? "代保管增减" : "库存调整";

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
      label: adjLabel,
      ref: a.reason ?? "",
      href: "#",
      qty: a.qty,
      amount: "-",
      voided: false,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  return (
    <div className="space-y-4">
      <PageHeader
        title={part.partNumber}
        back={{ href: "/parts", label: "← 配件" }}
        meta={
          <>
            <PartKindBadge kind={part.kind} />
            {!part.isActive && <Badge variant="destructive">已停用</Badge>}
          </>
        }
        actions={
          <div className="flex gap-2">
            {(part.kind !== "OWNED" || isAdminFlag) && (
              <StockAdjustDialog
                partId={part.id}
                partNumber={part.partNumber}
                kind={part.kind}
              />
            )}
            <EditPartDialog
              initial={{
                id: part.id,
                partNumber: part.partNumber,
                name: part.name,
                brand: part.brand ?? "",
                description: part.description ?? "",
                kind: part.kind,
                minQty: part.minQty,
                suggestedSalePrice: part.suggestedSalePrice?.toString() ?? "",
              }}
            />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="库存数量"
          value={qty}
          size="lg"
          labelSize="sm"
          mono={false}
          tone={qty < 0 ? "destructive" : "default"}
        >
          {lowStock && (
            <p className="mt-1 text-xs text-destructive">
              {qty === 0 ? "已无库存" : "低于安全库存"}（阈值 {part.minQty}）
            </p>
          )}
        </StatCard>
        <StatCard
          label="平均成本"
          value={part.kind === "OWNED" ? formatUSD(avg) : "-"}
          size="lg"
          labelSize="sm"
          mono={false}
        />
        <StatCard
          label="建议售价"
          value={formatUSD(part.suggestedSalePrice)}
          size="lg"
          labelSize="sm"
          mono={false}
        />
        <StatCard
          label="库存价值"
          value={part.kind === "OWNED" ? formatUSD(avg ? avg.mul(qty) : null) : "-"}
          size="lg"
          labelSize="sm"
          mono={false}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">档案</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm">
          <p>名称：{part.name}</p>
          <p>品牌：{part.brand ?? "-"}</p>
          <p>安全库存阈值：{part.minQty > 0 ? part.minQty : "不预警"}</p>
          <p className="whitespace-pre-wrap">备注：{part.description ?? "-"}</p>
        </CardContent>
      </Card>

      <TablePanel title="出入历史（新→旧）">
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
              <EmptyRow colSpan={5}>还没有出入记录</EmptyRow>
            ) : (
              history.map((row) => (
                <TableRow key={row.key} className={row.voided ? "text-muted-foreground" : ""}>
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
      </TablePanel>
    </div>
  );
}
