import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * 列表页 GET 筛选表单壳：搜索框/下拉/勾选自由组合 + 提交按钮。
 * hidden 用于在搜索时保留当前 pill 筛选状态（如 filter/owner）。
 */
export function ListFilterForm({
  hidden,
  submitLabel = "筛选",
  children,
}: {
  hidden?: Record<string, string | undefined>;
  submitLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <form className="flex flex-wrap items-center gap-2">
      {Object.entries(hidden ?? {}).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      {children}
      <Button type="submit" variant="secondary">
        {submitLabel}
      </Button>
    </form>
  );
}

/** 单据状态筛选（卖出/买入列表共用，选项文案统一） */
export function StatusSelect({
  name = "status",
  defaultValue = "ACTIVE",
  className = "w-28",
}: {
  name?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <Select name={name} defaultValue={defaultValue}>
      <SelectTrigger className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ACTIVE">有效</SelectItem>
        <SelectItem value="VOID">已作废</SelectItem>
        <SelectItem value="ALL">全部</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** 「显示已停用」勾选（配件/代保管列表共用） */
export function ShowInactiveCheckbox({
  defaultChecked,
}: {
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <input
        type="checkbox"
        name="showInactive"
        value="1"
        defaultChecked={defaultChecked}
        className="size-4 accent-(--color-primary)"
      />
      显示已停用
    </label>
  );
}
