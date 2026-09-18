"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight, KeyRound, LoaderCircle, UserRound } from "lucide-react";
import { loginAction, type LoginState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    {},
  );

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-2.5">
        <Label htmlFor="username" className="text-xs font-medium tracking-wide text-[#344d43]">用户名</Label>
        <div className="relative">
          <UserRound aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#809087]" strokeWidth={1.7} />
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoFocus
          required
          aria-invalid={Boolean(state.error)}
          placeholder="请输入用户名"
          className="h-12 rounded-md border-[#cbd5ce] bg-white pl-10 pr-4 text-[15px] shadow-[0_1px_0_rgba(20,58,45,.04)] placeholder:text-[#a4aea8] focus-visible:border-[#24664e] focus-visible:ring-[#24664e]/15"
        />
        </div>
      </div>
      <div className="grid gap-2.5">
        <Label htmlFor="password" className="text-xs font-medium tracking-wide text-[#344d43]">密码</Label>
        <div className="relative">
          <KeyRound aria-hidden="true" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#809087]" strokeWidth={1.7} />
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.error)}
          placeholder="请输入密码"
          className="h-12 rounded-md border-[#cbd5ce] bg-white pl-10 pr-4 text-[15px] shadow-[0_1px_0_rgba(20,58,45,.04)] placeholder:text-[#a4aea8] focus-visible:border-[#24664e] focus-visible:ring-[#24664e]/15"
        />
        </div>
      </div>
      {state.error ? (
        <p role="alert" aria-live="polite" className="flex items-center gap-2 rounded-md border border-[#dba9a9] bg-[#fff5f4] px-3 py-2.5 text-sm text-[#a53535]"><AlertCircle className="size-4 shrink-0" />{state.error}</p>
      ) : null}
      <Button type="submit" size="lg" className="mt-1 h-12 rounded-md bg-[#173f32] px-5 text-sm font-medium tracking-wide text-white shadow-[0_8px_20px_rgba(23,63,50,.2)] hover:bg-[#245846] focus-visible:ring-[#173f32]/25 disabled:shadow-none" disabled={pending}>
        {pending ? <><LoaderCircle className="animate-spin" />正在登录…</> : <><span>进入系统</span><ArrowRight className="ml-auto transition-transform group-hover/button:translate-x-0.5" /></>}
      </Button>
    </form>
  );
}
