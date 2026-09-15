import { Skeleton } from "@/components/ui/skeleton";
import { TablePanel } from "@/components/ui/table-panel";

/** 路由级骨架（账本风格：标题条 + 统计卡位 + 双线表头占位） */
export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="加载中">
      <Skeleton className="h-8 w-40" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card py-4 shadow-xs">
            <Skeleton className="mx-4 h-3 w-24" />
            <Skeleton className="mx-4 mt-3 h-7 w-20" />
          </div>
        ))}
      </div>

      <TablePanel
        title={<Skeleton className="h-4 w-28" />}
      >
        {/* 会计双线表头占位 */}
        <div className="border-b-[3px] border-double bg-table-head">
          <Skeleton className="m-3 h-4 w-full" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="m-3 h-8 w-full" />
        ))}
      </TablePanel>
    </div>
  );
}
