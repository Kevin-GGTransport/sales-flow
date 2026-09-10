import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// 幂等 seed：仅当用户表为空时创建初始管理员（凭证来自 .env，绝不写入代码）
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.user.count();
  if (count > 0) {
    console.log(`用户表已有 ${count} 个用户，跳过 seed`);
    return;
  }
  const username = process.env.ADMIN_USERNAME;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!username || !password) {
    throw new Error("缺少 ADMIN_USERNAME / ADMIN_INITIAL_PASSWORD 环境变量（见 .env.example）");
  }
  const user = await prisma.user.create({
    data: {
      username,
      name: "管理员",
      passwordHash: await bcrypt.hash(password, 10),
      role: "ADMIN",
    },
  });
  console.log(`已创建初始管理员: ${user.username}（请登录后立即修改密码）`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
