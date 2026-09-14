"use client";

import { HandCoins, Trash2 } from "lucide-react";
import { deletePayment } from "@/actions/payments";
import { PAYMENT_METHOD_LABEL } from "@/lib/validation";
import { formatUSDNumber } from "@/lib/format";
import { useActionRun } from "@/lib/use-action";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddPaymentDialog } from "@/components/payments/AddPaymentDialog";
import { TablePanel } from "@/components/ui/table-panel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  EmptyRow,
} from "@/components/ui/table";

export type PaymentRow = {
  id: string;
  method: "CASH" | "CHECK" | "ONLINE";
  amount: string;
  payDate: string;
  note: string | null;
  by: string;
};

/** 单据详情页的收付款区块 */
export function PaymentsCard({
  kind,
  orderId,
  totalAmount,
  payments,
  isAdmin,
}: {
  kind: "sale" | "purchase";
  orderId: string;
  totalAmount: string;
  payments: PaymentRow[];
  isAdmin: boolean;
}) {
  const { pending, run } = useActionRun();
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const outstanding = Math.max(Number(totalAmount) - paid, 0);
  const settled = Number(totalAmount) - paid <= 0.004;

  return (
    <TablePanel
      title={
        <>
          <HandCoins className="size-4" />
          {kind === "sale" ? "收款记录" : "付款记录"}
          {settled ? (
            <Badge>已结清</Badge>
          ) : (
            <Badge variant="destructive">
              未结 {formatUSDNumber(outstanding)}
            </Badge>
          )}
        </>
      }
      actions={
        !settled ? (
          <AddPaymentDialog
            kind={kind}
            orderId={orderId}
            defaultAmount={outstanding.toFixed(2)}
          />
        ) : undefined
      }
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>日期</TableHead>
            <TableHead>方式</TableHead>
            <TableHead className="text-right">金额</TableHead>
            <TableHead>备注</TableHead>
            <TableHead>经办</TableHead>
            {isAdmin && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.length === 0 ? (
            <EmptyRow colSpan={isAdmin ? 6 : 5}>
              还没有{kind === "sale" ? "收款" : "付款"}记录
            </EmptyRow>
          ) : (
            payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.payDate}</TableCell>
                <TableCell>{PAYMENT_METHOD_LABEL[p.method]}</TableCell>
                <TableCell className="text-right tabular-nums">{formatUSDNumber(Number(p.amount))}</TableCell>
                <TableCell>{p.note ?? "-"}</TableCell>
                <TableCell>{p.by}</TableCell>
                {isAdmin && (
                  <TableCell className="w-10">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={pending}
                      onClick={() =>
                        run(() => deletePayment(p.id), "已删除")
                      }
                      aria-label="删除该笔记录"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TablePanel>
  );
}
