"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  fetchNewPurchaseOrderData,
  fetchNewSaleOrderData,
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

type NewOrderData = Awaited<ReturnType<typeof fetchNewSaleOrderData>>;

type SavedResult = { id?: string; orderNo?: string };

/** 新建单弹窗：页头触发按钮 + 懒加载表单数据；保存成功关弹窗并通知（列表由 revalidatePath 刷新） */
function NewOrderDialog({
  kind,
  label,
  fetcher,
  form,
}: {
  kind: "sale" | "purchase";
  label: string;
  fetcher: () => Promise<NewOrderData>;
  form: (
    data: NewOrderData,
    onSaved: (result: SavedResult) => void,
  ) => React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NewOrderData | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = useCallback(() => {
    // 每次打开都现查：配件清单 / 库存 / 付款方式建议保持新鲜
    setLoading(true);
    fetcher()
      .then(setData)
      .catch(() => toast.error("加载配件清单失败，请重试"))
      .finally(() => setLoading(false));
  }, [fetcher]);

  const onSaved = useCallback(
    (result: SavedResult) => {
      setOpen(false);
      const href =
        result.id &&
        (kind === "sale" ? `/sales/${result.id}` : `/purchases/${result.id}`);
      toast.success(`已创建 ${result.orderNo ?? label}`, {
        action: href
          ? { label: "查看", onClick: () => router.push(href) }
          : undefined,
      });
    },
    [kind, label, router],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) handleOpen();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">{label}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            保存后留在本页，可点通知里的「查看」进详情。
          </DialogDescription>
        </DialogHeader>
        {loading && !data ? (
          <div className="grid gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : data ? (
          form(data, onSaved)
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function NewSaleOrderDialog() {
  return (
    <NewOrderDialog
      kind="sale"
      label="新建卖出单"
      fetcher={fetchNewSaleOrderData}
      form={(data, onSaved) => (
        <SaleOrderForm
          parts={data.parts}
          paymentMethodHistory={data.paymentMethodHistory}
          onSaved={onSaved}
        />
      )}
    />
  );
}

export function NewPurchaseOrderDialog() {
  return (
    <NewOrderDialog
      kind="purchase"
      label="新建买入单"
      fetcher={fetchNewPurchaseOrderData}
      form={(data, onSaved) => (
        <PurchaseOrderForm
          parts={data.parts}
          paymentMethodHistory={data.paymentMethodHistory}
          onSaved={onSaved}
        />
      )}
    />
  );
}
