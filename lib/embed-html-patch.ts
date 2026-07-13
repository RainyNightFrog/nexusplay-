import { buildRainyNightFrogEmbedSdkScript } from "@/lib/rainynightfrog-embed-sdk";
import { NEXUS_SCROLLBAR_STYLE_TAG } from "@/lib/nexus-scrollbar-css";

function ensureScrollbarStyle(html: string) {
  if (html.includes('id="nexusplay-scrollbar"')) return html;
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${NEXUS_SCROLLBAR_STYLE_TAG}`);
  }
  return html.replace(/<head[^>]*>/i, (match) => `${match}${NEXUS_SCROLLBAR_STYLE_TAG}`);
}

/** void-gacha 專用：同步建立放大閘道 overlay（無需重傳 zip 亦會覆寫舊 boot） */
const VOID_EMBED_BOOT_SCRIPT = "<script id=\"rainynightfrog-embed-boot\">\n(function(){\n  window.VOID_BUILD_TARGET='';\n  window.VOID_PORTAL_EMBED=true;\n  window.VOID_API_ORIGIN='https://void-gacha.com';\n  var d=document.documentElement;\n  d.classList.add('void-portal-embed','void-rainynightfrog-embed','void-itch-embed','void-in-iframe');\n  if(window.self===window.top)return;\n  var h=window.innerHeight||720,w=window.innerWidth||960;\n  var LEGACY='nexusplay';\n  var legacyType=function(kind){return LEGACY+':'+kind;};\n  window.__voidRnfEmbedExpanded=false;\n  d.classList.add('np-embed-mode');\n  function isBattleSubpage(){\n    var p=(location.pathname||'').toLowerCase();\n    return p.indexOf('star-god-boss')>=0||p.indexOf('apex-arena')>=0;\n  }\n  var battleSubpage=isBattleSubpage();\n  if(battleSubpage){\n    d.classList.add('void-battle-subpage','np-embed-battle');\n    window.__voidRnfEmbedExpanded=true;\n    d.classList.add('np-embed-expanded');\n  }\n  function removeExpandGate(){\n    var gate=document.getElementById('np-embed-expand-gate');\n    if(gate){try{gate.remove();}catch(_e){gate.hidden=true;gate.style.display='none';}}\n    d.classList.remove('np-embed-gated');\n  }\n  function revealGame(){\n    try{\n      d.classList.add('hero-welcome-skipped');\n      if(document.body){\n        document.body.classList.remove('auth-gate-active','hero-welcome-active');\n      }\n      var auth=document.getElementById('screen-auth');\n      if(auth){auth.classList.add('hidden');auth.classList.remove('auth-gate-locked');}\n      var app=document.getElementById('screen-app');\n      if(app){\n        app.classList.remove('hidden');\n        app.style.setProperty('display','block','important');\n        app.style.setProperty('visibility','visible','important');\n        app.style.setProperty('opacity','1','important');\n        app.style.setProperty('pointer-events','auto','important');\n      }\n      var hero=document.getElementById('hero-welcome');\n      if(hero){hero.classList.add('hidden');hero.style.display='none';}\n      removeExpandGate();\n    }catch(_e){}\n  }\n  function notifyEmbedLayout(){\n    try{\n      if(window.VoidEmbed&&window.VoidEmbed.syncViewportMode)window.VoidEmbed.syncViewportMode();\n      else if(window.VoidEmbed&&window.VoidEmbed.syncItchShellMode)window.VoidEmbed.syncItchShellMode();\n      if(window.VoidChatSystem&&window.VoidChatSystem.applyEmbedLayout)window.VoidChatSystem.applyEmbedLayout();\n      window.dispatchEvent(new Event('resize'));\n    }catch(_e){}\n  }\n  window.__voidRnfSyncExpandGate=function(opts){\n    if(opts&&typeof opts==='object'){\n      if(opts.width>0)w=opts.width;\n      if(opts.height>0)h=opts.height;\n      if(opts.expanded!=null&&!battleSubpage)window.__voidRnfEmbedExpanded=!!opts.expanded;\n    }\n    if(battleSubpage||document.fullscreenElement||(w>=900&&h>=520))window.__voidRnfEmbedExpanded=true;\n    var expanded=battleSubpage||!!window.__voidRnfEmbedExpanded;\n    d.classList.toggle('np-embed-expanded',expanded);\n    d.classList.toggle('np-embed-compact',h<=780&&!expanded);\n    d.classList.toggle('void-itch-mobile-shell',!battleSubpage);\n    d.style.setProperty('--np-embed-width',w+'px');\n    d.style.setProperty('--np-embed-height',h+'px');\n    d.classList.remove('np-embed-gated');\n    removeExpandGate();\n    revealGame();\n    notifyEmbedLayout();\n  };\n  window.__voidNpSyncExpandGate=window.__voidRnfSyncExpandGate;\n  function isPlatformParentMsg(e){\n    try{return e.source===window.parent;}catch(_e){return false;}\n  }\n  function onPlatformMsg(e){\n    if(!isPlatformParentMsg(e))return;\n    var data=e.data;\n    if(!data||typeof data!=='object')return;\n    if(data.type==='rainynightfrog:play-mode'||data.type===legacyType('play-mode')){\n      if(!battleSubpage)window.__voidRnfEmbedExpanded=data.mode==='expanded'||data.mode==='fullscreen';\n      window.__voidRnfSyncExpandGate({expanded:window.__voidRnfEmbedExpanded,width:w,height:h});\n      return;\n    }\n    if(data.type!=='rainynightfrog:resize'&&data.type!==legacyType('resize'))return;\n    window.__voidRnfSyncExpandGate({width:data.width,height:data.height,expanded:data.expanded});\n  }\n  window.addEventListener('message',onPlatformMsg);\n  window.addEventListener('resize',function(){\n    h=window.innerHeight||h;w=window.innerWidth||w;window.__voidRnfSyncExpandGate();\n  });\n  if(window.visualViewport){\n    window.visualViewport.addEventListener('resize',function(){\n      h=Math.round(window.visualViewport.height)||h;\n      w=Math.round(window.visualViewport.width)||w;\n      window.__voidRnfSyncExpandGate();\n    });\n  }\n  function kick(){removeExpandGate();revealGame();window.__voidRnfSyncExpandGate();}\n  if(document.readyState==='loading'){\n    document.addEventListener('DOMContentLoaded',kick,{once:true});\n  }\n  kick();\n  setTimeout(kick,0);\n  setTimeout(kick,200);\n  setTimeout(kick,800);\n  setTimeout(kick,2000);\n  setTimeout(kick,4000);\n})();\n</script>";

const VOID_EMBED_EARLY_CLASS_SCRIPT = `<script id="void-portal-early">document.documentElement.classList.add('void-portal-embed','void-rainynightfrog-embed','void-itch-embed','void-in-iframe');</script>`;

const VOID_EMBED_LAYOUT_STYLE = `<style id="rainynightfrog-embed-layout">
html.void-portal-embed #screen-auth,
html.void-portal-embed.void-rainynightfrog-embed #screen-auth,
html.void-portal-embed.void-in-iframe #screen-auth{display:none!important}
html.void-portal-embed #g_id_onload,
html.void-portal-embed #btn-google{display:none!important}
html.void-rainynightfrog-embed #screen-app,
html.void-rainynightfrog-embed #screen-app.hidden,
html.void-rainynightfrog-embed body.auth-gate-active #screen-app,
html.void-portal-embed.void-rainynightfrog-embed body.auth-gate-active #screen-app,
html.void-portal-embed.void-rainynightfrog-embed #screen-app.hidden{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
html.void-rainynightfrog-embed #hero-welcome{display:none!important}
.np-embed-expand-gate{display:none!important}
</style>`;

/** void-gacha 嵌入：排版與閘道樣式（勿鎖 #screen-app fixed，全螢幕才可遊玩） */
const VOID_EMBED_SCROLL_FIX_STYLE = `<style id="rainynightfrog-scroll-fix">
html.void-portal-embed.void-in-iframe .gacha-view.view-panel,html.void-rainynightfrog-embed .gacha-view.view-panel{overflow:visible!important;max-height:none!important}
html.void-portal-embed.void-in-iframe .gacha-arena,html.void-rainynightfrog-embed .gacha-arena,html.void-portal-embed.void-in-iframe .gacha-hub--machine,html.void-rainynightfrog-embed .gacha-hub--machine{min-height:0!important;max-height:none!important;overflow:visible!important}
html.void-portal-embed.void-in-iframe .void-app-main>.view-panel,html.void-rainynightfrog-embed .void-app-main>.view-panel{overflow:visible!important;max-height:none!important}
html.void-rainynightfrog-embed.np-embed-mode.void-itch-mobile-shell .home-arena:has(.home-right-rail){display:flex!important;flex-direction:column!important;gap:8px}
html.void-rainynightfrog-embed.np-embed-mode.void-itch-mobile-shell .home-right-rail{position:relative!important;top:auto!important;right:auto!important;order:-1;width:100%;max-width:100%;flex-direction:row;flex-wrap:wrap;justify-content:center;gap:8px;margin:0 auto 6px;padding:0 4px;z-index:2}
html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-mega-title,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-marquee,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-left-pillar,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-bg-zones,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-bg-beasts,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-bg-tentacles,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-bg-cards,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-particles,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-lightning,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-quick,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .home-collapse{display:none!important}
html.void-rainynightfrog-embed.void-itch-mobile-shell.np-embed-compact:not(.np-embed-expanded) .mythic-rising-packs-row,html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .mythic-rising-packs-row{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;overflow:visible!important;flex-wrap:unset!important;scroll-snap-type:none!important}
html.void-rainynightfrog-embed.np-embed-compact:not(.np-embed-expanded) .mythic-rising-packs-row .pack-tile{flex:none!important;width:100%!important;min-width:0!important;max-width:none!important;min-height:128px!important;height:auto!important;aspect-ratio:3/4.2}
html.void-rainynightfrog-embed.np-embed-mode.void-itch-mobile-shell,html.void-rainynightfrog-embed.np-embed-mode.void-itch-mobile-shell body{overflow-x:hidden;overflow-y:auto;height:auto;min-height:100%}
html.void-rainynightfrog-embed.np-embed-mode.void-itch-mobile-shell #screen-app{padding-bottom:calc(var(--void-mobile-nav-h,58px) + var(--void-mobile-chat-gap,62px) + 16px);height:auto;max-height:none;overflow:visible;display:block}
html.void-rainynightfrog-embed.np-embed-expanded,html.void-rainynightfrog-embed.np-embed-expanded body{overflow-x:hidden;overflow-y:auto;height:auto;min-height:100%}
html.void-rainynightfrog-embed.np-embed-expanded #screen-app{display:block!important;visibility:visible!important;height:auto!important;max-height:none!important;min-height:var(--np-embed-height,var(--void-embed-vh,100dvh))!important;overflow:visible!important}
html.void-rainynightfrog-embed.np-embed-expanded .void-app-main{overflow:visible!important;min-height:0;flex:none;width:100%;max-width:100%}
html.void-rainynightfrog-embed.np-embed-expanded.void-itch-mobile-shell .void-itch-nav-dock{display:flex!important;opacity:1!important;pointer-events:auto!important;visibility:visible!important}
html.void-rainynightfrog-embed.np-embed-expanded.void-itch-mobile-shell #screen-app>.app-header{position:sticky!important;top:0;z-index:999;display:block!important;visibility:visible!important}
html.void-rainynightfrog-embed.np-embed-mode.void-itch-mobile-shell:not(.np-embed-expanded) .void-chat-panel:not(.is-hidden){width:min(400px,calc(var(--np-embed-width,100vw) - 16px));max-height:calc(var(--np-embed-height,720px) - var(--void-mobile-nav-h,58px) - 20px);font-size:15px}
html.void-rainynightfrog-embed.np-embed-mode.void-itch-mobile-shell:not(.np-embed-expanded) .void-chat-panel:not(.is-hidden):not(.is-collapsed){--void-chat-h:min(560px,calc(var(--np-embed-height,720px) - var(--void-mobile-nav-h,58px) - 28px));height:var(--void-chat-h);min-height:min(400px,calc(var(--np-embed-height,720px) - var(--void-mobile-nav-h,58px) - 28px))}
html.void-rainynightfrog-embed.np-embed-mode .side-mode-modal{max-height:min(calc(var(--np-embed-height,720px) - 12px),96dvh)!important;height:min(calc(var(--np-embed-height,720px) - 12px),96dvh)!important}
html.void-rainynightfrog-embed.np-embed-mode .side-mode-body{min-height:0!important;overflow-y:auto!important}
html.np-embed-gated #screen-app,html.void-rainynightfrog-embed.np-embed-gated #screen-app{filter:none!important;pointer-events:auto!important}
html.np-embed-gated .void-itch-nav-dock,html.np-embed-gated .void-chat-panel,html.np-embed-gated #void-scroll-top{opacity:.35}
html.void-rainynightfrog-embed.np-embed-expanded .void-itch-nav-dock,html.void-rainynightfrog-embed.np-embed-expanded .void-chat-panel,html.void-rainynightfrog-embed.np-embed-mode:not(.np-embed-gated) .void-itch-nav-dock,html.void-rainynightfrog-embed.np-embed-mode:not(.np-embed-gated) .void-chat-panel{opacity:1!important;pointer-events:auto!important}
.np-embed-expand-gate,.np-embed-expand-gate[hidden],.np-embed-expand-gate__panel,.np-embed-expand-gate__btn{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important}
html.np-embed-gated #screen-app,html.void-rainynightfrog-embed.np-embed-gated #screen-app{filter:none!important;pointer-events:auto!important}
html.np-embed-gated .void-itch-nav-dock,html.np-embed-gated .void-chat-panel,html.np-embed-gated #void-scroll-top{opacity:1}
html.void-rainynightfrog-embed.np-embed-expanded .void-itch-nav-dock,html.void-rainynightfrog-embed.np-embed-expanded .void-chat-panel,html.void-rainynightfrog-embed.np-embed-mode:not(.np-embed-gated) .void-itch-nav-dock,html.void-rainynightfrog-embed.np-embed-mode:not(.np-embed-gated) .void-chat-panel{opacity:1!important;pointer-events:auto!important}
html.void-rainynightfrog-embed #screen-app{display:block!important;visibility:visible!important}
html.void-rainynightfrog-embed body.auth-gate-active #screen-app{display:block!important;visibility:visible!important;pointer-events:auto!important;opacity:1!important}
html.void-rainynightfrog-embed #screen-auth{display:none!important}
</style>`;

function applyVoidEmbedBoot(html: string) {
  const bootRe = /<script id="(?:rainynightfrog|nexusplay)-embed-boot">[\s\S]*?<\/script>/i;
  if (bootRe.test(html)) {
    return html.replace(bootRe, VOID_EMBED_BOOT_SCRIPT.trim());
  }
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${VOID_EMBED_BOOT_SCRIPT}`);
  }
  return html.replace(/<head[^>]*>/i, (match) => `${match}${VOID_EMBED_BOOT_SCRIPT}`);
}

