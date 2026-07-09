import { buildRainyNightFrogEmbedSdkScript } from "@/lib/rainynightfrog-embed-sdk";
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
  var d=document.documentElement;
  d.classList.add('void-portal-embed','void-nexusplay-embed','void-itch-embed','void-in-iframe');
  if(window.self!==window.top){
    var h=window.innerHeight||720,w=window.innerWidth||960;
    d.classList.add('np-embed-mode','void-itch-mobile-shell');
    d.classList.toggle('np-embed-compact',h<=780);
    d.classList.toggle('np-embed-gated',h<=780);
    d.style.setProperty('--np-embed-width',w+'px');
    d.style.setProperty('--np-embed-height',h+'px');
  }
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

/** void-gacha 嵌入：滾動與首頁排版（平台注入，無需重傳 zip 亦生效） */
const VOID_EMBED_SCROLL_FIX_STYLE = `<style id="nexusplay-scroll-fix">
html.void-nexusplay-embed.np-embed-mode,html.void-portal-embed.void-in-iframe.np-embed-mode{height:100%!important;min-height:0!important;overflow:hidden!important}
html.void-nexusplay-embed.np-embed-mode body,html.void-portal-embed.void-in-iframe.np-embed-mode body{height:100%!important;min-height:0!important;max-height:100%!important;overflow:hidden!important;position:relative!important}
html.void-nexusplay-embed.np-embed-mode #screen-app,html.void-portal-embed.void-in-iframe.np-embed-mode #screen-app{position:fixed!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;max-height:100%!important;min-height:0!important;overflow-x:hidden!important;overflow-y:scroll!important;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;touch-action:pan-y}
html.void-nexusplay-embed.np-embed-mode #void-app-main,html.void-portal-embed.void-in-iframe.np-embed-mode #void-app-main{overflow:visible!important;max-height:none!important;flex:none!important;min-height:min-content}
html.void-portal-embed.void-in-iframe .gacha-view.view-panel,html.void-nexusplay-embed .gacha-view.view-panel{overflow:visible!important;max-height:none!important}
html.void-portal-embed.void-in-iframe .gacha-arena,html.void-nexusplay-embed .gacha-arena,html.void-portal-embed.void-in-iframe .gacha-hub--machine,html.void-nexusplay-embed .gacha-hub--machine{min-height:0!important;max-height:none!important;overflow:visible!important}
html.void-portal-embed.void-in-iframe .void-app-main>.view-panel,html.void-nexusplay-embed .void-app-main>.view-panel{overflow:visible!important;max-height:none!important}
html.void-nexusplay-embed.np-embed-mode.void-itch-mobile-shell .home-arena:has(.home-right-rail){display:flex!important;flex-direction:column!important;gap:8px}
html.void-nexusplay-embed.np-embed-mode.void-itch-mobile-shell .home-right-rail{position:relative!important;top:auto!important;right:auto!important;order:-1;width:100%;max-width:100%;flex-direction:row;flex-wrap:wrap;justify-content:center;gap:8px;margin:0 auto 6px;padding:0 4px;z-index:2}
html.void-nexusplay-embed.np-embed-compact .home-mega-title,html.void-nexusplay-embed.np-embed-compact .home-marquee,html.void-nexusplay-embed.np-embed-compact .home-left-pillar,html.void-nexusplay-embed.np-embed-compact .home-bg-zones,html.void-nexusplay-embed.np-embed-compact .home-bg-beasts,html.void-nexusplay-embed.np-embed-compact .home-bg-tentacles,html.void-nexusplay-embed.np-embed-compact .home-bg-cards,html.void-nexusplay-embed.np-embed-compact .home-particles,html.void-nexusplay-embed.np-embed-compact .home-lightning,html.void-nexusplay-embed.np-embed-compact .home-quick,html.void-nexusplay-embed.np-embed-compact .home-collapse{display:none!important}
html.void-nexusplay-embed.void-itch-mobile-shell.np-embed-compact .mythic-rising-packs-row,html.void-nexusplay-embed.np-embed-compact .mythic-rising-packs-row{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;overflow:visible!important;flex-wrap:unset!important;scroll-snap-type:none!important}
html.void-nexusplay-embed.np-embed-compact .mythic-rising-packs-row .pack-tile{flex:none!important;width:100%!important;min-width:0!important;max-width:none!important;min-height:128px!important;height:auto!important;aspect-ratio:3/4.2}
html.void-nexusplay-embed.np-embed-mode .void-chat-panel:not(.is-hidden){width:min(400px,calc(var(--np-embed-width,100vw) - 16px));max-height:calc(var(--np-embed-height,720px) - var(--void-mobile-nav-h,58px) - 20px);font-size:15px}
html.void-nexusplay-embed.np-embed-mode .void-chat-panel:not(.is-hidden):not(.is-collapsed){--void-chat-h:min(560px,calc(var(--np-embed-height,720px) - var(--void-mobile-nav-h,58px) - 28px));height:var(--void-chat-h);min-height:min(400px,calc(var(--np-embed-height,720px) - var(--void-mobile-nav-h,58px) - 28px))}
html.void-nexusplay-embed.np-embed-mode .side-mode-modal{max-height:min(calc(var(--np-embed-height,720px) - 12px),96dvh)!important;height:min(calc(var(--np-embed-height,720px) - 12px),96dvh)!important}
html.void-nexusplay-embed.np-embed-mode .side-mode-body{min-height:0!important;overflow-y:auto!important}
html.np-embed-gated #screen-app{pointer-events:none!important;filter:blur(3px) brightness(.45)}
html.np-embed-gated .void-itch-nav-dock,html.np-embed-gated .void-chat-panel{pointer-events:none!important;opacity:.35}
.np-embed-expand-gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,2,14,.72)}
.np-embed-expand-gate[hidden]{display:none!important}
.np-embed-expand-gate__panel{width:min(420px,100%);padding:22px 20px;border-radius:18px;border:1px solid rgba(78,240,255,.35);background:rgba(12,8,28,.96);text-align:center;color:#f5ecff}
.np-embed-expand-gate__btn{margin-top:12px;min-height:44px;padding:10px 18px;border-radius:12px;border:1px solid rgba(78,240,255,.45);background:rgba(78,240,255,.15);color:#ecfeff;font-weight:700;cursor:pointer}
</style>`;

