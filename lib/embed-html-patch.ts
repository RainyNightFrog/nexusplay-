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
const VOID_EMBED_BOOT_SCRIPT = `<script id="nexusplay-embed-boot">
(function(){
  window.VOID_BUILD_TARGET='';
  window.VOID_PORTAL_EMBED=true;
  window.VOID_API_ORIGIN='https://void-gacha.com';
  var d=document.documentElement;
  d.classList.add('void-portal-embed','void-nexusplay-embed','void-itch-embed','void-in-iframe');
  if(window.self===window.top)return;
  var h=window.innerHeight||720,w=window.innerWidth||960;
  window.__voidNpEmbedExpanded=false;
  d.classList.add('np-embed-mode');
  function texts(){
    var t=window.VoidI18n&&window.VoidI18n.t?function(k,f){var v=window.VoidI18n.t(k);return v&&v!==k?v:f;}:function(_k,f){return f;};
    return{
      title:t('np_embed_expand_title','視窗過小'),
      message:t('np_embed_expand_message','請點擊下方按鈕或頁面右下角「放大」，放大後才能繼續遊玩 VOID GACHA。'),
      hint:t('np_embed_expand_hint','放大後將顯示完整介面與右側選單'),
      btn:t('np_embed_expand_btn','請放大視窗')
    };
  }
  function mountGate(gate){
    if(!gate||gate.parentNode)return;
    (document.body||document.documentElement).appendChild(gate);
  }
  function ensureOverlay(show){
    var gate=document.getElementById('np-embed-expand-gate');
    if(!gate){
      var tx=texts();
      gate=document.createElement('div');
      gate.id='np-embed-expand-gate';
      gate.className='np-embed-expand-gate';
      gate.setAttribute('role','dialog');
      gate.setAttribute('aria-modal','true');
      gate.innerHTML='<div class="np-embed-expand-gate__panel"><p class="np-embed-expand-gate__eyebrow">VOID GACHA · RainyNightFrog</p><h2 class="np-embed-expand-gate__title"></h2><p class="np-embed-expand-gate__message"></p><p class="np-embed-expand-gate__hint"></p><button type="button" class="np-embed-expand-gate__btn"></button></div>';
      gate.querySelector('.np-embed-expand-gate__title').textContent=tx.title;
      gate.querySelector('.np-embed-expand-gate__message').textContent=tx.message;
      gate.querySelector('.np-embed-expand-gate__hint').textContent=tx.hint;
      gate.querySelector('.np-embed-expand-gate__btn').textContent=tx.btn;
      gate.querySelector('.np-embed-expand-gate__btn').addEventListener('click',function(){
        try{
          ['rainynightfrog:expand-request','nexusplay:expand-request'].forEach(function(type){
            window.parent.postMessage({type:type},'*');
          });
        }catch(_e){}
      });
      gate.addEventListener('click',function(ev){
        if(ev.target===gate){
          try{
            ['rainynightfrog:expand-request','nexusplay:expand-request'].forEach(function(type){
              window.parent.postMessage({type:type},'*');
            });
          }catch(_e2){}
        }
      });
      mountGate(gate);
      if(!document.body)document.addEventListener('DOMContentLoaded',function(){mountGate(gate);},{once:true});
    }
    if(show){
      var tx2=texts();
      gate.querySelector('.np-embed-expand-gate__title').textContent=tx2.title;
      gate.querySelector('.np-embed-expand-gate__message').textContent=tx2.message;
      gate.querySelector('.np-embed-expand-gate__hint').textContent=tx2.hint;
      gate.querySelector('.np-embed-expand-gate__btn').textContent=tx2.btn;
      mountGate(gate);
    }
    gate.hidden=!show;
    gate.setAttribute('aria-hidden',show?'false':'true');
  }
  window.__voidNpSyncExpandGate=function(opts){
    if(opts&&typeof opts==='object'){
      if(opts.width>0)w=opts.width;
      if(opts.height>0)h=opts.height;
      if(opts.expanded!=null){
        window.__voidNpEmbedExpanded=!!opts.expanded;
        d.classList.toggle('np-embed-expanded',window.__voidNpEmbedExpanded);
      }
    }
    var expanded=!!window.__voidNpEmbedExpanded;
    var compact=h<=780;
    d.classList.toggle('np-embed-compact',compact);
    d.classList.toggle('void-itch-mobile-shell',compact&&!expanded);
    d.style.setProperty('--np-embed-width',w+'px');
    d.style.setProperty('--np-embed-height',h+'px');
    var gated=compact&&!expanded;
    d.classList.toggle('np-embed-gated',gated);
    ensureOverlay(gated);
  };
  function onPlatformMsg(e){
    var data=e.data;
    if(!data||typeof data!=='object')return;
    if(data.type==='rainynightfrog:play-mode'||data.type==='nexusplay:play-mode'){
      window.__voidNpEmbedExpanded=data.mode==='expanded';
      window.__voidNpSyncExpandGate({expanded:window.__voidNpEmbedExpanded});
      return;
    }
    if(data.type!=='rainynightfrog:resize'&&data.type!=='nexusplay:resize')return;
    window.__voidNpSyncExpandGate({width:data.width,height:data.height,expanded:data.expanded});
  }
  window.addEventListener('message',onPlatformMsg);
  window.addEventListener('resize',function(){
    h=window.innerHeight||h;
    w=window.innerWidth||w;
    window.__voidNpSyncExpandGate();
  });
  if(window.visualViewport){
    window.visualViewport.addEventListener('resize',function(){
      h=Math.round(window.visualViewport.height)||h;
      w=Math.round(window.visualViewport.width)||w;
      window.__voidNpSyncExpandGate();
    });
  }
  window.__voidNpSyncExpandGate();
})();
</script>`;