function applyVoidScrollFix(html: string) {
  const styleRe = /<style id="rainynightfrog-scroll-fix">[\s\S]*?<\/style>/i;
  if (styleRe.test(html)) {
    return html.replace(styleRe, VOID_EMBED_SCROLL_FIX_STYLE.trim());
  }
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${VOID_EMBED_SCROLL_FIX_STYLE}`);
  }
  return html.replace(/<head[^>]*>/i, (match) => `${match}${VOID_EMBED_SCROLL_FIX_STYLE}`);
}

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
    out = out.replace("<head>", `<head>${sdk}${VOID_EMBED_EARLY_CLASS_SCRIPT}`);
  } else {
    out = out.replace(/<head[^>]*>/i, (match) => `${match}${sdk}${VOID_EMBED_EARLY_CLASS_SCRIPT}`);
  }

  if (!isVoidGachaHtml(out)) {
    if (isCoreDefenseHtml(out) && !out.includes('id="nexusplay-core-defense-layout"')) {
      if (out.includes("<head>")) {
        out = out.replace("<head>", `<head>${CORE_DEFENSE_EMBED_LAYOUT_STYLE}`);
      }
    }
    out = applyVoidGachaPortalCdnPatch(out);
    return ensureScrollbarStyle(out);
  }

  out = applyVoidEmbedBoot(out);

  const portalCritical =
    '.hidden{display:none!important}' +
    'html.void-portal-embed #screen-auth,html.void-rainynightfrog-embed #screen-auth{display:none!important}' +
    'html.void-portal-embed #g_id_onload,html.void-rainynightfrog-embed #g_id_onload,html.void-portal-embed #btn-google{display:none!important}' +
    'html.void-rainynightfrog-embed #screen-app,html.void-portal-embed.void-rainynightfrog-embed #screen-app,html.void-rainynightfrog-embed body.auth-gate-active #screen-app,html.void-portal-embed.void-rainynightfrog-embed body.auth-gate-active #screen-app,html.void-rainynightfrog-embed #screen-app.hidden,html.void-portal-embed.void-rainynightfrog-embed #screen-app.hidden{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}' +
    'html.void-rainynightfrog-embed #hero-welcome,html.void-portal-embed.void-rainynightfrog-embed #hero-welcome{display:none!important}' +
    '.np-embed-expand-gate{display:none!important}';
  if (out.includes('id="void-critical-embed"')) {
    out = out.replace(
      /<style id="void-critical-embed">[\s\S]*?<\/style>/i,
      `<style id="void-critical-embed">${portalCritical}</style>`
    );
    if (!out.includes('id="rainynightfrog-embed-layout"')) {
      out = out.replace(
        /<style id="void-critical-embed">/i,
        `${VOID_EMBED_LAYOUT_STYLE}\n<style id="void-critical-embed">`
      );
    }
  } else if (!out.includes('id="rainynightfrog-embed-layout"')) {
    out = out.replace(/<head>/i, `<head>${VOID_EMBED_LAYOUT_STYLE}`);
  }

  if (!out.includes('id="portal-google-hint"')) {
    out = out.replace(
      /<div class="auth-footer-block">/i,
      `${VOID_EMBED_GOOGLE_HINT}\n                <div class="auth-footer-block">`
    );
  }

  out = applyVoidGachaPortalCdnPatch(out);
  out = applyVoidScrollFix(out);
  return ensureScrollbarStyle(out);
}
