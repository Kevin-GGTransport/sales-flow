import { auth, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDateString } from "@/lib/validation";
import { InvoiceBoard } from "@/components/invoices/InvoiceBoard";

/** 结算中心 · 开票 Tab（原 /invoices 列表主体搬迁，ADMIN 撤票权限随面板走） */
export async function InvoicesPanel() {
  const [session, uninvoicedOrders, invoicedOrders] = await Promise.all([
    auth(),
    prisma.saleOrder.findMany({
      where: { status: "ACTIVE", invoiceNo: null },
      orderBy: [{ orderDate: "asc" }, { createdAt: "asc" }],
      take: 200,
    }),
    prisma.saleOrder.findMany({
      where: { status: "ACTIVE", invoiceNo: { not: null } },
      orderBy: { invoicedAt: "desc" },
      take: 200,
    }),
  ]);

  return (
    <InvoiceBoard
      isAdmin={isAdmin(session)}
      uninvoiced={uninvoicedOrders.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        orderDate: formatDateString(o.orderDate),
        customerName: o.customerName,
        totalAmount: o.totalAmount.toString(),
      }))}
      invoiced={invoicedOrders.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        invoiceNo: o.invoiceNo!,
        invoiceDate: formatDateString(o.invoiceDate),
        customerName: o.customerName,
        totalAmount: o.totalAmount.toString(),
      }))}
    />
  );
}
