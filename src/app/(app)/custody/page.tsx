import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateString } from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CustodyMoveDialog,
  EditCustodyItemDialog,
  NewCustodyItemDialog,
  ToggleCustodyItemButton,
} from "@/components/custody/CustodyDialogs";

const FLOW_PAGE_SIZE = 50;

export default async function CustodyPage({
  searchParams,
}: PageProps<"/custody">) {
  const sp = await searchParams;
  const keyword = ((sp.q ?? "").toString()).trim();
  const ownerFilter = ((sp.owner ?? "").toString()).trim();
  const showInactive = sp.showInactive === "1";

  const where = {
    ...(showInactive ? {} : { isActive: true }),
    ...(keyword
      ? {
          OR: [
            { ownerName: { contains: keyword, mode: "insensitive" as const } },
            { partNumber: { contains: keyword, mode: "insensitive" as const } },
            { partName: { contains: keyword, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(ownerFilter ? { ownerName: ownerFilter } : {}),
  };

  const items = await prisma.custodyItem.findMany({
    where,
    orderBy: [{ ownerName: "asc" }, { partNumber: "asc" }],
  });

  const [movements, ownerCounts] = await Promise.all([
    items.length
      ? prisma.custodyMovement.findMany({
          where: { custodyItemId: { in: items.map((i) => i.id) } },
          include: { createdBy: { select: { name: true } } },
          orderBy: [{ moveDate: "desc" }, { createdAt: "desc" }],
          take: FLOW_PAGE_SIZE,
        })
      : Promise.resolve([]),
    prisma.custodyItem.groupBy({
      by: ["ownerName"],
      where: { isActive: true },
      _sum: { qty: true },
      _count: { _all: true },
    }),
  ]);

  // 汇总基于未筛选的在管全集
  const activeTotal = ownerCounts.reduce((s, o) => s + (o._sum.qty ?? 0), 0);
  const activeKinds = ownerCounts.reduce((s, o) => s + o._count._all, 0);
  const summary = [
    { label: "货主数", value: String(ownerCounts.length) },
    { label: "在管品类数", value: String(activeKinds) },
    { label: "在管总件数", value: String(activeTotal) },
  ];

  const qs = (over: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const base: Record<string, string> = {
      ...(keyword ? { q: keyword } : {}),
      ...(ownerFilter ? { owner: ownerFilter } : {}),
      ...(showInactive ? { showInactive: "1" } : {}),
    };
    for (const [k, v] of Object.entries(over)) {
      if (v == null || v === "") delete base[k];
      else base[k] = v;
    }
    for (const [k, v] of Object.entries(base)) params.set(k, v);
    const s = params.toString();
    return s ? `/custody?${s}` : "/custody";
  };

  const itemById = new Map(items.map((i) => [i.id, i]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">代保管</h1>
        <NewCustodyItemDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {summary.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <form className="flex flex-wrap items-center gap-2">
        {ownerFilter && <input type="hidden" name="owner" value={ownerFilter} />}
        <Input name="q" defaultValue={keyword} placeholder="搜索货主 / 配件号 / 名称" className="w-72" />
        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="showInactive"
            value="1"
            defaultChecked={showInactive}
            className="size-4 accent-(--color-primary)"
          />
          显示已停用
        </label>
        <Button type="submit" variant="secondary">
          搜索
        </Button>
      </form>

      {ownerCounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={qs({ owner: "" })}
            className={
              !ownerFilter
                ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                : "rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent"
            }
          >
            全部货主
          </Link>
          {ownerCounts
            .slice()
            .sort((a, b) => a.ownerName.localeCompare(b.ownerName))
            .map((o) => (
              <Link
                key={o.ownerName}
                href={qs({ owner: o.ownerName })}
                className={
                  ownerFilter === o.ownerName
                    ? "rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground"
                    : "rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent"
                }
              >
                {o.ownerName}（{o._sum.qty ?? 0}）
              </Link>
            ))}
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>货主</TableHead>
              <TableHead>配件号</TableHead>
              <TableHead>名称</TableHead>
              <TableHead className="text-right">现存数量</TableHead>
              <TableHead>备注</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {keyword || ownerFilter ? "没有匹配的代保管货品" : "还没有代保管货品，点右上角「登记代保管」"}
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className={item.isActive ? "" : "opacity-50"}>
                  <TableCell className="font-medium">
                    {item.ownerName}
                    {!item.isActive && (
                      <span className="ml-2 text-xs text-muted-foreground">已停用</span>
                    )}
                  </TableCell>
                  <TableCell>{item.partNumber}</TableCell>
                  <TableCell>{item.partName}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.qty}</TableCell>
                  <TableCell className="max-w-48 truncate text-muted-foreground">
                    {item.note ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <CustodyMoveDialog
                        custodyItemId={item.id}
                        ownerName={item.ownerName}
                        partNumber={item.partNumber}
                        qty={item.qty}
                      />
                      <EditCustodyItemDialog
                        initial={{
                          id: item.id,
                          ownerName: item.ownerName,
                          partNumber: item.partNumber,
                          partName: item.partName,
                          note: item.note ?? "",
                        }}
                      />
                      <ToggleCustodyItemButton
                        custodyItemId={item.id}
                        isActive={item.isActive}
                        label={item.isActive ? "停用" : "启用"}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {items.length > 0 && (
        <div className="rounded-lg border">
          <div className="border-b p-3 text-sm font-medium">
            出入流水（当前列表 · 新→旧{movements.length === FLOW_PAGE_SIZE ? `，仅显示最近 ${FLOW_PAGE_SIZE} 条` : ""}）
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日期</TableHead>
                <TableHead>货主 / 配件</TableHead>
                <TableHead className="text-right">数量变动</TableHead>
                <TableHead>备注</TableHead>
                <TableHead>经手人</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-16 text-center text-muted-foreground">
                    还没有出入记录
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((m) => {
                  const item = itemById.get(m.custodyItemId)!;
                  return (
                    <TableRow key={m.id}>
                      <TableCell>{formatDateString(m.moveDate)}</TableCell>
                      <TableCell>
                        {item.ownerName} / {item.partNumber}
                      </TableCell>
                      <TableCell
                        className={
                          m.qty > 0
                            ? "text-right tabular-nums text-primary"
                            : "text-right tabular-nums text-muted-foreground"
                        }
                      >
                        {m.qty > 0 ? `+${m.qty}` : m.qty}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{m.reason ?? "-"}</TableCell>
                      <TableCell className="text-muted-foreground">{m.createdBy.name}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
