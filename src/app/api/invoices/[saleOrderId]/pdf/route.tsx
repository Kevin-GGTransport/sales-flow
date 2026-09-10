import { renderToBuffer } from "@react-pdf/renderer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoiceDocument } from "@/lib/pdf/invoice-document";
import { formatDateString } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ saleOrderId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { saleOrderId } = await params;
  const order = await prisma.saleOrder.findUnique({
    where: { id: saleOrderId },
    include: { lines: { include: { part: true } } },
  });
  if (!order || !order.invoiceNo || order.status !== "ACTIVE") {
    return new Response("Invoice not found", { status: 404 });
  }

  const buffer = await renderToBuffer(
    <InvoiceDocument
      data={{
        invoiceNo: order.invoiceNo,
        invoiceDate: formatDateString(order.invoiceDate),
        customerName: order.customerName,
        customerContact: order.customerContact ?? "",
        lines: order.lines.map((l) => ({
          partNumber: l.part.partNumber,
          description: l.part.name,
          qty: l.qty,
          unitPrice: l.unitPrice.toString(),
          lineTotal: l.lineTotal.toString(),
        })),
        total: order.totalAmount.toString(),
      }}
    />,
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${order.invoiceNo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
