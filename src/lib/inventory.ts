import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@/lib/money";
import {
  applyAdjustment,
  applyPurchase,
  applySale,
  ZERO_STATE,
  type InventoryState,
} from "@/lib/weighted-average";

export type Tx = Prisma.TransactionClient;

type RawInventoryRow = { partId: string; qty: number; avgCost: Prisma.Decimal };

/**
 * 锁定涉及配件的库存行（FOR UPDATE，防并发双单竞争同一配件），
 * 返回锁定后读到的 partId → {qty, avgCost}。
 * 注意：行可能不存在（配件从没建过库存行）——调用方 upsert。
 */
export async function lockInventoryRows(
  tx: Tx,
  partIds: string[],
): Promise<Map<string, InventoryState>> {
  const ids = [...new Set(partIds)];
  if (ids.length === 0) return new Map();

  const rows: RawInventoryRow[] = await tx.$queryRaw(
    Prisma.sql`SELECT "partId", "qty", "avgCost" FROM "Inventory" WHERE "partId" IN (${Prisma.join(ids)}) FOR UPDATE`,
  );
  const map = new Map<string, InventoryState>();
  for (const row of rows) {
    map.set(row.partId, { qty: row.qty, avgCost: new Decimal(row.avgCost) });
  }
  return map;
}

type ReplayEvent = {
  date: Date;
  createdAt: Date;
  seq: number;
  kind: "IN" | "OUT";
  qty: number;
  price?: Prisma.Decimal;
  /** 库存调整（寄卖入库/退回、自营盘盈/盘亏）：只动数量不动均价（盘盈成本基础 0） */
  qtyOnly?: boolean;
};

/**
 * 重放法重算一个配件的库存：按时间顺序回放全部 ACTIVE 单据行（+ 寄卖调整），
 * 从 {qty:0, avg:0} 起逐笔 apply，写回 Inventory。
 *
 * 为什么重放而不是逆向冲销：作废中间一笔买入会改变其后所有进货的
 * reset/blend 分支（负库存时进价直接重置均价），逆向减法在数学上不封闭；
 * 重放永远精确。内部工具数据量下成本可忽略。
 *
 * 注意：不重算其他卖出单已落的 costAtSale（快照原则，有意为之）。
 */
export async function recomputeByReplay(tx: Tx, partId: string): Promise<void> {
  const part = await tx.part.findUnique({
    where: { id: partId },
    select: { isConsignment: true },
  });
  if (!part) return;

  const events: ReplayEvent[] = [];
  let seq = 0;

  if (!part.isConsignment) {
    const purchaseLines = await tx.purchaseOrderLine.findMany({
      where: { partId, order: { status: "ACTIVE" } },
      select: { qty: true, unitPrice: true, order: { select: { orderDate: true, createdAt: true } } },
    });
    for (const line of purchaseLines) {
      events.push({
        date: line.order.orderDate,
        createdAt: line.order.createdAt,
        seq: seq++,
        kind: "IN",
        qty: line.qty,
        price: line.unitPrice,
      });
    }
  }

  const saleLines = await tx.saleOrderLine.findMany({
    where: { partId, order: { status: "ACTIVE" } },
    select: { qty: true, order: { select: { orderDate: true, createdAt: true } } },
  });
  for (const line of saleLines) {
    events.push({
      date: line.order.orderDate,
      createdAt: line.order.createdAt,
      seq: seq++,
      kind: "OUT",
      qty: line.qty,
    });
  }

  // 库存调整（寄卖入库/退回、自营盘盈/盘亏）：一律 qty-only 回放，
  // 标记来自事件来源而非配件属性——Part 翻转寄卖/自营后历史调整行为不变
  const adjustments = await tx.stockAdjustment.findMany({
    where: { partId },
    select: { qty: true, adjDate: true, createdAt: true },
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

  events.sort(
    (a, b) =>
      a.date.getTime() - b.date.getTime() ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.seq - b.seq,
  );

  let state: InventoryState = ZERO_STATE();
  for (const ev of events) {
    if (part.isConsignment) {
      // 寄卖件：只动数量，无成本体系
      state = {
        qty: state.qty + (ev.kind === "IN" ? ev.qty : -ev.qty),
        avgCost: state.avgCost,
      };
    } else if (ev.qtyOnly) {
      // 盘盈/盘亏：只动数量不动均价（adjustment 无 price，不能走 applyPurchase）
      state = applyAdjustment(
        state,
        ev.kind === "IN" ? ev.qty : -ev.qty,
      );
    } else if (ev.kind === "IN") {
      state = applyPurchase(state, ev.qty, ev.price!);
    } else {
      state = applySale(state, ev.qty);
    }
  }

  await tx.inventory.upsert({
    where: { partId },
    create: { partId, qty: state.qty, avgCost: state.avgCost },
    update: { qty: state.qty, avgCost: state.avgCost },
  });
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
