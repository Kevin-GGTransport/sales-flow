"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

export type ActionMutation = { ok: boolean; error?: string };

/**
 * 弹窗型 mutation 样板收口：open / pending / error 三态 + 提交执行。
 * 不传参数时自带 open 状态（配 DialogTrigger 自管理，如详情页头部的按钮）；
 * 传 controlled 时由持有方控制开关（列表行内单例弹窗：target 行 + key 重挂载）。
 *
 * 约定：成功 → toast + 关弹窗；Server Action 使用 revalidatePath
 * 在同一往返中带回新 RSC，客户端不再重复 router.refresh()；
 * 失败 → 错误写入 error 由弹窗内联渲染（DialogFormError），不打 toast。
 */
export function useActionDialog(
  controlled?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  },
) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = controlled ? controlled.open : uncontrolledOpen;
  const setOpen = controlled ? controlled.onOpenChange : setUncontrolledOpen;

  const run = useCallback(
    async (fn: () => Promise<ActionMutation>, successToast?: string) => {
      setPending(true);
      setError(null);
      const result = await fn();
      setPending(false);
      if (!result.ok) {
        setError(result.error ?? "操作失败");
        return false;
      }
      if (successToast) toast.success(successToast);
      setOpen(false);
      return true;
    },
    [setOpen],
  );

  return { open, setOpen, pending, error, run };
}

/**
 * 非弹窗的行内直接动作（如停用/启用按钮）：成功 toast，失败 toast。
 * run 引用稳定，可安全放进列定义的 useMemo 依赖。
 */
export function useActionRun() {
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<ActionMutation>, successToast?: string) => {
      setPending(true);
      const result = await fn();
      setPending(false);
      if (!result.ok) {
        toast.error(result.error ?? "操作失败");
        return false;
      }
      if (successToast) toast.success(successToast);
      return true;
    },
    [],
  );

  return { pending, run };
}

/** 弹窗内联错误行（useActionDialog 的 error 渲染端） */
export function DialogFormError({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return <p className="text-sm text-destructive">{msg}</p>;
}
