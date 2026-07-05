/** 平台 iframe 嵌入：補丁登入頁矮視窗版面（無需創作者重傳 zip） */
const EMBED_LAYOUT_STYLE = `<style id="nexusplay-embed-layout">
html.void-in-iframe #screen-auth:not(.hidden){
  height:auto!important;min-height:100%!important;max-height:none!important;
  overflow-x:hidden!important;overflow-y:auto!important;
  align-items:flex-start!important;justify-content:flex-start!important;
  padding:max(44px,env(safe-area-inset-top,0)) 10px 16px!important;
  box-sizing:border-box!important;background:#060613!important;
}
html.void-in-iframe #screen-auth .auth-stage{
  grid-template-columns:1fr!important;min-height:0!important;height:auto!important;
  padding:32px 6px 12px!important;gap:10px!important;align-items:stretch!important;
}
html.void-in-iframe #screen-auth .auth-wing--left,
html.void-in-iframe #screen-auth .auth-wing--right{display:none!important}
html.void-in-iframe #screen-auth .auth-center,
html.void-in-iframe #screen-auth .auth-box{grid-column:1!important;width:100%!important;max-width:min(420px,100%)!important;margin-inline:auto!important}
html.void-in-iframe #screen-auth .auth-preview-mount--featured,
html.void-in-iframe #screen-auth .auth-tilt-hint{display:none!important}
html.void-in-iframe #screen-auth .auth-hero-copy{margin:0 0 6px!important}
html.void-in-iframe #screen-auth .auth-title{font-size:clamp(1.35rem,5vw,1.85rem)!important}
html.void-in-iframe body.auth-gate-active #screen-app,
html.void-in-iframe body.auth-gate-active #hero-welcome{
  visibility:hidden!important;opacity:0!important;pointer-events:none!important;
}
@media (max-height:720px){
  html.void-in-iframe #screen-auth .auth-preview-mount--featured,
  html.void-in-iframe #screen-auth .auth-tilt-hint{display:none!important}
  html.void-in-iframe #screen-auth .auth-wing--left,
  html.void-in-iframe #screen-auth .auth-wing--right{display:none!important}
}
</style>`;

export function patchHtmlForPlatformEmbed(html: string) {
  if (!html.includes("<html") || html.includes('id="nexusplay-embed-layout"')) {
    return html;
  }
  const critical = '<style id="void-critical-embed">';
  if (html.includes(critical)) {
    return html.replace(critical, EMBED_LAYOUT_STYLE + critical);
  }
  return html.replace(/<head>/i, `<head>${EMBED_LAYOUT_STYLE}`);
}
