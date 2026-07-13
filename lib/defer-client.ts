/** 延後非關鍵客戶端工作，讓首屏先完成渲染。 */
export function deferClientTask(task: () => void, timeoutMs = 2_500) {
  if (typeof window === "undefined") return () => undefined;

  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(task, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }

  const id = globalThis.setTimeout(task, Math.min(timeoutMs, 800));
  return () => globalThis.clearTimeout(id);
}