const VOID_EMBED_GOOGLE_HINT = `<p id="portal-google-hint" class="auth-hint auth-setup-hint">此遊戲建議使用平台帳號（遊戲頁上方登入 Google / Email）與 <code>RainyNightFrog.loadSave()</code> 雲端存檔；若需 void-gacha 原生 Google 登入請<a href="https://void-gacha.com/" target="_blank" rel="noopener noreferrer">前往官網</a>。</p>`;

const VOID_PORTAL_CDN_SCRIPT = `<script id="void-portal-cdn-art">
(function(){
  window.VOID_PORTAL_EMBED=window.VOID_PORTAL_EMBED!==false;
  window.VOID_ASSET_CDN=window.VOID_ASSET_CDN||"https://void-gacha.com";
  var CDN=String(window.VOID_ASSET_CDN).replace(/\\/$/,"");
  function toCdnUrl(path){
    var norm=String(path||"").replace(/^\\.\\//,"").split("?")[0];
    if(!norm||/^(https?:|data:|blob:)/i.test(norm)) return path||"";
    if(norm.indexOf("images/")===0||norm.indexOf("assets/")===0) return CDN+"/"+norm;
    return path;
  }
  function patchResolve(){
    var orig=window.resolveArtPath;
    window.resolveArtPath=function(path){
      var cdn=toCdnUrl(path);
      if(cdn!==path) return cdn;
      return orig?orig(path):path;
    };
  }
  patchResolve();
})();
</script>`;

function applyVoidGachaPortalCdnPatch(html: string) {
  if (!isVoidGachaHtml(html) || html.includes('id="void-portal-cdn-art"')) {
    return html;
  }
  if (html.includes("</body>")) {
    return html.replace("</body>", `${VOID_PORTAL_CDN_SCRIPT}</body>`);
  }
  return `${html}${VOID_PORTAL_CDN_SCRIPT}`;
}

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
  if (
    !html.includes("<html") ||
    html.includes('id="rainynightfrog-embed-sdk"') ||
    html.includes('id="nexusplay-embed-sdk"')
  ) {
    return html;
  }

  let out = html;
  const sdk = buildRainyNightFrogEmbedSdkScript();

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
    out = applyVoidGachaPortalCdnPatch(out);
    if (isVoidGachaHtml(out) && !out.includes('id="nexusplay-scroll-fix"') && out.includes("<head>")) {
      out = out.replace("<head>", `<head>${VOID_EMBED_SCROLL_FIX_STYLE}`);
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

  out = applyVoidGachaPortalCdnPatch(out);
  if (isVoidGachaHtml(out) && !out.includes('id="nexusplay-scroll-fix"')) {
    if (out.includes("<head>")) {
      out = out.replace("<head>", `<head>${VOID_EMBED_SCROLL_FIX_STYLE}`);
    }
  }
  return ensureScrollbarStyle(out);
}
