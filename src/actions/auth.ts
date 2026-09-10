"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { error: "请输入用户名和密码" };
  }
  try {
    await signIn("credentials", { username, password, redirectTo: "/" });
  } catch (error) {
    // signIn 的 redirect 是通过抛错实现的，必须原样上抛
    if (error instanceof AuthError) {
      return { error: "用户名或密码错误" };
    }
    throw error;
  }
  return {};
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
