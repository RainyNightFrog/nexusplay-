/**
 * RainyNightFrog HTML5 嵌入式遊戲 SDK
 * 無外部依賴 · 設定持久化 · postMessage 排行榜/雲端存檔
 */
(function (global) {
  "use strict";

  var SETTINGS_KEY = "rnf:game-settings";
  var DEFAULT_SETTINGS = {
    sfxVolume: 0.75,
    bgmVolume: 0.45,
    screenShake: true,
    quality: "high",
    sensitivity: 1,
    gameSpeed: 1,
  };

  function detectSlug() {
    var parts = location.pathname.split("/").filter(Boolean);
    var gamesIdx = parts.indexOf("games");
    if (gamesIdx >= 0 && parts[gamesIdx + 1]) return parts[gamesIdx + 1];
    var file = parts[parts.length - 1] || "";
    if (file === "index.html" && parts.length > 1) return parts[parts.length - 2];
    return file.replace(/\.html$/, "") || "game";
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return Object.assign({}, DEFAULT_SETTINGS);
      return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
    } catch (_e) {
      return Object.assign({}, DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (_e) {}
  }

  var slug = detectSlug();
  var settings = loadSettings();
  var shakeOffset = { x: 0, y: 0 };
  var shakeTimer = 0;
  var audioCtx = null;
  var bgmNodes = [];
  var styleInjected = false;

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    var css =
      "*{box-sizing:border-box;margin:0;padding:0}" +
      "html,body{width:100%;height:100%;background:#04060c;color:#e2e8f0;font-family:'Segoe UI','Microsoft JhengHei',system-ui,sans-serif;overflow:hidden}" +
      ".rnf-root{position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center}" +
      ".rnf-grid-bg{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(34,211,238,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(167,139,250,.04) 1px,transparent 1px);background-size:40px 40px;animation:rnfGrid 24s linear infinite}" +
      "@keyframes rnfGrid{to{background-position:40px 80px}}" +
      ".rnf-glow{position:absolute;border-radius:50%;filter:blur(90px);opacity:.28;pointer-events:none}" +
      ".rnf-glow-a{width:420px;height:420px;background:#22d3ee;top:-120px;left:-80px}" +
      ".rnf-glow-b{width:360px;height:360px;background:#a78bfa;bottom:-100px;right:-60px}" +
      ".rnf-screen{display:none;position:relative;z-index:2;width:100%;height:100%;flex-direction:column;align-items:center;justify-content:center;padding:.75rem}" +
      ".rnf-screen.active{display:flex}" +
      ".rnf-panel{text-align:center;padding:1.6rem 1.4rem;max-width:640px;width:min(92%,640px);max-height:calc(100vh - 1.5rem);overflow-y:auto;background:linear-gradient(165deg,rgba(12,18,32,.96),rgba(6,10,18,.92));border:1px solid rgba(34,211,238,.35);border-radius:16px;box-shadow:0 0 70px rgba(34,211,238,.1),inset 0 0 50px rgba(34,211,238,.02)}" +
      ".rnf-badge{display:inline-block;padding:.3rem .85rem;border-radius:999px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.45);color:#22d3ee;font-size:.68rem;font-weight:700;letter-spacing:.14em;margin-bottom:.75rem}" +
      ".rnf-title{font-size:clamp(1.35rem,4vw,2.1rem);font-weight:900;background:linear-gradient(135deg,#fff,#22d3ee 45%,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:.3rem}" +
      ".rnf-sub{color:#94a3b8;font-size:.84rem;line-height:1.6;margin-bottom:.85rem}" +
      ".rnf-stats{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin:.85rem 0;padding:.65rem;border:1px solid rgba(167,139,250,.2);border-radius:10px;background:rgba(0,0,0,.35)}" +
      ".rnf-stat{font-size:.66rem;color:#64748b;letter-spacing:.08em;min-width:4rem}" +
      ".rnf-stat b{display:block;font-size:1.15rem;color:#22d3ee;margin-top:.15rem;font-variant-numeric:tabular-nums}" +
      ".rnf-btn-row{display:flex;gap:.55rem;justify-content:center;flex-wrap:wrap;margin-top:.85rem}" +
      ".rnf-btn{cursor:pointer;border:1px solid rgba(34,211,238,.4);background:linear-gradient(180deg,rgba(34,211,238,.12),rgba(167,139,250,.06));color:#67e8f9;padding:.55rem 1rem;font-size:.8rem;font-weight:600;border-radius:8px;transition:all .2s;letter-spacing:.04em}" +
      ".rnf-btn:hover{background:rgba(34,211,238,.22);box-shadow:0 0 20px rgba(34,211,238,.25);transform:translateY(-1px)}" +
      ".rnf-btn.primary{background:linear-gradient(180deg,rgba(34,211,238,.55),rgba(167,139,250,.45));color:#fff;border-color:#22d3ee}" +
      ".rnf-btn.selected{background:rgba(167,139,250,.35);border-color:#a78bfa;color:#fff}" +
      ".rnf-settings{text-align:left;margin:.5rem 0}" +
      ".rnf-setting-row{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.75rem;font-size:.78rem;color:#94a3b8}" +
      ".rnf-setting-row input[type=range]{flex:1;accent-color:#22d3ee}" +
      ".rnf-setting-row b{color:#22d3ee;font-size:.82rem}" +
      ".rnf-toggle{cursor:pointer;padding:.4rem .75rem;border-radius:8px;border:1px solid rgba(34,211,238,.35);background:rgba(0,0,0,.35);font-size:.76rem;color:#94a3b8}" +
      ".rnf-toggle.on{background:rgba(34,211,238,.25);color:#fff;border-color:#22d3ee}" +
      ".rnf-game-wrap{display:flex;flex-direction:column;width:100%;height:100%;max-width:960px;max-height:600px;min-height:0;padding:.25rem .35rem .4rem;position:relative}" +
      "html.rnf-embed-mode,html.rnf-embed-mode body{height:100%;min-height:0;overflow:hidden}" +
      "html.rnf-embed-mode .rnf-root{min-height:0;max-height:100%}" +
      "html.rnf-embed-mode .rnf-game-wrap{max-width:none;max-height:none;height:100%}" +
      "html.rnf-embed-mode .rnf-screen{padding:.35rem}" +
      ".rnf-hud{display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:.25rem;padding:.38rem .5rem;background:rgba(0,0,0,.65);border:1px solid rgba(34,211,238,.25);border-radius:8px;margin-bottom:.3rem;font-size:.68rem;flex-shrink:0}" +
      ".rnf-hud span{display:block;color:#64748b;font-size:.56rem;letter-spacing:.08em}" +
      ".rnf-hud b{color:#22d3ee;font-size:.92rem;font-variant-numeric:tabular-nums}" +
      ".rnf-canvas-wrap{flex:1;min-height:0;position:relative;border:1px solid rgba(34,211,238,.3);border-radius:10px;overflow:hidden;background:#060a12;box-shadow:0 0 30px rgba(34,211,238,.08)}" +
      ".rnf-canvas-wrap canvas{display:block;width:100%;height:100%}" +
      ".rnf-score-big{font-size:clamp(2rem,6vw,3rem);font-weight:900;color:#22d3ee;margin:.5rem 0;font-variant-numeric:tabular-nums;text-shadow:0 0 24px rgba(34,211,238,.5)}" +
      ".rnf-hint{font-size:.72rem;color:#64748b;margin-top:.35rem}" +
      ".rnf-diff-label{font-size:.72rem;color:#64748b;letter-spacing:.12em;margin:.65rem 0 .35rem}" +
      ".rnf-lb-list{text-align:left;margin:.55rem 0 .75rem;max-height:42vh;overflow-y:auto;border:1px solid rgba(34,211,238,.15);border-radius:10px;background:rgba(0,0,0,.35)}" +
      ".rnf-lb-row{display:grid;grid-template-columns:2rem 1fr auto;gap:.45rem;align-items:center;padding:.5rem .65rem;border-bottom:1px solid rgba(255,255,255,.05);font-size:.78rem}" +
      ".rnf-lb-row:last-child{border-bottom:none}" +
      ".rnf-lb-row.me{background:rgba(34,211,238,.08)}" +
      ".rnf-lb-rank{font-weight:800;color:#64748b;font-variant-numeric:tabular-nums}" +
      ".rnf-lb-rank.top{color:#fbbf24}" +
      ".rnf-lb-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#cbd5e1;text-align:left}" +
      ".rnf-lb-player{text-align:left;min-width:0}" +
      ".rnf-lb-score{font-weight:700;color:#22d3ee;font-variant-numeric:tabular-nums}" +
      ".rnf-lb-meta{font-size:.62rem;color:#64748b;margin-top:.12rem;text-align:left}" +
      ".rnf-lb-empty{color:#64748b;font-size:.82rem;padding:1.25rem;text-align:center}" +
      ".rnf-lb-section-title{font-size:.72rem;color:#22d3ee;letter-spacing:.12em;text-align:center;margin:.85rem 0 .35rem;padding-left:0}" +
      ".rnf-lb-note{font-size:.72rem;color:#94a3b8;line-height:1.55;text-align:center;margin:.35rem 0 .15rem;padding:.45rem .6rem;border-radius:8px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.2)}" +
      ".rnf-lb-note.warn{background:rgba(251,191,36,.08);border-color:rgba(251,191,36,.28)}" +
      ".rnf-lb-tabs{display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;margin:.35rem 0 .15rem}" +
      ".rnf-lb-tab{cursor:pointer;border:1px solid rgba(148,163,184,.3);background:rgba(0,0,0,.28);color:#94a3b8;padding:.4rem .85rem;font-size:.76rem;font-weight:600;border-radius:999px;transition:all .18s}" +
      ".rnf-lb-tab:hover{border-color:rgba(34,211,238,.45);color:#cbd5e1}" +
      ".rnf-lb-tab.active{background:rgba(34,211,238,.18);border-color:#22d3ee;color:#fff;box-shadow:0 0 14px rgba(34,211,238,.18)}" +
      ".rnf-lb-tag{display:inline-block;font-size:.58rem;padding:.12rem .4rem;border-radius:4px;margin-left:.35rem;vertical-align:middle}" +
      ".rnf-lb-tag.cloud{background:rgba(34,211,238,.15);color:#67e8f9;border:1px solid rgba(34,211,238,.35)}" +
      ".rnf-lb-tag.local{background:rgba(167,139,250,.12);color:#c4b5fd;border:1px solid rgba(167,139,250,.3)}" +
      ".rnf-lb-tag.me{background:rgba(251,191,36,.14);color:#fbbf24;border:1px solid rgba(251,191,36,.35)}" +
      ".rnf-scroll{scrollbar-width:thin;scrollbar-color:#22d3ee rgba(6,10,18,.88)}" +
      ".rnf-scroll::-webkit-scrollbar{width:8px;height:8px}" +
      ".rnf-scroll::-webkit-scrollbar-track{background:rgba(6,10,18,.88);border-radius:999px;border:1px solid rgba(34,211,238,.1);margin:2px}" +
      ".rnf-scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(34,211,238,.95),rgba(167,139,250,.85));border-radius:999px;border:1px solid rgba(34,211,238,.45);box-shadow:0 0 12px rgba(34,211,238,.35)}" +
      ".rnf-scroll::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,#67e8f9,#c4b5fd)}" +
      ".rnf-scroll::-webkit-scrollbar-corner{background:transparent}" +
      ".rnf-features{display:flex;flex-wrap:wrap;gap:.35rem;justify-content:center;margin:.15rem 0 .75rem}" +
      ".rnf-feature-tag{font-size:.62rem;padding:.22rem .55rem;border-radius:999px;background:rgba(34,211,238,.1);border:1px solid rgba(34,211,238,.35);color:#67e8f9;letter-spacing:.04em;white-space:nowrap}" +
      ".rnf-help-body{text-align:center;margin:.75rem 0;max-height:46vh;overflow-y:auto;padding:.35rem .45rem;border:1px solid rgba(34,211,238,.12);border-radius:10px;background:rgba(0,0,0,.22)}" +
      ".rnf-help-section{margin-bottom:.85rem;text-align:center}" +
      ".rnf-help-section h2{font-size:.78rem;color:#22d3ee;letter-spacing:.12em;margin-bottom:.4rem;text-align:center}" +
      ".rnf-help-section p{font-size:.8rem;color:#94a3b8;line-height:1.65;margin:0;text-align:center}" +
      ".rnf-help-features{background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.2);border-radius:10px;padding:.55rem .65rem;margin-top:.2rem;text-align:center}" +
      ".rnf-help-feature{display:flex;gap:.45rem;align-items:flex-start;justify-content:center;font-size:.76rem;color:#cbd5e1;line-height:1.55;margin-bottom:.35rem;text-align:left;max-width:28rem;margin-left:auto;margin-right:auto}" +
      ".rnf-help-feature:last-child{margin-bottom:0}" +
      ".rnf-help-feature-dot{color:#fbbf24;flex-shrink:0;line-height:1.55}" +
      ".rnf-help-list{margin:.35rem auto 0;padding-left:0;list-style-position:inside;color:#cbd5e1;font-size:.78rem;line-height:1.7;text-align:center;max-width:28rem}" +
      ".rnf-help-list li{margin-bottom:.2rem}" +
      ".rnf-game-home{position:absolute;top:.35rem;right:.35rem;z-index:20;cursor:pointer;border:1px solid rgba(34,211,238,.45);background:rgba(0,0,0,.72);color:#67e8f9;padding:.32rem .62rem;font-size:.68rem;font-weight:700;border-radius:8px;letter-spacing:.08em;display:none;backdrop-filter:blur(6px);transition:all .2s;pointer-events:auto}" +
      ".rnf-game-home.visible{display:block}" +
      ".rnf-game-home:hover{background:rgba(34,211,238,.18);box-shadow:0 0 16px rgba(34,211,238,.25)}";
    var style = document.createElement("style");
    style.id = "rnf-sdk-styles";
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureAudio() {
    if (!audioCtx) {
      var Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") audioCtx.resume().catch(function () {});
    return audioCtx;
  }

  function playTone(freq, dur, type, vol, slide) {
    var ctx = ensureAudio();
    if (!ctx || settings.sfxVolume <= 0) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol * settings.sfxVolume * 0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  var SFX = {
    click: function () { playTone(880, 0.06, "square", 0.5); },
    confirm: function () { playTone(660, 0.08, "sine", 0.6); playTone(990, 0.1, "sine", 0.4, 1320); },
    hit: function () { playTone(220, 0.12, "sawtooth", 0.7, 80); },
    combo: function (n) { playTone(440 + n * 40, 0.1, "triangle", 0.55); },
    power: function () { playTone(120, 0.2, "sawtooth", 0.6, 880); },
    die: function () { playTone(180, 0.35, "sawtooth", 0.7, 40); },
    score: function () { playTone(523, 0.08, "sine", 0.5); playTone(784, 0.12, "sine", 0.45); },
    heartbeat: function () { playTone(60, 0.08, "sine", 0.8); },
    laser: function () { playTone(1200, 0.05, "square", 0.4, 400); },
    pop: function () { playTone(600, 0.06, "triangle", 0.5, 300); },
  };

  function stopBgm() {
    bgmNodes.forEach(function (n) {
      try { n.stop(); } catch (_e) {}
    });
    bgmNodes = [];
  }

  function startBgm(style) {
    stopBgm();
    var ctx = ensureAudio();
    if (!ctx || settings.bgmVolume <= 0) return;
    style = style || "pulse";
    var master = ctx.createGain();
    master.gain.value = settings.bgmVolume * 0.08;
    master.connect(ctx.destination);
    var freqs = style === "ambient" ? [110, 165, 220] : [130.81, 164.81, 196, 261.63];
    freqs.forEach(function (f, i) {
      var osc = ctx.createOscillator();
      var g = ctx.createGain();
      osc.type = i % 2 ? "triangle" : "sine";
      osc.frequency.value = f;
      g.gain.value = 0.35 / freqs.length;
      osc.connect(g);
      g.connect(master);
      osc.start();
      bgmNodes.push(osc);
      (function (oscRef, idx) {
        setInterval(function () {
          if (!bgmNodes.length) return;
          var t = ctx.currentTime;
          oscRef.frequency.setTargetAtTime(f * (1 + Math.sin(t * 0.3 + idx) * 0.02), t, 0.1);
        }, 2000);
      })(osc, i);
    });
  }

  function postToParent(payload) {
    try {
      if (global.parent && global.parent !== global) {
        global.parent.postMessage(payload, "*");
      }
    } catch (_e) {}
  }

  var RESIZE_TYPES = ["rainynightfrog:resize", "nexusplay:resize"];
  var SHOW_MENU_MESSAGE = "rainynightfrog:show-menu";
  var SHOW_MENU_ALIASES = [SHOW_MENU_MESSAGE, "RNF_SHOW_MENU", "nexusplay:show-menu"];
  var shellReturnToMenu = null;

  function invokeReturnToMenu() {
    if (!shellReturnToMenu) return false;
    try {
      shellReturnToMenu();
      return true;
    } catch (_e) {
      return false;
    }
  }

  function isShowMenuMessage(type) {
    return SHOW_MENU_ALIASES.indexOf(type) >= 0;
  }
  var API_PROXY_REQUEST = "rainynightfrog:api-proxy-request";
  var API_PROXY_RESPONSE = "rainynightfrog:api-proxy-response";
  var STORAGE_GET = "rainynightfrog:storage-get";
  var STORAGE_GET_RESPONSE = "rainynightfrog:storage-get-response";
  var STORAGE_SET = "rainynightfrog:storage-set";
  var AUTH_TYPES = ["rainynightfrog:auth", "nexusplay:auth"];
  var READY_TYPES = ["rainynightfrog:ready", "nexusplay:ready"];
  var AUTH_REQUEST_TYPES = ["rainynightfrog:request-auth", "nexusplay:request-auth"];
  var apiProxyWaiters = {};
  var parentStorageWaiters = {};
  var parentStorageCache = {};
  var parentStorageLoaded = {};
  var PARENT_STORAGE_SUFFIXES = ["leaderboard-by-diff", "save"];
  var authUser = null;
  var sessionLoggedInCache = null;
  var gameId = detectGameId();

  var DEFAULT_DIFFICULTIES = [
    { id: "easy", label: "簡單", speedMult: 0.75, scoreMult: 1, ai: 0.7, desc: "較慢節奏，適合暖身" },
    { id: "normal", label: "標準", speedMult: 0.88, scoreMult: 1.35, ai: 1, desc: "平衡體驗" },
    { id: "hard", label: "困難", speedMult: 1.08, scoreMult: 1.85, ai: 1.35, desc: "更快節奏與更多威脅" },
    { id: "extreme", label: "極限", speedMult: 1.32, scoreMult: 2.5, ai: 1.65, desc: "電競級挑戰" },
  ];

  function rnfStorageKey(suffix) {
    return "rnf:" + slug + ":" + suffix;
  }

  function readIframeStorageJson(suffix) {
    try {
      var raw = localStorage.getItem(rnfStorageKey(suffix));
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  function writeIframeStorageJson(suffix, value) {
    try {
      if (value == null) localStorage.removeItem(rnfStorageKey(suffix));
      else localStorage.setItem(rnfStorageKey(suffix), JSON.stringify(value));
    } catch (_e) {}
  }

  function ensureParentStorage(suffix) {
    if (!isEmbedded()) return Promise.resolve(null);
    if (parentStorageLoaded[suffix]) {
      return Promise.resolve(
        Object.prototype.hasOwnProperty.call(parentStorageCache, suffix)
          ? parentStorageCache[suffix]
          : null
      );
    }
    return new Promise(function (resolve) {
      var requestId = "rnf-st-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      var timer = setTimeout(function () {
        delete parentStorageWaiters[requestId];
        if (!parentStorageLoaded[suffix]) {
          var fallback = readIframeStorageJson(suffix);
          if (fallback != null) parentStorageCache[suffix] = fallback;
          parentStorageLoaded[suffix] = true;
        }
        resolve(
          Object.prototype.hasOwnProperty.call(parentStorageCache, suffix)
            ? parentStorageCache[suffix]
            : null
        );
      }, 4000);
      parentStorageWaiters[requestId] = { suffix: suffix, resolve: resolve, timer: timer };
      postToParent({
        type: STORAGE_GET,
        requestId: requestId,
        slug: slug,
        suffix: suffix,
      });
    });
  }

  function prefetchParentStorage() {
    if (!isEmbedded()) return;
    PARENT_STORAGE_SUFFIXES.forEach(function (suffix) {
      ensureParentStorage(suffix).catch(function () {});
    });
  }

  function writeParentStorage(suffix, value) {
    parentStorageCache[suffix] = value;
    parentStorageLoaded[suffix] = true;
    writeIframeStorageJson(suffix, value);
    if (isEmbedded()) {
      postToParent({
        type: STORAGE_SET,
        slug: slug,
        suffix: suffix,
        value: value,
      });
    }
  }

  function readParentStorageSync(suffix, fallbackValue) {
    if (isEmbedded() && parentStorageLoaded[suffix]) {
      return Object.prototype.hasOwnProperty.call(parentStorageCache, suffix)
        ? parentStorageCache[suffix]
        : fallbackValue;
    }
    var local = readIframeStorageJson(suffix);
    return local != null ? local : fallbackValue;
  }

  function detectGameId() {
    var params = new URLSearchParams(location.search);
    var gid = params.get("gid");
    if (gid && !isNaN(parseInt(gid, 10))) return parseInt(gid, 10);
    var embedMatch = location.pathname.match(/\/api\/games\/(\d+)\/embed/);
    if (embedMatch) return parseInt(embedMatch[1], 10);
    return null;
  }

  function isEmbedded() {
    try {
      return global.parent && global.parent !== global;
    } catch (_e) {
      return true;
    }
  }

  function directApiFetch(method, path, body) {
    return fetch(path, {
      method: method,
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { ok: res.ok, status: res.status, data: data };
      });
    });
  }

  function proxyApiFetch(method, path, body) {
    if (!isEmbedded()) return directApiFetch(method, path, body);
    return new Promise(function (resolve, reject) {
      var requestId = "rnf-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      var timer = setTimeout(function () {
        delete apiProxyWaiters[requestId];
        reject(new Error("API proxy timeout"));
      }, 15000);
      apiProxyWaiters[requestId] = { resolve: resolve, reject: reject, timer: timer };
      postToParent({
        type: API_PROXY_REQUEST,
        requestId: requestId,
        method: method,
        path: path,
        body: body || null,
      });
    });
  }

  function bindApiProxy() {
    window.addEventListener("message", function (event) {
      var data = event.data;
      if (!data || data.type !== API_PROXY_RESPONSE) return;
      var waiter = apiProxyWaiters[data.requestId];
      if (!waiter) return;
      clearTimeout(waiter.timer);
      delete apiProxyWaiters[data.requestId];
      if (data.ok) {
        waiter.resolve({ ok: true, status: data.status, data: data.data });
      } else {
        waiter.resolve({
          ok: false,
          status: data.status || 0,
          data: data.data || {},
          error: data.error || "proxy failed",
        });
      }
    });
    window.addEventListener("message", function (event) {
      var data = event.data;
      if (!data || data.type !== STORAGE_GET_RESPONSE) return;
      var waiter = parentStorageWaiters[data.requestId];
      if (!waiter) return;
      clearTimeout(waiter.timer);
      delete parentStorageWaiters[data.requestId];
      parentStorageCache[waiter.suffix] = data.value != null ? data.value : null;
      parentStorageLoaded[waiter.suffix] = true;
      waiter.resolve(parentStorageCache[waiter.suffix]);
    });
    window.addEventListener("message", function (event) {
      var data = event.data;
      if (!data || AUTH_TYPES.indexOf(data.type) === -1) return;
      authUser = data.user || null;
      sessionLoggedInCache = !!authUser;
    });
  }

  function syncAuthFromEmbedSdk() {
    try {
      var api = global.RainyNightFrog || global.NexusPlay;
      if (api && typeof api.getUser === "function") {
        var u = api.getUser();
        if (u) {
          authUser = u;
          sessionLoggedInCache = true;
        }
      }
    } catch (_e) {}
  }

  function requestAuthFromParent() {
    postToParent({ type: AUTH_REQUEST_TYPES[0], gameId: gameId });
    postToParent({ type: AUTH_REQUEST_TYPES[1], gameId: gameId });
  }

  function announceReady() {
    postToParent({ type: READY_TYPES[0], gameId: gameId });
    postToParent({ type: READY_TYPES[1], gameId: gameId });
  }

  function probeSessionLoggedIn() {
    if (!gameId) return Promise.resolve(false);
    return proxyApiFetch("GET", "/api/games/" + gameId + "/save", null)
      .then(function (res) {
        var loggedIn = res.status !== 401;
        sessionLoggedInCache = loggedIn;
        return loggedIn;
      })
      .catch(function () {
        sessionLoggedInCache = false;
        return false;
      });
  }

  function refreshAuthState() {
    syncAuthFromEmbedSdk();
    requestAuthFromParent();
    if (authUser || sessionLoggedInCache === true) {
      return Promise.resolve(true);
    }
    return new Promise(function (resolve) {
      var settled = false;
      function finish(val) {
        if (settled) return;
        settled = true;
        resolve(!!val);
      }
      var timer = setTimeout(function () {
        syncAuthFromEmbedSdk();
        if (authUser) {
          finish(true);
          return;
        }
        probeSessionLoggedIn().then(finish);
      }, 320);
      var poll = setInterval(function () {
        syncAuthFromEmbedSdk();
        if (authUser) {
          clearInterval(poll);
          clearTimeout(timer);
          finish(true);
        }
      }, 60);
      setTimeout(function () { clearInterval(poll); }, 360);
    });
  }

  function isUserLoggedIn(bundle) {
    if (authUser) return true;
    if (sessionLoggedInCache === true) return true;
    if (bundle && bundle.cloud && bundle.cloud.some(function (e) { return e.isMe; })) return true;
    if (bundle && bundle.merged && bundle.merged.some(function (e) { return e.isMe && e.source === "cloud"; })) return true;
    return false;
  }

  function finalizeLeaderboardBundle(bundle) {
    bundle.loggedIn = isUserLoggedIn(bundle);
    return bundle;
  }

  function resolveEntryDifficulty(entry, fallback) {
    fallback = fallback || "normal";
    if (!entry) return fallback;
    if (entry.difficulty) return String(entry.difficulty);
    if (entry.meta && entry.meta.difficulty) return String(entry.meta.difficulty);
    return fallback;
  }

  function readLegacyLocalLeaderboard() {
    try {
      var raw = localStorage.getItem("rnf:" + slug + ":leaderboard");
      return raw ? JSON.parse(raw) : [];
    } catch (_e) {
      return [];
    }
  }

  function readLocalLeaderboardByDiff() {
    try {
      var store = readParentStorageSync("leaderboard-by-diff", null);
      if (store && typeof store === "object" && !Array.isArray(store)) return store;
      var legacy = readLegacyLocalLeaderboard();
      if (!legacy.length) return {};
      store = {};
      legacy.forEach(function (entry) {
        var diff = resolveEntryDifficulty(entry, "normal");
        if (!store[diff]) store[diff] = [];
        store[diff].push(entry);
      });
      writeLocalLeaderboardByDiff(store);
      return store;
    } catch (_e) {
      return {};
    }
  }

  function writeLocalLeaderboardByDiff(store) {
    writeParentStorage("leaderboard-by-diff", store || {});
  }

  function readLocalLeaderboardForDifficulty(difficulty) {
    var store = readLocalLeaderboardByDiff();
    return (store[difficulty] || []).slice();
  }

  function mergeDifficultyLeaderboard(cloud, local, difficulty) {
    var merged = (cloud || []).filter(function (e) {
      return resolveEntryDifficulty(e, "normal") === difficulty;
    }).slice();
    (local || []).forEach(function (le) {
      if (!le.isMe) return;
      var idx = merged.findIndex(function (e) { return e.isMe; });
      if (idx >= 0) {
        if (le.score > merged[idx].score) merged[idx] = Object.assign({}, le, { rank: merged[idx].rank });
      } else {
        merged.push(le);
      }
    });
    merged.sort(function (a, b) { return b.score - a.score; });
    return merged.slice(0, 15).map(function (e, i) {
      return Object.assign({}, e, { rank: i + 1 });
    });
  }

  function fetchLeaderboardBundle(limit, difficulty) {
    limit = limit || 15;
    difficulty = difficulty || "normal";
    var loadPromise = isEmbedded()
      ? ensureParentStorage("leaderboard-by-diff")
      : Promise.resolve(null);
    return loadPromise.then(function () {
      var bundle = {
        cloud: [],
        local: readLocalLeaderboardForDifficulty(difficulty),
        cloudOk: false,
        cloudError: null,
        loggedIn: !!authUser,
        gameId: gameId,
        difficulty: difficulty,
      };
      if (!gameId) {
        bundle.cloudError = "未連結平台遊戲";
        bundle.merged = mergeDifficultyLeaderboard([], bundle.local, difficulty);
        return Promise.resolve(finalizeLeaderboardBundle(bundle));
      }
      var path = "/api/games/" + gameId + "/leaderboard?limit=" + Math.max(limit, 20) + "&difficulty=" + encodeURIComponent(difficulty);
      return refreshAuthState()
        .then(function () {
          return proxyApiFetch("GET", path, null);
        })
        .then(function (res) {
          bundle.cloudOk = !!res.ok;
          var cloud = ((res.data && res.data.entries) || []).map(function (e) {
            return Object.assign({}, e, { source: "cloud", local: false });
          });
          bundle.cloud = filterEntriesByDifficulty(cloud, difficulty);
          if (!res.ok) {
            bundle.cloudError = (res.data && res.data.error) || res.error || "讀取失敗";
          }
          bundle.merged = mergeDifficultyLeaderboard(bundle.cloud, bundle.local, difficulty);
          return finalizeLeaderboardBundle(bundle);
        })
        .catch(function (err) {
          bundle.cloudError = err && err.message ? err.message : "無法連線平台";
          bundle.merged = mergeDifficultyLeaderboard([], bundle.local, difficulty);
          return finalizeLeaderboardBundle(bundle);
        });
    });
  }

  function filterEntriesByDifficulty(entries, difficulty) {
    return (entries || []).filter(function (e) {
      return resolveEntryDifficulty(e, "normal") === difficulty;
    });
  }

  function fetchLeaderboard(limit, difficulty) {
    return fetchLeaderboardBundle(limit, difficulty).then(function (b) { return b.merged || b.cloud; });
  }

  function readLocalLeaderboard() {
    return readLegacyLocalLeaderboard();
  }

  function writeLocalLeaderboard(list) {
    try {
      localStorage.setItem("rnf:" + slug + ":leaderboard", JSON.stringify(list.slice(0, 20)));
    } catch (_e) {}
  }

  function pushLocalScore(score, meta) {
    var difficulty = resolveEntryDifficulty({ meta: meta }, "normal");
    var store = readLocalLeaderboardByDiff();
    var list = store[difficulty] || [];
    var name = (authUser && authUser.displayName) || "本地玩家";
    var entry = {
      playerName: name,
      score: score,
      meta: Object.assign({}, meta || {}, { difficulty: difficulty }),
      isMe: true,
      local: true,
      source: "local",
      updatedAt: new Date().toISOString(),
    };
    var idx = list.findIndex(function (e) { return e.isMe; });
    if (idx >= 0) {
      if (list[idx].score >= score) return list;
      list[idx] = entry;
    } else {
      list.push(entry);
    }
    list.sort(function (a, b) { return b.score - a.score; });
    store[difficulty] = list.slice(0, 20).map(function (e, i) {
      return Object.assign({}, e, { rank: i + 1 });
    });
    writeLocalLeaderboardByDiff(store);
    return store[difficulty];
  }

  function formatDifficultyMeta(meta, labelMap) {
    if (!meta || typeof meta !== "object") return "";
    var diff = meta.difficulty;
    if (!diff) return "";
    if (labelMap && labelMap[diff]) return labelMap[diff];
    var map = {
      easy: "簡單",
      normal: "標準",
      hard: "困難",
      extreme: "極限",
      versus: "雙人對戰",
    };
    return map[diff] || String(diff);
  }

  function renderLeaderboardHtml(entries, loading, error, options) {
    options = options || {};
    if (loading) return '<p class="rnf-lb-empty">載入排行榜中…</p>';
    if (error) return '<p class="rnf-lb-empty">' + error + "</p>";
    if (!entries || !entries.length) return "";
    var showSourceTag = !!options.showSourceTag;
    var showDiffMeta = options.showDiffMeta !== false;
    return entries.map(function (e, i) {
      var rank = e.rank || i + 1;
      var diffLabel = showDiffMeta ? formatDifficultyMeta(e.meta) : "";
      var tag = "";
      if (e.isMe) tag += '<span class="rnf-lb-tag me">你</span>';
      if (showSourceTag) {
        tag +=
          e.source === "cloud"
            ? '<span class="rnf-lb-tag cloud">全站</span>'
            : e.local || e.source === "local"
              ? '<span class="rnf-lb-tag local">本機</span>'
              : "";
      }
      var timeLabel = "";
      if (e.updatedAt) {
        try {
          timeLabel = new Date(e.updatedAt).toLocaleDateString("zh-TW");
        } catch (_e) {}
      }
      var metaBits = [];
      if (diffLabel) metaBits.push(diffLabel);
      if (timeLabel) metaBits.push(timeLabel);
      return (
        '<div class="rnf-lb-row' + (e.isMe ? " me" : "") + '">' +
        '<span class="rnf-lb-rank' + (rank <= 3 ? " top" : "") + '">' + rank + "</span>" +
        '<div class="rnf-lb-player"><div class="rnf-lb-name">' + (e.playerName || "匿名") + tag + "</div>" +
        (metaBits.length ? '<div class="rnf-lb-meta">' + metaBits.join(" · ") + "</div>" : "") +
        "</div>" +
        '<span class="rnf-lb-score">' + Number(e.score || 0).toLocaleString() + "</span></div>"
      );
    }).join("");
  }

  function formatCloudError(msg) {
    if (!msg) return "無法連線平台";
    if (msg.indexOf("game_leaderboard") >= 0 || msg.indexOf("relation") >= 0 && msg.indexOf("does not exist") >= 0) {
      return "平台排行榜資料表尚未建立。管理員請在 Supabase SQL Editor 執行 supabase/game-leaderboard.sql 與 game-leaderboard-by-difficulty.sql，或在本機執行 npm run db:leaderboard";
    }
    return msg;
  }

  function renderLeaderboardPanel(bundle, diffLabel, source) {
    source = source === "local" ? "local" : "cloud";
    var html = "";
    var isLocal = source === "local";

    if (isLocal) {
      html +=
        '<p class="rnf-lb-note">僅此電腦看得到，其他玩家看不到這份名單。</p>';
      var localEntries = (bundle.local || []).map(function (e, i) {
        return Object.assign({}, e, { rank: i + 1, source: "local", local: true });
      });
      if (localEntries.length) {
        html += renderLeaderboardHtml(localEntries, false, null, { showSourceTag: false, showDiffMeta: false });
      } else {
        html += '<p class="rnf-lb-empty">此難度尚無本機紀錄，先玩一局吧！</p>';
      }
      return html;
    }

    if (!bundle.loggedIn) {
      html +=
        '<p class="rnf-lb-note warn">未登入：分數只會留在「僅此電腦」。登入後再玩，才會出現在全站榜。</p>';
    }

    if (bundle.cloudOk && bundle.cloud.length) {
      html += renderLeaderboardHtml(bundle.cloud, false, null, { showSourceTag: false, showDiffMeta: false });
    } else if (bundle.cloudOk) {
      html +=
        '<p class="rnf-lb-empty">' +
        (bundle.loggedIn
          ? "此難度尚無玩家上榜，完成一局即可成為第一位！"
          : "此難度尚無全站紀錄。登入後完成一局即可上榜。") +
        "</p>";
    } else {
      html +=
        '<p class="rnf-lb-empty">無法載入全站榜' +
        (bundle.cloudError ? "：" + formatCloudError(bundle.cloudError) : "") +
        "</p>";
    }
    return html;
  }

  function getTuning() {
    return {
      sensitivity: typeof settings.sensitivity === "number" ? settings.sensitivity : 1,
      gameSpeed: typeof settings.gameSpeed === "number" ? settings.gameSpeed : 1,
    };
  }

  function applyEmbedLayout(width, height, expanded) {
    var root = document.documentElement;
    root.classList.toggle("rnf-embed-mode", (width || 0) > 0);
    root.style.setProperty("--rnf-embed-width", (width || 0) + "px");
    root.style.setProperty("--rnf-embed-height", (height || 0) + "px");
    root.classList.toggle("rnf-embed-expanded", !!expanded);
    root.classList.toggle("rnf-embed-compact", (height || 0) > 0 && (height || 0) < 700);
  }

  function bindEmbedBridge() {
    window.addEventListener("message", function (event) {
      var data = event.data;
      if (!data || !data.type) return;
      if (isShowMenuMessage(data.type)) {
        invokeReturnToMenu();
        return;
      }
      if (RESIZE_TYPES.indexOf(data.type) === -1) return;
      applyEmbedLayout(data.width, data.height, data.expanded);
    });
    applyEmbedLayout(window.innerWidth, window.innerHeight, false);
    window.addEventListener("resize", function () {
      if (!document.documentElement.classList.contains("rnf-embed-mode")) {
        applyEmbedLayout(window.innerWidth, window.innerHeight, false);
      }
    });
  }

  function submitScore(score, metadata) {
    var meta = metadata || {};
    var payload = {
      type: "RNF_SUBMIT_SCORE",
      score: Math.floor(Number(score) || 0),
      timestamp: Date.now(),
      metadata: meta,
    };
    postToParent(payload);
    if (!isEmbedded() && gameId) {
      refreshAuthState().then(function (loggedIn) {
        if (!loggedIn) return;
        directApiFetch("POST", "/api/games/" + gameId + "/leaderboard", {
          score: payload.score,
          meta: Object.assign({}, meta, { submittedAt: payload.timestamp }),
        }).catch(function () {});
      });
    }
    SFX.score();
    return payload;
  }

  function saveData(saveObject) {
    var payload = { type: "RNF_SAVE_DATA", data: saveObject || {} };
    postToParent(payload);
    writeParentStorage("save", saveObject || {});
    return payload;
  }

  function loadLocalSave() {
    var data = readParentStorageSync("save", null);
    if (data && typeof data === "object" && !Array.isArray(data)) return data;
    return null;
  }

  function getSettings() {
    return Object.assign({}, settings);
  }

  function setSettings(partial) {
    settings = Object.assign({}, settings, partial);
    saveSettings(settings);
    if (partial.bgmVolume !== undefined) {
      if (bgmNodes.length) startBgm();
      else if (settings.bgmVolume <= 0) stopBgm();
    }
    return getSettings();
  }

  function isHighQuality() {
    return settings.quality !== "low";
  }

  function triggerShake(intensity, duration) {
    if (!settings.screenShake) return;
    shakeTimer = duration || 0.25;
    var power = intensity || 6;
    var start = performance.now();
    function tick() {
      if (shakeTimer <= 0) {
        shakeOffset.x = 0;
        shakeOffset.y = 0;
        return;
      }
      shakeOffset.x = (Math.random() - 0.5) * power * 2;
      shakeOffset.y = (Math.random() - 0.5) * power * 2;
      shakeTimer -= 0.016;
      requestAnimationFrame(tick);
    }
    tick();
  }

  function applyShake(ctx) {
    if (shakeOffset.x || shakeOffset.y) ctx.translate(shakeOffset.x, shakeOffset.y);
  }

  function createParticles(max) {
    max = max || (isHighQuality() ? 120 : 40);
    var list = [];
    return {
      burst: function (x, y, color, count) {
        count = count || (isHighQuality() ? 14 : 6);
        for (var i = 0; i < count; i++) {
          if (list.length >= max) list.shift();
          var ang = Math.random() * Math.PI * 2;
          var spd = 1 + Math.random() * 4;
          list.push({
            x: x, y: y,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd,
            life: 0.4 + Math.random() * 0.5,
            max: 0.9,
            color: color || "#22d3ee",
            size: 1.5 + Math.random() * 2.5,
          });
        }
      },
      trail: function (x, y, color) {
        if (list.length >= max) list.shift();
        list.push({
          x: x + (Math.random() - 0.5) * 3,
          y: y + (Math.random() - 0.5) * 3,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 0.35,
          max: 0.35,
          color: color || "#a78bfa",
          size: 2 + Math.random() * 2,
        });
      },
      update: function (dt) {
        for (var i = list.length - 1; i >= 0; i--) {
          var p = list[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05;
          p.life -= dt;
          if (p.life <= 0) list.splice(i, 1);
        }
      },
      draw: function (ctx) {
        list.forEach(function (p) {
          var a = Math.max(0, p.life / p.max);
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = isHighQuality() ? 8 : 0;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      },
    };
  }

  function createKeyGuard(canvas) {
    var keysRef = null;
    var bound = false;
    var onBlur = null;
    var onVis = null;
    var onCanvasBlur = null;
    var preventDown = null;

    function clearKeys() {
      if (!keysRef) return;
      for (var k in keysRef) {
        if (Object.prototype.hasOwnProperty.call(keysRef, k)) keysRef[k] = false;
      }
    }

    function attach(keys) {
      detach();
      keysRef = keys;
      bound = true;
      clearKeys();
      onBlur = clearKeys;
      onVis = function () {
        if (document.hidden) clearKeys();
      };
      onCanvasBlur = clearKeys;
      preventDown = function (e) {
        if (!keysRef) return;
        var code = e.code || "";
        if (/^(Arrow|Space|KeyW|KeyA|KeyS|KeyD|Shift|KeyZ)/.test(code)) e.preventDefault();
      };
      window.addEventListener("blur", onBlur);
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("keydown", preventDown, true);
      if (canvas) {
        canvas.setAttribute("tabindex", "0");
        try {
          canvas.focus({ preventScroll: true });
        } catch (_e) {
          canvas.focus();
        }
        canvas.addEventListener("blur", onCanvasBlur);
      }
    }

    function detach() {
      if (!bound) return;
      bound = false;
      clearKeys();
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", preventDown, true);
      if (canvas) canvas.removeEventListener("blur", onCanvasBlur);
      keysRef = null;
    }

    return { attach: attach, detach: detach, clear: clearKeys };
  }

  function buildShell(options) {
    injectStyles();
    options = options || {};
    var root = document.createElement("div");
    root.className = "rnf-root";
    root.innerHTML =
      '<div class="rnf-grid-bg"></div><div class="rnf-glow rnf-glow-a"></div><div class="rnf-glow rnf-glow-b"></div>' +
      '<div id="rnf-menu" class="rnf-screen active"><div class="rnf-panel rnf-scroll"></div></div>' +
      '<div id="rnf-settings" class="rnf-screen"><div class="rnf-panel rnf-scroll"></div></div>' +
      '<div id="rnf-help" class="rnf-screen"><div class="rnf-panel rnf-scroll"></div></div>' +
      '<div id="rnf-leaderboard" class="rnf-screen"><div class="rnf-panel rnf-scroll"></div></div>' +
      '<div id="rnf-game" class="rnf-screen"><div class="rnf-game-wrap"><button type="button" class="rnf-game-home" id="rnf-game-home">主選單</button><div class="rnf-hud" id="rnf-hud"></div><div class="rnf-canvas-wrap"><canvas id="rnf-canvas"></canvas></div></div></div>' +
      '<div id="rnf-over" class="rnf-screen"><div class="rnf-panel rnf-scroll"></div></div>';
    document.body.appendChild(root);

    var menuPanel = root.querySelector("#rnf-menu .rnf-panel");
    var settingsPanel = root.querySelector("#rnf-settings .rnf-panel");
    var helpPanel = root.querySelector("#rnf-help .rnf-panel");
    var leaderboardPanel = root.querySelector("#rnf-leaderboard .rnf-panel");
    var overPanel = root.querySelector("#rnf-over .rnf-panel");
    var canvas = root.querySelector("#rnf-canvas");
    var hud = root.querySelector("#rnf-hud");
    var W = options.width || 960;
    var H = options.height || 520;
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");
    var particles = createParticles();
    var keyGuard = createKeyGuard(canvas);
    var localSave = loadLocalSave() || {};
    var difficulties = options.difficulties || DEFAULT_DIFFICULTIES;
    var selectedDifficulty = localSave.difficulty || difficulties[1]?.id || difficulties[0].id;
    var lbDifficulty = selectedDifficulty;
    var lbSource = null;

    function getBestForDifficulty(diffId) {
      if (localSave.bestScores && localSave.bestScores[diffId] != null) {
        return localSave.bestScores[diffId];
      }
      if (localSave.bestScore && diffId === (localSave.difficulty || selectedDifficulty)) {
        return localSave.bestScore;
      }
      return 0;
    }

    function setBestForDifficulty(diffId, score) {
      if (!localSave.bestScores) localSave.bestScores = {};
      var prev = getBestForDifficulty(diffId);
      if (score <= prev) return prev;
      localSave.bestScores[diffId] = score;
      delete localSave.bestScore;
      return score;
    }

    var bestScore = getBestForDifficulty(selectedDifficulty);
    var enableLeaderboard = options.enableLeaderboard !== false;
    var tuningFlags = options.tuning || { sensitivity: true, gameSpeed: true };
    var showTuning = options.showTuning !== false;

    function hydrateLocalSaveFromParent() {
      if (!isEmbedded()) return;
      ensureParentStorage("save").then(function (remote) {
        if (!remote || typeof remote !== "object" || Array.isArray(remote)) return;
        localSave = Object.assign({}, remote, localSave);
        selectedDifficulty = localSave.difficulty || selectedDifficulty;
        lbDifficulty = selectedDifficulty;
        bestScore = getBestForDifficulty(selectedDifficulty);
        var activeMenu = root.querySelector("#rnf-menu.rnf-screen.active");
        if (activeMenu) renderMenu();
      });
    }

    function getDifficultyConfig() {
      for (var i = 0; i < difficulties.length; i++) {
        if (difficulties[i].id === selectedDifficulty) return difficulties[i];
      }
      return difficulties[0];
    }

    function getSpeedScale() {
      var d = getDifficultyConfig();
      var t = getTuning();
      return (d.speedMult || 1) * (t.gameSpeed || 1);
    }

    function setDifficulty(id) {
      selectedDifficulty = id;
      lbDifficulty = id;
      localSave.difficulty = id;
      bestScore = getBestForDifficulty(id);
      saveData(localSave);
    }

    function renderHelpList(items) {
      if (!items || !items.length) return "";
      return (
        "<ul class=\"rnf-help-list\">" +
        items.map(function (item) {
          return "<li>" + item + "</li>";
        }).join("") +
        "</ul>"
      );
    }

    function renderHelpFeatures(items) {
      if (!items || !items.length) return "";
      return (
        '<div class="rnf-help-section"><h2>新增功能</h2><div class="rnf-help-features">' +
        items.map(function (item) {
          return '<div class="rnf-help-feature"><span class="rnf-help-feature-dot">✦</span><span>' + item + "</span></div>";
        }).join("") +
        "</div></div>"
      );
    }

    function renderHighlights(items) {
      if (!items || !items.length) return "";
      return (
        '<div class="rnf-features">' +
        items.map(function (item) {
          return '<span class="rnf-feature-tag">' + item + "</span>";
        }).join("") +
        "</div>"
      );
    }

    function renderHelpScreen() {
      var h = options.help || {};
      helpPanel.innerHTML =
        '<div class="rnf-badge">HOW TO PLAY</div>' +
        '<h1 class="rnf-title" style="font-size:1.45rem">遊戲說明</h1>' +
        '<div class="rnf-help-body rnf-scroll">' +
        (h.about
          ? '<div class="rnf-help-section"><h2>玩法簡介</h2><p>' + h.about + "</p></div>"
          : "") +
        renderHelpFeatures(h.features) +
        (h.controls && h.controls.length
          ? '<div class="rnf-help-section"><h2>按鍵操作</h2>' + renderHelpList(h.controls) + "</div>"
          : "") +
        (h.tips && h.tips.length
          ? '<div class="rnf-help-section"><h2>小提示</h2>' + renderHelpList(h.tips) + "</div>"
          : "") +
        "</div>" +
        '<div class="rnf-btn-row"><button class="rnf-btn primary" id="rnf-help-back">返回</button></div>';
      show("rnf-help");
      helpPanel.querySelector("#rnf-help-back").onclick = function () {
        SFX.click();
        renderMenu();
        show("rnf-menu");
      };
    }

    function renderLeaderboardScreen() {
      var diffCfg = difficulties.find(function (d) { return d.id === lbDifficulty; }) || getDifficultyConfig();
      if (!lbSource) lbSource = isUserLoggedIn() ? "cloud" : "local";
      var tabButtons = difficulties.map(function (d) {
        return '<button class="rnf-btn' + (d.id === lbDifficulty ? " selected" : "") + '" data-lb-diff="' + d.id + '">' + d.label + "</button>";
      }).join("");
      var sourceTabs =
        '<div class="rnf-lb-tabs">' +
        '<button type="button" class="rnf-lb-tab' + (lbSource === "cloud" ? " active" : "") + '" data-lb-source="cloud">全站榜</button>' +
        '<button type="button" class="rnf-lb-tab' + (lbSource === "local" ? " active" : "") + '" data-lb-source="local">僅此電腦</button>' +
        "</div>";
      leaderboardPanel.innerHTML =
        '<div class="rnf-badge">LEADERBOARD</div>' +
        '<h1 class="rnf-title" style="font-size:1.45rem">排行榜</h1>' +
        '<p class="rnf-sub">每種難度獨立計分；全站榜才是其他玩家看得到的</p>' +
        '<p class="rnf-diff-label">難度</p>' +
        '<div class="rnf-btn-row" id="rnf-lb-diff-row">' + tabButtons + "</div>" +
        sourceTabs +
        '<div class="rnf-lb-list rnf-scroll" id="rnf-lb-list"><p class="rnf-lb-empty">載入中…</p></div>' +
        '<div class="rnf-btn-row"><button class="rnf-btn primary" id="rnf-lb-back">返回</button></div>';
      show("rnf-leaderboard");
      var listEl = leaderboardPanel.querySelector("#rnf-lb-list");
      fetchLeaderboardBundle(15, lbDifficulty).then(function (bundle) {
        listEl.innerHTML = renderLeaderboardPanel(bundle, diffCfg.label, lbSource);
      });
      leaderboardPanel.querySelectorAll("[data-lb-diff]").forEach(function (btn) {
        btn.onclick = function () {
          SFX.click();
          lbDifficulty = btn.getAttribute("data-lb-diff");
          renderLeaderboardScreen();
        };
      });
      leaderboardPanel.querySelectorAll("[data-lb-source]").forEach(function (btn) {
        btn.onclick = function () {
          SFX.click();
          lbSource = btn.getAttribute("data-lb-source");
          renderLeaderboardScreen();
        };
      });
      leaderboardPanel.querySelector("#rnf-lb-back").onclick = function () {
        SFX.click();
        renderMenu();
        show("rnf-menu");
      };
    }

    function renderMenu() {
      var diffCfg = getDifficultyConfig();
      var diffButtons = difficulties.map(function (d) {
        return '<button class="rnf-btn' + (d.id === selectedDifficulty ? " selected" : "") + '" data-diff="' + d.id + '">' + d.label + "</button>";
      }).join("");
      menuPanel.innerHTML =
        '<div class="rnf-badge">' + (options.creator || "RainyNightFrog") + "</div>" +
        '<h1 class="rnf-title">' + (options.title || "RNF Game") + "</h1>" +
        '<p class="rnf-sub">' + (options.subtitle || "賽博 Synthwave 電競重製") + "</p>" +
        renderHighlights(options.highlights || []) +
        '<div class="rnf-stats"><div class="rnf-stat">最佳分數<span>RECORD</span><b id="rnf-best">' + bestScore.toLocaleString() + "</b></div>" +
        '<div class="rnf-stat">難度<span>DIFF</span><b style="font-size:.85rem;color:#c4b5fd">' + diffCfg.label + "</b></div>" +
        '<div class="rnf-stat">分數加成<span>BOOST</span><b style="font-size:.85rem;color:#fbbf24">x' + diffCfg.scoreMult.toFixed(2) + "</b></div></div>" +
        '<p class="rnf-diff-label">選擇難度</p>' +
        '<div class="rnf-btn-row" id="rnf-diff-row">' + diffButtons + "</div>" +
        '<p class="rnf-hint" style="margin-bottom:.5rem">' + diffCfg.desc + "</p>" +
        '<div class="rnf-btn-row"><button class="rnf-btn primary" id="rnf-play">開始遊戲</button>' +
        (options.help ? '<button class="rnf-btn" id="rnf-open-help">遊戲說明</button>' : "") +
        (enableLeaderboard ? '<button class="rnf-btn" id="rnf-open-lb">排行榜</button>' : "") +
        '<button class="rnf-btn" id="rnf-open-settings">設定</button></div>' +
        '<p class="rnf-hint">方向鍵 / WASD · 空白鍵確認 · ESC 返回</p>';
      menuPanel.querySelectorAll("[data-diff]").forEach(function (btn) {
        btn.onclick = function () {
          SFX.click();
          setDifficulty(btn.getAttribute("data-diff"));
          renderMenu();
        };
      });
      menuPanel.querySelector("#rnf-play").onclick = function () {
        SFX.confirm();
        show("rnf-game");
        startBgm(options.bgmStyle || "pulse");
        if (options.onStart) options.onStart();
      };
      menuPanel.querySelector("#rnf-open-settings").onclick = function () {
        SFX.click();
        renderSettings();
        show("rnf-settings");
      };
      var helpBtn = menuPanel.querySelector("#rnf-open-help");
      if (helpBtn) {
        helpBtn.onclick = function () {
          SFX.click();
          renderHelpScreen();
        };
      }
      var lbBtn = menuPanel.querySelector("#rnf-open-lb");
      if (lbBtn) {
        lbBtn.onclick = function () {
          SFX.click();
          lbDifficulty = selectedDifficulty;
          renderLeaderboardScreen();
        };
      }
    }

    var gameHomeBtn = root.querySelector("#rnf-game-home");

    function updateGameHomeBtn() {
      if (!gameHomeBtn) return;
      var gameActive = root.querySelector("#rnf-game").classList.contains("active");
      var overActive = root.querySelector("#rnf-over").classList.contains("active");
      gameHomeBtn.classList.toggle("visible", gameActive || overActive);
    }

    function returnToMenu() {
      SFX.click();
      stopBgm();
      keyGuard.detach();
      try {
        if (options.onStop) options.onStop();
      } catch (_e) {}
      renderMenu();
      show("rnf-menu");
    }

    function show(id) {
      root.querySelectorAll(".rnf-screen").forEach(function (s) {
        s.classList.toggle("active", s.id === id);
      });
      updateGameHomeBtn();
    }

    if (gameHomeBtn) {
      gameHomeBtn.onclick = returnToMenu;
    }
    shellReturnToMenu = returnToMenu;

    function renderSettings() {
      var tuningHtml = "";
      if (showTuning) {
        if (tuningFlags.sensitivity !== false) {
          tuningHtml +=
            '<div class="rnf-setting-row"><span>操作靈敏度</span><input type="range" id="rnf-sens" min="50" max="150" value="' +
            Math.round((settings.sensitivity || 1) * 100) +
            '"><b id="rnf-sens-v">' + Math.round((settings.sensitivity || 1) * 100) + "%</b></div>";
        }
        if (tuningFlags.gameSpeed !== false) {
          tuningHtml +=
            '<div class="rnf-setting-row"><span>遊戲速度</span><input type="range" id="rnf-speed" min="70" max="130" value="' +
            Math.round((settings.gameSpeed || 1) * 100) +
            '"><b id="rnf-speed-v">' + Math.round((settings.gameSpeed || 1) * 100) + "%</b></div>";
        }
      }
      settingsPanel.innerHTML =
        '<h1 class="rnf-title" style="font-size:1.4rem">設定</h1>' +
        '<div class="rnf-settings">' +
        tuningHtml +
        '<div class="rnf-setting-row"><span>音效 SFX</span><input type="range" id="rnf-sfx" min="0" max="100" value="' + Math.round(settings.sfxVolume * 100) + '"><b id="rnf-sfx-v">' + Math.round(settings.sfxVolume * 100) + "%</b></div>" +
        '<div class="rnf-setting-row"><span>背景音樂 BGM</span><input type="range" id="rnf-bgm" min="0" max="100" value="' + Math.round(settings.bgmVolume * 100) + '"><b id="rnf-bgm-v">' + Math.round(settings.bgmVolume * 100) + "%</b></div>" +
        '<div class="rnf-setting-row"><span>螢幕震動</span><button class="rnf-toggle ' + (settings.screenShake ? "on" : "") + '" id="rnf-shake">' + (settings.screenShake ? "開啟" : "關閉") + "</button></div>" +
        '<div class="rnf-setting-row"><span>畫質</span><div class="rnf-btn-row" style="margin:0"><button class="rnf-btn ' + (settings.quality === "high" ? "selected" : "") + '" id="rnf-q-h">High</button><button class="rnf-btn ' + (settings.quality === "low" ? "selected" : "") + '" id="rnf-q-l">Low</button></div></div>' +
        "</div>" +
        '<div class="rnf-btn-row"><button class="rnf-btn primary" id="rnf-settings-back">返回</button></div>';
      var sensR = settingsPanel.querySelector("#rnf-sens");
      if (sensR) {
        sensR.oninput = function () {
          setSettings({ sensitivity: sensR.value / 100 });
          settingsPanel.querySelector("#rnf-sens-v").textContent = sensR.value + "%";
        };
      }
      var speedR = settingsPanel.querySelector("#rnf-speed");
      if (speedR) {
        speedR.oninput = function () {
          setSettings({ gameSpeed: speedR.value / 100 });
          settingsPanel.querySelector("#rnf-speed-v").textContent = speedR.value + "%";
        };
      }
      var sfxR = settingsPanel.querySelector("#rnf-sfx");
      var bgmR = settingsPanel.querySelector("#rnf-bgm");
      sfxR.oninput = function () {
        setSettings({ sfxVolume: sfxR.value / 100 });
        settingsPanel.querySelector("#rnf-sfx-v").textContent = sfxR.value + "%";
      };
      bgmR.oninput = function () {
        setSettings({ bgmVolume: bgmR.value / 100 });
        settingsPanel.querySelector("#rnf-bgm-v").textContent = bgmR.value + "%";
      };
      settingsPanel.querySelector("#rnf-shake").onclick = function () {
        SFX.click();
        setSettings({ screenShake: !settings.screenShake });
        renderSettings();
      };
      settingsPanel.querySelector("#rnf-q-h").onclick = function () { SFX.click(); setSettings({ quality: "high" }); renderSettings(); };
      settingsPanel.querySelector("#rnf-q-l").onclick = function () { SFX.click(); setSettings({ quality: "low" }); renderSettings(); };
      settingsPanel.querySelector("#rnf-settings-back").onclick = function () { SFX.click(); show("rnf-menu"); };
    }

    function gameOver(score, extra) {
      stopBgm();
      keyGuard.detach();
      var diffCfg = getDifficultyConfig();
      var rawScore = Math.floor(Number(score) || 0);
      var meta = Object.assign({ slug: slug, difficulty: diffCfg.id, rawScore: rawScore }, extra || {});
      lbDifficulty = resolveEntryDifficulty({ meta: meta }, diffCfg.id);
      var recordDiff = difficulties.find(function (d) { return d.id === lbDifficulty; }) || diffCfg;
      var finalScore = Math.floor(rawScore * (recordDiff.scoreMult || 1));
      var updatedBest = setBestForDifficulty(lbDifficulty, finalScore);
      if (updatedBest > bestScore) bestScore = updatedBest;
      localSave = Object.assign({}, localSave, meta);
      saveData(localSave);
      pushLocalScore(finalScore, meta);
      submitScore(finalScore, meta);
      var uploadHint = isUserLoggedIn()
        ? "已上傳至全站榜"
        : "已存僅此電腦；登入後再玩才會上全站榜";
      overPanel.innerHTML =
        '<div class="rnf-badge">GAME OVER</div><h1 class="rnf-title" style="font-size:1.6rem">任務結束</h1>' +
        '<div class="rnf-score-big">' + finalScore.toLocaleString() + "</div>" +
        '<p class="rnf-sub">難度 ' + recordDiff.label + ' · 加成 x' + recordDiff.scoreMult.toFixed(2) +
        (rawScore !== finalScore ? " · 原始 " + rawScore.toLocaleString() : "") + "</p>" +
        '<p class="rnf-sub">' + uploadHint + "</p>" +
        '<div class="rnf-stats"><div class="rnf-stat">最佳<span>BEST</span><b>' + bestScore.toLocaleString() + "</b></div>" +
        '<div class="rnf-stat">難度<span>DIFF</span><b style="font-size:.85rem;color:#c4b5fd">' + recordDiff.label + "</b></div></div>" +
        '<div class="rnf-btn-row"><button class="rnf-btn primary" id="rnf-retry">再玩一次</button>' +
        (enableLeaderboard ? '<button class="rnf-btn" id="rnf-over-lb">排行榜</button>' : "") +
        '<button class="rnf-btn" id="rnf-menu-back">主選單</button></div>';
      overPanel.querySelector("#rnf-retry").onclick = function () {
        SFX.confirm();
        show("rnf-game");
        startBgm(options.bgmStyle || "pulse");
        if (options.onStart) options.onStart(true);
      };
      var overLb = overPanel.querySelector("#rnf-over-lb");
      if (overLb) {
        overLb.onclick = function () {
          SFX.click();
          renderLeaderboardScreen();
        };
      }
      overPanel.querySelector("#rnf-menu-back").onclick = function () {
        SFX.click();
        renderMenu();
        show("rnf-menu");
      };
      show("rnf-over");
    }

    renderMenu();
    hydrateLocalSaveFromParent();

    return {
      root: root,
      canvas: canvas,
      ctx: ctx,
      hud: hud,
      width: W,
      height: H,
      particles: particles,
      show: show,
      gameOver: gameOver,
      setHud: function (html) { hud.innerHTML = html; },
      saveProgress: function (data) {
        localSave = Object.assign({}, localSave, data);
        saveData(localSave);
      },
      getSave: function () { return Object.assign({}, localSave); },
      getDifficulty: getDifficultyConfig,
      getDiff: getDifficultyConfig,
      getTuning: getTuning,
      getSpeedScale: getSpeedScale,
      attachKeyboard: function (keys) { keyGuard.attach(keys); return keys; },
      detachKeyboard: function () { keyGuard.detach(); },
      clearKeyboard: function () { keyGuard.clear(); },
      applyShake: applyShake,
      triggerShake: triggerShake,
      isHighQuality: isHighQuality,
      returnToMenu: returnToMenu,
    };
  }

  var RNF = {
    slug: slug,
    init: function () {
      injectStyles();
      ensureAudio();
      bindEmbedBridge();
      bindApiProxy();
      gameId = detectGameId();
      announceReady();
      prefetchParentStorage();
      setTimeout(announceReady, 120);
      setTimeout(announceReady, 500);
      setTimeout(function () {
        syncAuthFromEmbedSdk();
        if (!authUser) probeSessionLoggedIn();
      }, 200);
      return RNF;
    },
    getSettings: getSettings,
    setSettings: setSettings,
    submitScore: submitScore,
    saveData: saveData,
    loadLocalSave: loadLocalSave,
    buildShell: buildShell,
    sfx: SFX,
    startBgm: startBgm,
    stopBgm: stopBgm,
    triggerShake: triggerShake,
    applyShake: applyShake,
    createParticles: createParticles,
    ensureAudio: ensureAudio,
    fetchLeaderboard: fetchLeaderboard,
    fetchLeaderboardBundle: fetchLeaderboardBundle,
    getTuning: getTuning,
    getGameId: function () { return gameId; },
    showMainMenu: invokeReturnToMenu,
    isHighQuality: isHighQuality,
  };

  global.RNF = RNF;
})(typeof window !== "undefined" ? window : this);
