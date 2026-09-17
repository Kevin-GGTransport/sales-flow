import { Badge } from "@/components/ui/badge";

export type PartKindValue = "OWNED" | "CONSIGNMENT" | "CUSTODY";

export const PART_KIND_LABEL: Record<PartKindValue, string> = {
  OWNED: "自营",
  CONSIGNMENT: "寄卖",
  CUSTODY: "代保管",
};

export function PartKindBadge({ kind }: { kind: PartKindValue }) {
  return (
    <Badge variant={kind === "OWNED" ? "secondary" : "outline"}>
      {PART_KIND_LABEL[kind]}
    </Badge>
  );
}
