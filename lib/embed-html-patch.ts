import { buildNexusPlayEmbedSdkScript } from "@/lib/nexusplay-embed-sdk";
import { NEXUS_SCROLLBAR_STYLE_TAG } from "@/lib/nexus-scrollbar-css";

function ensureScrollbarStyle(html: string) {
  if (html.includes('id="nexusplay-scrollbar"')) return html;
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${NEXUS_SCROLLBAR_STYLE_TAG}`);
  }
  return html.replace(/<head[^>]*>/i, (match) => `${match}${NEXUS_SCROLLBAR_STYLE_TAG}`);
}

/** void-gacha 專用：登入頁置中（無需創作者重傳 zip 即可生效） */
const VOID_EMBED_BOOT_SCRIPT = `<script id="nexusplay-embed-boot">
(function(){
  window.VOID_BUILD_TARGET='';
  window.VOID_PORTAL_EMBED=true;
  window.VOID_API_ORIGIN='https://void-gacha.com';
  document.documentElement.classList.add('void-portal-embed','void-in-iframe');
})();
</script>`;

const VOID_EMBED_LAYOUT_STYLE = `<style id="nexusplay-embed-layout">
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

const VOID_EMBED_GOOGLE_HINT = `<p id="portal-google-hint" class="auth-hint auth-setup-hint">此遊戲建議使用平台帳號（遊戲頁上方登入 Google / Email）與 <code>NexusPlay.loadSave()</code> 雲端存檔；若需 void-gacha 原生 Google 登入請<a href="https://void-gacha.com/" target="_blank" rel="noopener noreferrer">前往官網</a>。</p>`;

function isVoidGachaHtml(html: string) {
  return (
    html.includes("screen-auth") ||
    html.includes("void-critical-embed") ||
    html.includes("VOID_PORTAL")
  );
}

function isCoreDefenseHtml(html: string) {
  return html.includes('id="gameScreen"') && html.includes("canvas-wrap");
}

const CORE_DEFENSE_EMBED_LAYOUT_STYLE = `<style id="nexusplay-core-defense-layout">
html.in-game,html.in-game body{height:100%!important;overflow:hidden!important}
html.in-game body{display:flex!important;flex-direction:column!important}
html.in-game .screen.active{flex:1!important;min-height:0!important;width:100%!important}
#gameScreen.active{justify-content:center!important;align-items:center!important;padding:.35rem .45rem .5rem!important;overflow:hidden!important;height:100%!important;min-height:0!important;flex:1!important}
.game-wrap{display:flex!important;flex-direction:column!important;align-items:stretch!important;width:100%!important;max-width:min(960px,100%)!important;height:100%!important;max-height:100%!important;min-height:0!important}
.top-bar,.toolbar{flex-shrink:0!important}
.canvas-wrap{position:relative!important;flex:1 1 auto!important;min-height:0!important;width:100%!important;max-width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important}
.canvas-wrap canvas{width:auto!important;height:100%!important;max-width:100%!important;max-height:100%!important;aspect-ratio:4/3!important}
.wave-banner{position:absolute!important;inset:0!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important}
</style>`;

export function patchHtmlForPlatformEmbed(html: string) {
  if (!html.includes("<html") || html.includes('id="nexusplay-embed-sdk"')) {
    return html;
  }

  let out = html;
  const sdk = buildNexusPlayEmbedSdkScript();

  if (out.includes("<head>")) {
    out = out.replace("<head>", `<head>${sdk}`);
  } else {
    out = out.replace(/<head[^>]*>/i, (match) => `${match}${sdk}`);
  }

  if (!isVoidGachaHtml(out) || out.includes('id="nexusplay-embed-boot"')) {
    if (isCoreDefenseHtml(out) && !out.includes('id="nexusplay-core-defense-layout"')) {
      if (out.includes("<head>")) {
        out = out.replace("<head>", `<head>${CORE_DEFENSE_EMBED_LAYOUT_STYLE}`);
      }
    }
    return ensureScrollbarStyle(out);
  }

  if (out.includes("<head>")) {
    out = out.replace("<head>", `<head>${VOID_EMBED_BOOT_SCRIPT}`);
  }

  const critical = '<style id="void-critical-embed">';
  if (out.includes(critical)) {
    out = out.replace(critical, VOID_EMBED_LAYOUT_STYLE + critical);
  } else if (!out.includes('id="nexusplay-embed-layout"')) {
    out = out.replace(/<head>/i, `<head>${VOID_EMBED_LAYOUT_STYLE}`);
  }

  if (!out.includes('id="portal-google-hint"')) {
    out = out.replace(
      /<div class="auth-footer-block">/i,
      `${VOID_EMBED_GOOGLE_HINT}\n                <div class="auth-footer-block">`
    );
  }

  return ensureScrollbarStyle(out);
}
