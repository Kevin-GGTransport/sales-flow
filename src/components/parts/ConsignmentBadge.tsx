import { Badge } from "@/components/ui/badge";

/** 寄卖 / 自营 类型徽章（库存、配件、详情、报表共用口径：寄卖=outline，自营=secondary） */
export function ConsignmentBadge({ isConsignment }: { isConsignment: boolean }) {
  return isConsignment ? (
    <Badge variant="outline">寄卖</Badge>
  ) : (
    <Badge variant="secondary">自营</Badge>
  );
}
