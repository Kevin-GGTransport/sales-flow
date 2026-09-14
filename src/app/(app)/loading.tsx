import { Skeleton } from "@/components/ui/skeleton";

/** 路由级骨架（账本风格：标题条 + 统计卡位 + 双线表头占位） */
export default function AppLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="加载中">
      <Skeleton className="h-8 w-40" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-card py-4 ring-1 ring-foreground/10">
            <Skeleton className="mx-4 h-3 w-24" />
            <Skeleton className="mx-4 mt-3 h-7 w-20" />
          </div>
        ))}
      </div>

      <div className="rounded-lg border">
        {/* 会计双线表头占位 */}
        <div className="border-b p-3">
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="border-b-[3px] border-double">
          <Skeleton className="m-3 h-4 w-full" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="m-3 h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
