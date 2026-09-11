# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**sales-flow** — 汽车配件买卖管理系统：买入（钱出+库存入）、卖出（钱入+库存出）、加权平均成本、分次收付款与应收应付跟踪、明治品牌寄卖件、批量开票 + 英文 PDF 发票、统计报表、多用户（ADMIN/STAFF）。界面中文、金额美元、发票英文。

仓库：`https://github.com/Kevin-GGTransport/sales-flow`（本地目录名 sales-manage，与仓库名不一致没有影响）。

## Commands

```bash
npm run dev          # 开发（默认 3000，被占用时自动换端口）
npm run build        # prisma generate + next build
npm run lint         # eslint
npm test             # vitest run（单测：加权平均/编号/金额，秒级）
npm run db:migrate   # prisma migrate dev（改 schema 后）
npm run db:seed      # 幂等：仅当用户表为空时创建初始管理员（凭证在 .env）
npm run db:studio    # prisma studio 查库
```

环境变量见 `.env.example`（`DATABASE_URL`=Neon pooler 运行时连接，`DIRECT_URL`=Neon 直连供 Prisma CLI/migrate 用，`AUTH_SECRET`，`ADMIN_USERNAME`/`ADMIN_INITIAL_PASSWORD`）。**.env 含数据库凭证，绝不提交**。

## Tech Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Prisma 7（`prisma-client` 新生成器，输出 `src/generated/prisma` 已 gitignore；运行时经 `@prisma/adapter-pg` 连接，`src/lib/prisma.ts` 单例）· PostgreSQL (Neon) · Tailwind v4 + shadcn/ui（绿色主题，HSL 变量在 `globals.css`）· NextAuth v5 beta（Credentials + bcryptjs，JWT 带 role）· @react-pdf/renderer（发票）· zod · vitest。

## Architecture

- **读写分工**：Server Components 读数据，Server Actions（`src/actions/`）写数据；唯一业务 Route Handler 是发票 PDF 下载（`src/app/api/invoices/[saleOrderId]/pdf/route.tsx`，注意含 JSX 所以是 .tsx）。
- **鉴权**：`(app)/layout.tsx` 里 `auth()` + redirect（不用 middleware）；actions 用 `src/lib/guard.ts` 的 `requireUser()/requireAdmin()`。
- **金额**：全链路 Decimal（单价/金额 2 位、成本 4 位 half-up），表单字符串经 zod 校验后 `new Decimal()`；`src/lib/money.ts`。传给客户端组件前先 `.toString()`。
- **日期**：业务日期一律 UTC 零点入库，展示 `toISOString().slice(0,10)`（`src/lib/validation.ts`）。

### 核心业务规则（改代码前必读）

- **单据不可变**：买入/卖出单保存后不可改，录错由 ADMIN 作废（留痕）+「复制重开」；有收付款或已开票的单先清掉这些才能作废。
- **加权平均成本**：`src/lib/weighted-average.ts` 纯函数——库存 ≤ 0 时进货，均价**直接重置为本次进价**（不 blend）；卖出可穿透负库存且不改均价。任何单据变更后库存由 `recomputeByReplay`（`src/lib/inventory.ts`）**按时间重放全部有效事件**得出，不用逆向冲销。
- **成本快照不追溯**：卖出行的 `costAtSale` 是卖出当时的均价快照，永不重算（作废买入单也不改其他单的快照）。
- **寄卖件**（明治）：`Part.isConsignment`，只走「寄卖入库/退回」（StockAdjustment，只动数量）；卖出只消库存、成本 0、不计利润；**禁止进买入单**。结算价与寄卖利润暂未做（用户待定），模型已预留（行级 `isConsignment` 快照）。
- **库存调整**（StockAdjustment）：重放中一律 qty-only 事件（不动 avgCost）——自营件盘盈/盘亏（仅 ADMIN，盘盈成本基础记 0）与寄卖入库/退回共用。`Part.minQty` 为安全库存阈值（0=不预警），低库存=minQty>0 且 0≤qty≤minQty，与负库存互斥合并为「库存异常」（库存页 `/inventory` 与仪表盘）。
- **代保管**（`/custody`）：别家存放的货（CustodyItem 按货主+配件号唯一 + CustodyMovement 流水），只记数量与归属——不进加权平均/库存价值/报表，不可卖出/买入，退回不许超过现存（纯保管不允许负数）。与寄卖的区别：寄卖我们帮卖、代保管只存放。
- **收付款**：`Payment` 分次挂在买入/卖出单上（现金/支票/线上），未结=总额−Σ收款，**不允许超额收款**（事务内 FOR UPDATE 锁单行校验）；买入单可「当场付款」。删除收付款仅 ADMIN。
- **开票**：`SaleOrder.invoiceNo` 为 null 即未开票；批量分配连续 INV 号（`nextOrderNo` 按天流水，作废单占号）；PDF 中文配件名靠思源黑体（`src/lib/pdf/fonts/`，~17MB 已入库，勿删）；公司抬头常量在 `src/lib/company.ts`。
- **单号**：`PO-/SO-/INV-yyyymmdd-NNN`，UTC 日期。

### 权限矩阵

| 操作 | ADMIN | STAFF |
|---|---|---|
| 登录/查看（除用户管理）、配件、录单、寄卖调整、收付款、开票、下载 PDF | ✓ | ✓ |
| 作废单据、撤销开票、删除收付款、自营件盘盈/盘亏（库存调整） | ✓ | ✗ |
| 用户管理 | ✓ | ✗ |

## Testing

- `npm test`：纯函数单测（加权平均边界、编号避让、金额解析），改这些文件必须先跑。
- 手测路径：每类页面直接走一遍；库存类改动用 `npm run db:studio` 对账 `Inventory.qty/avgCost`（4 位）。
- Prisma 7 注意：`prisma.config.ts` 读 `DIRECT_URL` 做 migrate；运行时用 pooler 的 `DATABASE_URL`。Neon pooler 偶发池满报 "Unable to start a transaction"，事务已配 `maxWait: 10s`，偶发时重试即可。
