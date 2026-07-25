/**
 * 正式站禁止「預覽模式」直接發放權益（遊戲／打賞／支持者）。
 * 僅本機或明確 PLATFORM_PREVIEW_MODE=true 的非 production 環境可開。
 */
export function allowPlatformPreviewGrant(): boolean {
  if (process.env.VERCEL_ENV === "production") {
    return false;
  }
  const previewFlag = process.env.PLATFORM_PREVIEW_MODE?.trim().toLowerCase();
  if (previewFlag === "true") return true;
  if (previewFlag === "false") return false;
  return process.env.NODE_ENV !== "production";
}
