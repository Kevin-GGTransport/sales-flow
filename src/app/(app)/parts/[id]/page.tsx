import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EditPartDialog } from "@/components/parts/EditPartDialog";

export default async function PartDetailPage({
  params,
}: PageProps<"/parts/[id]">) {
  const { id } = await params;
  const part = await prisma.part.findUnique({
    where: { id },
    include: { inventory: true },
  });
  if (!part) notFound();

  const qty = part.inventory?.qty ?? 0;
  const avg = part.inventory?.avgCost ?? null;

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">出入历史</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          将随买入单 / 卖出单 / 寄卖调整功能逐步在此展示。
        </CardContent>
      </Card>
    </div>
  );
}