const VOID_EMBED_EARLY_CLASS_SCRIPT = `<script id="void-portal-early">document.documentElement.classList.add('void-portal-embed','void-nexusplay-embed','void-itch-embed','void-in-iframe');</script>`;

const VOID_EMBED_LAYOUT_STYLE = `<style id="nexusplay-embed-layout">
html.void-portal-embed #screen-auth,
html.void-portal-embed.void-nexusplay-embed #screen-auth,
html.void-portal-embed.void-in-iframe #screen-auth{display:none!important}
html.void-portal-embed #g_id_onload,
html.void-portal-embed #btn-google{display:none!important}
</style>`;

/** void-gacha 嵌入：排版與閘道樣式（勿鎖 #screen-app fixed，全螢幕才可遊玩） */
const VOID_EMBED_SCROLL_FIX_STYLE = `<style id="nexusplay-scroll-fix">
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
html.np-embed-gated #screen-app,html.void-nexusplay-embed.np-embed-gated #screen-app{filter:none!important;pointer-events:auto!important}
html.np-embed-gated .void-itch-nav-dock,html.np-embed-gated .void-chat-panel,html.np-embed-gated #void-scroll-top{opacity:.35}
html.void-nexusplay-embed.np-embed-expanded .void-itch-nav-dock,html.void-nexusplay-embed.np-embed-expanded .void-chat-panel,html.void-nexusplay-embed.np-embed-mode:not(.np-embed-gated) .void-itch-nav-dock,html.void-nexusplay-embed.np-embed-mode:not(.np-embed-gated) .void-chat-panel{opacity:1!important;pointer-events:auto!important}
.np-embed-expand-gate{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top,0)) 16px max(16px,env(safe-area-inset-bottom,0));background:rgba(4,2,14,.72);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);pointer-events:auto;touch-action:manipulation}
.np-embed-expand-gate[hidden]{display:none!important}
.np-embed-expand-gate__panel{width:min(420px,100%);padding:22px 20px 18px;border-radius:18px;border:1px solid rgba(78,240,255,.35);background:linear-gradient(160deg,rgba(12,8,28,.96),rgba(6,4,18,.98));box-shadow:0 0 28px rgba(123,63,242,.35);text-align:center}
.np-embed-expand-gate__eyebrow{margin:0 0 8px;font-size:.72rem;letter-spacing:.14em;color:rgba(78,240,255,.85)}
.np-embed-expand-gate__title{margin:0 0 10px;font-size:1.35rem;color:#f5ecff}
.np-embed-expand-gate__message,.np-embed-expand-gate__hint{margin:0 0 10px;font-size:.92rem;line-height:1.55;color:rgba(230,220,255,.88)}
.np-embed-expand-gate__hint{margin-bottom:16px;font-size:.82rem;color:rgba(180,170,210,.85)}
.np-embed-expand-gate__btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 18px;border-radius:12px;border:1px solid rgba(78,240,255,.45);background:linear-gradient(180deg,rgba(78,240,255,.18),rgba(123,63,242,.28));color:#ecfeff;font-size:.95rem;font-weight:700;cursor:pointer}
</style>`;

function applyVoidEmbedBoot(html: string) {
  const bootRe = /<script id="nexusplay-embed-boot">[\s\S]*?<\/script>/i;
  if (bootRe.test(html)) {
    return html.replace(bootRe, VOID_EMBED_BOOT_SCRIPT.trim());
  }
  if (html.includes("<head>")) {
    return html.replace("<head>", `<head>${VOID_EMBED_BOOT_SCRIPT}`);
  }
  return html.replace(/<head[^>]*>/i, (match) => `${match}${VOID_EMBED_BOOT_SCRIPT}`);
}

function applyVoidScrollFix(html: string) {
  const styleRe = /<style id="nexusplay-scroll-fix">[\s\S]*?<\/style>/i;
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
    'html.void-portal-embed #screen-auth,html.void-nexusplay-embed #screen-auth{display:none!important}' +
    'html.void-portal-embed #g_id_onload,html.void-nexusplay-embed #g_id_onload,html.void-portal-embed #btn-google{display:none!important}';
  if (out.includes('id="void-critical-embed"')) {
    out = out.replace(
      /<style id="void-critical-embed">[\s\S]*?<\/style>/i,
      `<style id="void-critical-embed">${portalCritical}</style>`
    );
    if (!out.includes('id="nexusplay-embed-layout"')) {
      out = out.replace(
        /<style id="void-critical-embed">/i,
        `${VOID_EMBED_LAYOUT_STYLE}\n<style id="void-critical-embed">`
      );
    }
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
  out = applyVoidScrollFix(out);
  return ensureScrollbarStyle(out);
}
