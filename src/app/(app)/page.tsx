import { auth } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await auth();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight">仪表盘</h1>
      <p className="text-sm text-muted-foreground">
        你好，{session?.user?.name ?? ""}。概览卡片将在后续步骤补齐。
      </p>
    </div>
  );
}
