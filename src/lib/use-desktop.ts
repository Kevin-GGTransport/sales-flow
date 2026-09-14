"use client";

import { useSyncExternalStore } from "react";

/**
 * 桌面/笔记本模式判定：≥1441px 渲染表格，≤1440px 渲染卡片。
 * 断点值必须与 globals.css 的 --breakpoint-laptop 保持一致（两处互指）。
 * SSR 恒为 true（先渲染表格侧，hydration 后视口不符则同步切到卡片，无闪烁）。
 */
const QUERY = "(min-width: 1441px)";

let mql: MediaQueryList | null = null;

function getMql(): MediaQueryList {
  if (!mql) mql = window.matchMedia(QUERY);
  return mql;
}

function subscribe(cb: () => void) {
  const query = getMql();
  query.addEventListener("change", cb);
  return () => query.removeEventListener("change", cb);
}

const getSnapshot = () => getMql().matches;
const getServerSnapshot = () => true;

export function useIsDesktop() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
