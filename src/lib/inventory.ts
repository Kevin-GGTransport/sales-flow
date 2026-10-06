import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@/lib/money";
import { foldEvents, sortEvents, type PartKind, type ReplayEvent } from "@/lib/replay";
import type { InventoryState } from "@/lib/weighted-average";

export type Tx = Prisma.TransactionClient;

type RawInventoryRow = { partId: string; qty: number; avgCost: Prisma.Decimal };

/**
 * 锁定涉及配件的库存行（FOR UPDATE，防并发双单竞争同一配件），
 * 返回锁定后读到的 partId → {qty, avgCost}。
 * 注意：行可能不存在（配件从没建过库存行）——调用方 upsert。
 * ORDER BY 保证加锁物理顺序全局确定（配合入参去重排序，跨单据不死锁）。
 */
export async function lockInventoryRows(
  tx: Tx,
  partIds: string[],
): Promise<Map<string, InventoryState>> {
  const ids = [...new Set(partIds)].sort();
  if (ids.length === 0) return new Map();

  const rows: RawInventoryRow[] = await tx.$queryRaw(
    Prisma.sql`SELECT "partId", "qty", "avgCost" FROM "Inventory" WHERE "partId" IN (${Prisma.join(ids)}) ORDER BY "partId" FOR UPDATE`,
  );
  const map = new Map<string, InventoryState>();
  for (const row of rows) {
    map.set(row.partId, { qty: row.qty, avgCost: new Decimal(row.avgCost) });
  }
  return map;
}

/**
 * 收集一个配件的全部重放事件（ACTIVE 买入行带价、ACTIVE 卖出行、全部库存调整）。
 *
 * 三段 findMany 都带 orderBy id：事件排序的最终 tie-break 是收集序 seq，
 * 查询顺序必须确定（否则「同 (date, createdAt) 平局组内顺序」依赖数据库返回顺序，
 * 时点均价快照会不稳定）。不变量见 replay.ts sortEvents 注释。
 */
async function collectPartEvents(
  tx: Tx,
  partId: string,
): Promise<{ kind: PartKind; events: ReplayEvent[] } | null> {
  const part = await tx.part.findUnique({
    where: { id: partId },
    select: { kind: true },
  });
  if (!part) return null;

  const events: ReplayEvent[] = [];
  let seq = 0;

  if (part.kind === "OWNED") {
    const purchaseLines = await tx.purchaseOrderLine.findMany({
      where: { partId, order: { status: "ACTIVE" } },
      select: {
        qty: true,
        unitPrice: true,
        orderId: true,
        order: { select: { orderDate: true, createdAt: true } },
      },
      orderBy: { id: "asc" },
    });
    for (const line of purchaseLines) {
      events.push({
        date: line.order.orderDate,
        createdAt: line.order.createdAt,
        seq: seq++,
        kind: "IN",
        qty: line.qty,
        price: new Decimal(line.unitPrice),
        orderId: line.orderId,
      });
    }
  }

  if (part.kind !== "CUSTODY") {
    const saleLines = await tx.saleOrderLine.findMany({
      where: { partId, order: { status: "ACTIVE" } },
      select: {
        qty: true,
        orderId: true,
        order: { select: { orderDate: true, createdAt: true } },
      },
      orderBy: { id: "asc" },
    });
    for (const line of saleLines) {
      events.push({
        date: line.order.orderDate,
        createdAt: line.order.createdAt,
        seq: seq++,
        kind: "OUT",
        qty: line.qty,
        orderId: line.orderId,
      });
    }
  }

  // 库存调整（寄卖入库/退回、自营盘盈/盘亏）：一律 qty-only 回放，
  // 标记来自事件来源而非配件属性——Part 翻转寄卖/自营后历史调整行为不变
  const adjustments = await tx.stockAdjustment.findMany({
    where: { partId },
    select: { qty: true, adjDate: true, createdAt: true },
    orderBy: { id: "asc" },
  });
  for (const adj of adjustments) {
    events.push({
      date: adj.adjDate,
      createdAt: adj.createdAt,
      seq: seq++,
      kind: adj.qty >= 0 ? "IN" : "OUT",
      qty: Math.abs(adj.qty),
      qtyOnly: true,
    });
  }

  return { kind: part.kind, events };
}

async function upsertInventory(
  tx: Tx,
  partId: string,
  state: InventoryState,
): Promise<void> {
  await tx.inventory.upsert({
    where: { partId },
    create: { partId, qty: state.qty, avgCost: state.avgCost },
    update: { qty: state.qty, avgCost: state.avgCost },
  });
}

/**
 * 重放法重算一个配件的库存：按时间顺序回放全部 ACTIVE 单据行（+ 寄卖调整），
 * 从 {qty:0, avg:0} 起逐笔 apply，写回 Inventory。
 * 不重算其他卖出单已落的 costAtSale（快照原则，有意为之）。
 */
export async function recomputeByReplay(tx: Tx, partId: string): Promise<void> {
  const collected = await collectPartEvents(tx, partId);
  if (!collected) return;
  const state = foldEvents(collected.kind, sortEvents(collected.events));
  await upsertInventory(tx, partId, state);
}

/**
 * 重算库存并返回「目标卖出单在该配件上出库时点的 avgCost」——
 * 编辑卖出单后回填 costAtSale 快照用（改了日期/数量 = 卖出发生在新时点）。
 *
 * 返回 null：目标单在该配件上无出库事件，或寄卖/代保管件（无成本体系，
 * 快照恒 0，无需回填）。同单同配件多行共用同一时点均价（证明见 sortEvents 注释）。
 */
export async function recomputeWithOrderSnapshot(
  tx: Tx,
  partId: string,
  orderId: string,
): Promise<{ snapshotAvgCost: Decimal | null }> {
  const collected = await collectPartEvents(tx, partId);
  if (!collected) return { snapshotAvgCost: null };

  let snapshot: Decimal | null = null;
  const state = foldEvents(collected.kind, sortEvents(collected.events), (ev, stateBefore) => {
    if (ev.orderId === orderId && snapshot === null) {
      snapshot = stateBefore.avgCost;
    }
  });
  await upsertInventory(tx, partId, state);
  return { snapshotAvgCost: collected.kind === "OWNED" ? snapshot : null };
}

function isDeadlock(e: unknown): boolean {
  return (
    e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034"
  );
}

/** 事务等待参数：Neon pooler 偶发池满，多等一会再报错 */
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 } as const;

/** P2034（死锁）整体重开事务重试一次 */
export async function withTxRetry<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(fn, TX_OPTIONS);
  } catch (e) {
    if (isDeadlock(e)) return prisma.$transaction(fn, TX_OPTIONS);
    throw e;
  }
}
