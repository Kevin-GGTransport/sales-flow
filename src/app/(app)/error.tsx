"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** 路由级错误边界：账目类错误（如数据库偶发池满）重试一次通常即恢复 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <h2 className="text-lg font-semibold">页面加载失败</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        可能是网络波动或数据库繁忙（偶发时重试即可恢复）。
        如果反复出现，请把下方错误信息发给管理员。
      </p>
      {error.digest && (
        <code className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
          {error.digest}
        </code>
      )}
      <Button onClick={() => reset()}>重试</Button>
    </div>
  );
}
