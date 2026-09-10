# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

New project (created 2026-09-09). No code has been written yet — there are no build, lint, or test commands to document. Once the project is scaffolded, update this file (or re-run `/init`) to document real commands and architecture instead of the planning context below.

## Tech Stack

- Next.js (App Router)
- TypeScript
- React
- PostgreSQL
- Tailwind CSS
- Prisma
- NextAuth.js

## Purpose

Sales/billing management application ("sales-manage") — a standalone, independent project. It does not share code, database, or deployment with any sibling project. Requirements are tracked in `../项目相关内容（防遗忘）.md` (one level up, outside this repo). Key planned functionality from that document:

- Order categories: 长途 (long-haul: 出货/回货/CA/PA/GA/LA) and local (OAK / SAV / LA / PA)
- Invoice management: invoice date defaults to empty; batch-select billing with editable invoice dates (including batch-setting invoice dates for negative-amount bills); TONU boolean column (default false); broker filtering (broker company = customer name; contract amount not editable)
- Filtered table views: (1) rows with empty invoice date, (2) rows with non-empty difference where 差额 = 支票金额 − invoice price, with quick month filters, (3) rows with both check amount and difference non-empty (editable deductions/扣钱), (4) rows with non-empty deductions
- 销账 (write-off / reconciliation) flow

## Notes

- The requirements file `../项目相关内容（防遗忘）.md` also contains plaintext credentials and API keys for shared accounts. Never copy them into code, commits, or this file.
