"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/guard";
import type { ActionResult } from "@/actions/parts";

export async function createUser(input: {
  username: string;
  name: string;
  password: string;
  role: "ADMIN" | "STAFF";
}): Promise<ActionResult> {
  try {
    await requireAdmin();
    const username = input.username.trim();
    const name = input.name.trim();
    if (!/^[a-zA-Z0-9_-]{3,32}$/.test(username)) {
      return { ok: false, error: "用户名需 3-32 位字母/数字/_/-" };
    }
    if (!name) return { ok: false, error: "显示名必填" };
    if (input.password.length < 6) {
      return { ok: false, error: "密码至少 6 位" };
    }
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return { ok: false, error: "用户名已存在" };

    await prisma.user.create({
      data: {
        username,
        name,
        passwordHash: await bcrypt.hash(input.password, 10),
        role: input.role,
      },
    });
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "创建失败" };
  }
}

/** 改角色（ADMIN）；不能降级自己 */
export async function setUserRole(
  id: string,
  role: "ADMIN" | "STAFF",
): Promise<ActionResult> {
  try {
    const me = await requireAdmin();
    if (me.id === id && role === "STAFF") {
      return { ok: false, error: "不能把自己的管理员角色降级" };
    }
    await prisma.user.update({ where: { id }, data: { role } });
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "操作失败" };
  }
}

/** 停用/启用（ADMIN）；不能停用自己，不能停用最后一个 ACTIVE ADMIN */
export async function setUserActive(
  id: string,
  next: boolean,
): Promise<ActionResult> {
  try {
    const me = await requireAdmin();
    if (me.id === id && !next) {
      return { ok: false, error: "不能停用自己" };
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return { ok: false, error: "用户不存在" };

    if (!next && target.role === "ADMIN" && target.isActive) {
      const activeAdmins = await prisma.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdmins <= 1) {
        return { ok: false, error: "不能停用最后一个在用的管理员" };
      }
    }

    await prisma.user.update({ where: { id }, data: { isActive: next } });
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "操作失败" };
  }
}

/** 重置密码（ADMIN） */
export async function resetUserPassword(
  id: string,
  newPassword: string,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    if (newPassword.length < 6) {
      return { ok: false, error: "密码至少 6 位" };
    }
    await prisma.user.update({
      where: { id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "重置失败" };
  }
}
