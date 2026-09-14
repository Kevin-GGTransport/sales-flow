import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 重 CJS 包不打包进 route bundle（@react-pdf/renderer 仅发票 PDF route 用；
  // bcryptjs 仅登录 action 用），避免每次编译/加载这些依赖的打包开销
  serverExternalPackages: ["@react-pdf/renderer", "bcryptjs"],
};

export default nextConfig;
