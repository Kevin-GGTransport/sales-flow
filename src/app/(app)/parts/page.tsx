import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatUSD } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PartsPage({
  searchParams,
}: PageProps<"/parts">) {
  const { q, showInactive } = await searchParams;
  const keyword = (q ?? "").toString().trim();
  const includeInactive = showInactive === "1";

  const parts = await prisma.part.findMany({
    where: {
      ...(includeInactive ? {} : { isActive: true }),
      ...(keyword
        ? {
            OR: [
              { partNumber: { contains: keyword, mode: "insensitive" } },
              { name: { contains: keyword, mode: "insensitive" } },
              { brand: { contains: keyword, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { inventory: true },
    orderBy: { partNumber: "asc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">配件</h1>
        <Button asChild>
          <Link href="/parts/new">新建配件</Link>
        </Button>
      </div>

      <form className="flex flex-wrap items-center gap-2">
        <Input
          name="q"
          defaultValue={keyword}
          placeholder="搜索配件号 / 名称 / 品牌"
          className="w-72"
        />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="showInactive"
            value="1"
            defaultChecked={includeInactive}
            className="size-4 accent-(--color-primary)"
          />
          显示已停用
        </label>
        <Button type="submit" variant="secondary">
          搜索
        </Button>
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配件号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead>品牌</TableHead>
              <TableHead>类型</TableHead>
              <TableHead className="text-right">库存</TableHead>
              <TableHead className="text-right">平均成本</TableHead>
              <TableHead className="text-right">库存价值</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  {keyword ? "没有匹配的配件" : "还没有配件，点右上角「新建配件」"}
                </TableCell>
              </TableRow>
            ) : (
              parts.map((part) => {
                const qty = part.inventory?.qty ?? 0;
                const avg = part.inventory?.avgCost ?? null;
                const value = part.isConsignment
                  ? null
                  : avg
                    ? avg.mul(qty)
                    : null;
                return (
                  <TableRow key={part.id} className={part.isActive ? "" : "opacity-50"}>
                    <TableCell>
                      <Link
                        href={`/parts/${part.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {part.partNumber}
                      </Link>
                      {!part.isActive && (
                        <span className="ml-2 text-xs text-muted-foreground">已停用</span>
                      )}
                    </TableCell>
                    <TableCell>{part.name}</TableCell>
                    <TableCell>{part.brand ?? "-"}</TableCell>
                    <TableCell>
                      {part.isConsignment ? (
                        <Badge variant="outline">寄卖</Badge>
                      ) : (
                        <Badge variant="secondary">自营</Badge>
                      )}
                    </TableCell>
                    <TableCell className={qty < 0 ? "text-right font-medium text-destructive" : "text-right"}>
                      {qty}
                    </TableCell>
                    <TableCell className="text-right">
                      {part.isConsignment ? "-" : formatUSD(avg)}
                    </TableCell>
                    <TableCell className="text-right">
                      {part.isConsignment ? "-" : formatUSD(value)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
