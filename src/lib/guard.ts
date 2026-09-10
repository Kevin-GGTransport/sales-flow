import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name?: string | null;
  role: "ADMIN" | "STAFF";
};

/** 供 Server Action 使用：未登录抛错（调用方捕获后返回统一错误） */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("未登录或会话已过期，请重新登录");
  }
  return {
    id: session.user.id,
    name: session.user.name,
    role: session.user.role,
  };
}

/** 供 Server Action 使用：仅管理员 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("该操作需要管理员权限");
  }
  return user;
}
