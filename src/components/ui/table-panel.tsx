import { cn } from "@/lib/utils";

/**
 * 面板容器：圆角边框 + 「标题条 + 内容」结构，全站列表区块共用。
 * 标题条左侧 title（可含图标/徽章），右侧 actions（如按钮组）。
 */
export function TablePanel({
  title,
  actions,
  children,
  className,
}: {
  title: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 text-sm font-medium">
        <span className="flex min-w-0 flex-wrap items-center gap-2">{title}</span>
        {actions}
      </div>
      {children}
    </div>
  );
}
