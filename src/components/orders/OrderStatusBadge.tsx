import { Badge } from "@/components/ui/badge";

export function OrderStatusBadge({ status }: { status: "ACTIVE" | "VOID" }) {
  return status === "ACTIVE" ? (
    <Badge>有效</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      已作废
    </Badge>
  );
}
