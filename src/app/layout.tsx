import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Serif_SC } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 宋体：标题/卡片题的票据感（Noto Serif SC = 思源宋体，与 PDF 用的思源黑体同族）
const notoSerifSC = Noto_Serif_SC({
  variable: "--font-display",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  preload: false,
});

export const metadata: Metadata = {
  title: "sales-flow",
  description: "汽车配件买卖 · 库存 · 销账 · 开票",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-CN"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSerifSC.variable} h-full antialiased`}
      // 浏览器扩展会在注水前往 <html> 打标记（如 data-redeviation-bs-uid），
      // 触发属性级 hydration mismatch 警告；只压制本元素，不影响子树真错误上报
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
