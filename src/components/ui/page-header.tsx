import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * 页头：宋体 h1 + 深绿竖墨条（全站唯一 h1 锚点装饰）。
 * back 是「← 卖出单」式返回链接；meta 是 h1 右侧徽章（状态/开票号）；
 * actions 是整行右侧按钮组。
 */
export function PageHeader({
  title,
  back,
  meta,
  actions,
  className,
}: {
  title: React.ReactNode;
  back?: { href: string; label: string };
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {back && (
          <Link
            href={back.href}
            className="text-sm text-muted-foreground hover:underline"
          >
            {back.label}
          </Link>
        )}
        <h1 className="border-s-2 border-primary ps-3 font-heading text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        {meta}
      </div>
      {actions}
    </div>
  );
}
