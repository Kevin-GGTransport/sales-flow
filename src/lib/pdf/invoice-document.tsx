import path from "node:path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { COMPANY } from "@/lib/company";

// 思源黑体：发票里配件名可能是中文，Helvetica 编不了
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  const dir = path.join(process.cwd(), "src/lib/pdf/fonts");
  Font.register({
    family: "SourceHanSansCN",
    src: path.join(dir, "SourceHanSansCN-Regular.otf"),
  });
  Font.register({
    family: "SourceHanSansCN-Bold",
    src: path.join(dir, "SourceHanSansCN-Bold.otf"),
  });
  fontsRegistered = true;
}

export type InvoiceLineData = {
  partNumber: string;
  description: string;
  qty: number;
  unitPrice: string; // "12.50"
  lineTotal: string; // "37.50"
};

export type InvoiceData = {
  invoiceNo: string;
  invoiceDate: string; // yyyy-mm-dd
  customerName: string;
  customerContact: string;
  lines: InvoiceLineData[];
  total: string; // "150.00"
};

const usd = (s: string) => `$${Number(s).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 10, fontFamily: "SourceHanSansCN", color: "#1a1a1a" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  brand: { fontSize: 16, fontFamily: "SourceHanSansCN-Bold", color: "#15803d" },
  meta: { fontSize: 9, color: "#555" },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 18, marginBottom: 14, borderBottomWidth: 2, borderBottomColor: "#15803d", paddingBottom: 8 },
  title: { fontSize: 22, fontFamily: "SourceHanSansCN-Bold", letterSpacing: 2 },
  billTo: { fontSize: 10, lineHeight: 1.5 },
  billToLabel: { fontFamily: "SourceHanSansCN-Bold", marginBottom: 2 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f0fdf4", paddingVertical: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: "#bbf7d0", fontFamily: "SourceHanSansCN-Bold", fontSize: 9 },
  row: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 8, borderWidth: 1, borderColor: "#e5e7eb", borderTopWidth: 0, fontSize: 10 },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginTop: 10, gap: 12 },
  totalLabel: { fontFamily: "SourceHanSansCN-Bold", fontSize: 12 },
  totalValue: { fontFamily: "SourceHanSansCN-Bold", fontSize: 14, color: "#15803d" },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, textAlign: "center", fontSize: 8, color: "#888", borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingTop: 8 },
  colPart: { width: "18%" },
  colDesc: { width: "42%" },
  colQty: { width: "10%", textAlign: "right" },
  colPrice: { width: "15%", textAlign: "right" },
  colAmount: { width: "15%", textAlign: "right" },
});

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  ensureFonts();
  return (
    <Document title={`Invoice ${data.invoiceNo}`} author={COMPANY.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>{COMPANY.name}</Text>
            <Text style={styles.meta}>{COMPANY.address}</Text>
            <Text style={styles.meta}>
              {COMPANY.phone} · {COMPANY.email}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontFamily: "SourceHanSansCN-Bold" }}>INVOICE #</Text>
            <Text style={{ fontSize: 12 }}>{data.invoiceNo}</Text>
            <Text style={styles.meta}>Date: {data.invoiceDate}</Text>
          </View>
        </View>

        <View style={styles.titleRow}>
          <View style={styles.billTo}>
            <Text style={styles.billToLabel}>BILL TO</Text>
            <Text>{data.customerName}</Text>
            {data.customerContact ? <Text style={{ color: "#555" }}>{data.customerContact}</Text> : null}
          </View>
          <Text style={styles.title}>INVOICE</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colPart}>PART #</Text>
          <Text style={styles.colDesc}>DESCRIPTION</Text>
          <Text style={styles.colQty}>QTY</Text>
          <Text style={styles.colPrice}>UNIT PRICE</Text>
          <Text style={styles.colAmount}>AMOUNT</Text>
        </View>
        {data.lines.map((line, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.colPart}>{line.partNumber}</Text>
            <Text style={styles.colDesc}>{line.description}</Text>
            <Text style={styles.colQty}>{line.qty}</Text>
            <Text style={styles.colPrice}>{usd(line.unitPrice)}</Text>
            <Text style={styles.colAmount}>{usd(line.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>TOTAL (USD):</Text>
          <Text style={styles.totalValue}>{usd(data.total)}</Text>
        </View>

        <Text style={styles.footer}>
          Thank you for your business. · {COMPANY.name} · {COMPANY.phone}
        </Text>
      </Page>
    </Document>
  );
}
