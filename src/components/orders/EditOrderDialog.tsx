"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import {
  fetchEditPurchaseOrderData,
  fetchEditSaleOrderData,
} from "@/actions/order-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { PurchaseOrderForm } from "@/components/orders/PurchaseOrderForm";
import { SaleOrderForm } from "@/components/orders/SaleOrderForm";
import type { PartOption } from "@/components/parts/PartPicker";

type SavedResult = { id?: string; orderNo?: string };

type EditFormData<T> =
  | { error: string }
  | {
      error?: undefined;
      parts: PartOption[];
      paymentMethodHistory: string[];
      initial: T;
    };

type EditFormDataValue<T> = Extract<EditFormData<T>, { error?: undefined }>;

/** 修改单弹窗：详情页触发按钮 + 懒加载表单数据；保存成功关弹窗（页面由 revalidatePath 刷新） */
function EditOrderDialog<T>({
  fetcher,
  renderForm,
  disabled,
  disabledReason,
}: {
  fetcher: () => Promise<EditFormData<T>>;
  renderForm: (
    data: EditFormDataValue<T>,
    onSaved: (result: SavedResult) => void,
  ) => React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EditFormDataValue<T> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = useCallback(() => {
    // 每次打开都现查：单据可能已被并发修改，配件清单/库存也保持新鲜。
    // 先清旧数据让表单卸载——非受控输入的 defaultValue 不随数据更新，
    // 不清空的话下次打开会先闪出上一次的旧表单
    setData(null);
    setLoading(true);
    fetcher()
      .then((res) => {
        if (res.error || !("initial" in res)) {
          toast.error(res.error ?? "加载单据失败");
          setOpen(false);
          return;
        }
        setData(res);
      })
      .catch(() => toast.error("加载单据失败，请重试"))
      .finally(() => setLoading(false));
  }, [fetcher]);

  const onSaved = useCallback((result: SavedResult) => {
    setOpen(false);
    toast.success(`已修改 ${result.orderNo ?? "单据"}`);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) handleOpen();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Pencil className="size-4" />
          修改
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>修改单据</DialogTitle>
          <DialogDescription>
            {disabled && disabledReason
              ? disabledReason
              : "单号与录单人不变；库存和成本按重放重算，其他单据不受影响。"}
          </DialogDescription>
        </DialogHeader>
        {loading && !data ? (
          <div className="grid gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : data ? (
          renderForm(data, onSaved)
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function EditSaleOrderDialog({
  orderId,
  disabled,
  disabledReason,
}: {
  orderId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <EditOrderDialog
      fetcher={() => fetchEditSaleOrderData(orderId)}
      renderForm={(data, onSaved) => (
        <SaleOrderForm
          parts={data.parts}
          initial={data.initial}
          paymentMethodHistory={data.paymentMethodHistory}
          onSaved={onSaved}
        />
      )}
      disabled={disabled}
      disabledReason={disabledReason}
    />
  );
}

export function EditPurchaseOrderDialog({
  orderId,
}: {
  orderId: string;
}) {
  return (
    <EditOrderDialog
      fetcher={() => fetchEditPurchaseOrderData(orderId)}
      renderForm={(data, onSaved) => (
        <PurchaseOrderForm
          parts={data.parts}
          initial={data.initial}
          paymentMethodHistory={data.paymentMethodHistory}
          onSaved={onSaved}
        />
      )}
    />
  );
}
