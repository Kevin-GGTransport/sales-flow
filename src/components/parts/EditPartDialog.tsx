"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PartForm, type PartFormValues } from "@/components/parts/PartForm";

export function EditPartDialog({ initial }: { initial: PartFormValues }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="size-4" />
          编辑
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>编辑配件</DialogTitle>
          <DialogDescription>
            修改档案信息；已发生的单据不受影响。
          </DialogDescription>
        </DialogHeader>
        <PartForm initial={initial} />
      </DialogContent>
    </Dialog>
  );
}
