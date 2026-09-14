import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const VALUE_SIZE = { sm: "text-lg", md: "text-xl", lg: "text-2xl" } as const;
const LABEL_SIZE = { xs: "text-xs", sm: "text-sm" } as const;

/**
 * 统计数字卡（台账惯例：mono 金额 + 小灰标签）。
 * 服务端组件，各列表页汇总栏共用；href 存在时整卡可点（hover 阴影）。
 */
export function StatCard({
  label,
  value,
  href,
  tone = "default",
  size = "md",
  labelSize = "xs",
  /** 台账金额/计数默认 mono + tracking-tight；配件详情等普通数字关掉 */
  mono = true,
  children,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  href?: string;
  tone?: "default" | "destructive";
  size?: keyof typeof VALUE_SIZE;
  labelSize?: keyof typeof LABEL_SIZE;
  mono?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  const card = (
    <Card className={cn(href && "transition-shadow group-hover:shadow-md", className)}>
      <CardHeader className="pb-2">
        <CardTitle
          className={cn(
            "font-medium text-muted-foreground",
            LABEL_SIZE[labelSize],
          )}
        >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "font-semibold",
            VALUE_SIZE[size],
            mono && "font-mono tracking-tight",
            tone === "destructive" && "text-destructive",
          )}
        >
          {value}
        </p>
        {children}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="group">
        {card}
      </Link>
    );
  }
  return card;
}
