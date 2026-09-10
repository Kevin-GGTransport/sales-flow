"use client";

import { useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type PartOption = {
  id: string;
  partNumber: string;
  name: string;
  brand?: string | null;
  isConsignment: boolean;
  qty: number;
};

export function PartPicker({
  parts,
  value,
  onChange,
  allowConsignment,
  placeholder = "选择配件",
}: {
  parts: PartOption[];
  value: string;
  onChange: (partId: string) => void;
  allowConsignment?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parts.find((p) => p.id === value), [parts, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate">{selected.partNumber}</span>
              <span className="truncate text-muted-foreground">{selected.name}</span>
              {selected.isConsignment && <Badge variant="outline">寄卖</Badge>}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索配件号 / 名称 / 品牌" />
          <CommandList>
            <CommandEmpty>没有匹配的配件</CommandEmpty>
            <CommandGroup>
              {parts.map((part) => {
                const disabled = part.isConsignment && !allowConsignment;
                return (
                  <CommandItem
                    key={part.id}
                    value={`${part.partNumber} ${part.name} ${part.brand ?? ""}`}
                    disabled={disabled}
                    onSelect={() => {
                      onChange(part.id);
                      setOpen(false);
                    }}
                  >
                    <span className="font-medium">{part.partNumber}</span>
                    <span className="truncate text-muted-foreground">{part.name}</span>
                    {part.isConsignment && (
                      <Badge variant="outline" className="ml-auto">
                        {disabled ? "寄卖·不可买入" : "寄卖"}
                      </Badge>
                    )}
                    {!part.isConsignment && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        库存 {part.qty}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
