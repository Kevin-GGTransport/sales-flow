import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma CLI（migrate/db push/studio）用 Neon 直连端点（DIRECT_URL，host 无 -pooler），
// 避免池化连接的事务模式干扰 DDL；运行时客户端见 src/lib/prisma.ts（用池化 DATABASE_URL）。
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL!,
  },
});
