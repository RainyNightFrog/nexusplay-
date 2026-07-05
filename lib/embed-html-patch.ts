/** 平台 iframe 嵌入：啟動腳本 + 登入頁置中（無需創作者重傳 zip 即可生效） */
const EMBED_BOOT_SCRIPT = `<script id="nexusplay-embed-boot">
(function(){
  window.VOID_BUILD_TARGET='';
  window.VOID_PORTAL_EMBED=true;
  window.VOID_API_ORIGIN='https://void-gacha.com';
  document.documentElement.classList.add('void-portal-embed','void-in-iframe');
})();
</script>`;

const EMBED_LAYOUT_STYLE = `<style id="nexusplay-embed-layout">
html.void-portal-embed #screen-auth:not(.hidden){
  display:flex!important;align-items:center!important;justify-content:center!important;
  height:100%!important;min-height:100%!important;max-height:none!important;
  overflow-x:hidden!important;overflow-y:auto!important;
  padding:max(40px,env(safe-area-inset-top,0)) 12px 16px!important;
  box-sizing:border-box!important;background:#060613!important;
}
html.void-portal-embed #screen-auth .auth-stage{
  display:flex!important;flex-direction:column!important;align-items:center!important;
  width:100%!important;max-width:min(420px,100%)!important;margin:0 auto!important;
  min-height:0!important;height:auto!important;padding:24px 0 12px!important;gap:12px!important;
}
html.void-portal-embed #screen-auth .auth-wing--left,
html.void-portal-embed #screen-auth .auth-wing--right,
html.void-portal-embed #screen-auth .auth-preview-mount--featured,
html.void-portal-embed #screen-auth .auth-tilt-hint{display:none!important}
html.void-portal-embed #screen-auth .auth-center,
html.void-portal-embed #screen-auth .auth-box{
  width:100%!important;max-width:100%!important;margin:0!important;
}
html.void-portal-embed #screen-auth .auth-hero-copy{text-align:center!important;margin:0 0 8px!important}
html.void-portal-embed #screen-auth .auth-title{font-size:clamp(1.35rem,5vw,1.85rem)!important}
html.void-portal-embed body.auth-gate-active #screen-app,
html.void-portal-embed body.auth-gate-active #hero-welcome{
  visibility:hidden!important;opacity:0!important;pointer-events:none!important;
}
html.void-portal-embed #portal-google-hint{
  margin:12px 0 0!important;font-size:12px!important;line-height:1.5!important;color:rgba(220,230,255,.78)!important;
}
html.void-portal-embed #portal-google-hint a{color:#7dd3fc!important;text-decoration:underline!important}
</style>`;

const EMBED_GOOGLE_HINT = `<p id="portal-google-hint" class="auth-hint auth-setup-hint">平台試玩請用 Email 登入或註冊（雲端同步 void-gacha.com）；Google 登入請<a href="https://void-gacha.com/" target="_blank" rel="noopener noreferrer">前往官網</a>。</p>`;

export function patchHtmlForPlatformEmbed(html: string) {
  if (!html.includes("<html") || html.includes('id="nexusplay-embed-boot"')) {
    return html;
  }

  let out = html;

  if (out.includes("<head>")) {
    out = out.replace("<head>", `<head>${EMBED_BOOT_SCRIPT}`);
  }

  const critical = '<style id="void-critical-embed">';
  if (out.includes(critical)) {
    out = out.replace(critical, EMBED_LAYOUT_STYLE + critical);
  } else {
    out = out.replace(/<head>/i, `<head>${EMBED_LAYOUT_STYLE}`);
  }

  if (!out.includes('id="portal-google-hint"')) {
    out = out.replace(
      /<div class="auth-footer-block">/i,
      `${EMBED_GOOGLE_HINT}\n                <div class="auth-footer-block">`
    );
  }

  return out;
}
