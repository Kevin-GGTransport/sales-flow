import { cn } from "@/lib/utils";

/**
 * 账页卡：白底 + 边框 + 极微投影的「账页」，铺在纸感底色（桌面）上。
 * 可选「标题条 + 内容」结构——传 title 时渲染标题条（左侧 title 可含图标/徽章，右侧 actions 如按钮组），
 * 不传时是纯内容账页（表格区直接入页）。
 */
export function TablePanel({
  title,
  actions,
  children,
  className,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border bg-card shadow-xs", className)}>
      {title !== undefined && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3 font-heading text-sm font-medium">
          <span className="flex min-w-0 flex-wrap items-center gap-2">{title}</span>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}
