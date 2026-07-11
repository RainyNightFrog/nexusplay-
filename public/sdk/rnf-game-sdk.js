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
      ".rnf-game-wrap{display:flex;flex-direction:column;width:100%;height:100%;max-width:960px;max-height:600px;min-height:0;padding:.25rem .35rem .4rem}" +
      ".rnf-hud{display:grid;grid-template-columns:repeat(auto-fit,minmax(70px,1fr));gap:.25rem;padding:.38rem .5rem;background:rgba(0,0,0,.65);border:1px solid rgba(34,211,238,.25);border-radius:8px;margin-bottom:.3rem;font-size:.68rem;flex-shrink:0}" +
      ".rnf-hud span{display:block;color:#64748b;font-size:.56rem;letter-spacing:.08em}" +
      ".rnf-hud b{color:#22d3ee;font-size:.92rem;font-variant-numeric:tabular-nums}" +
      ".rnf-canvas-wrap{flex:1;min-height:0;position:relative;border:1px solid rgba(34,211,238,.3);border-radius:10px;overflow:hidden;background:#060a12;box-shadow:0 0 30px rgba(34,211,238,.08)}" +
      ".rnf-canvas-wrap canvas{display:block;width:100%;height:100%}" +
      ".rnf-score-big{font-size:clamp(2rem,6vw,3rem);font-weight:900;color:#22d3ee;margin:.5rem 0;font-variant-numeric:tabular-nums;text-shadow:0 0 24px rgba(34,211,238,.5)}" +
      ".rnf-hint{font-size:.72rem;color:#64748b;margin-top:.35rem}";
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

  function submitScore(score, metadata) {
    var payload = {
      type: "RNF_SUBMIT_SCORE",
      score: Math.floor(Number(score) || 0),
      timestamp: Date.now(),
      metadata: metadata || {},
    };
    postToParent(payload);
    SFX.score();
    return payload;
  }

  function saveData(saveObject) {
    var payload = { type: "RNF_SAVE_DATA", data: saveObject || {} };
    postToParent(payload);
    try {
      localStorage.setItem("rnf:" + slug + ":save", JSON.stringify(saveObject));
    } catch (_e) {}
    return payload;
  }

  function loadLocalSave() {
    try {
      var raw = localStorage.getItem("rnf:" + slug + ":save");
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
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

  function buildShell(options) {
    injectStyles();
    options = options || {};
    var root = document.createElement("div");
    root.className = "rnf-root";
    root.innerHTML =
      '<div class="rnf-grid-bg"></div><div class="rnf-glow rnf-glow-a"></div><div class="rnf-glow rnf-glow-b"></div>' +
      '<div id="rnf-menu" class="rnf-screen active"><div class="rnf-panel"></div></div>' +
      '<div id="rnf-settings" class="rnf-screen"><div class="rnf-panel"></div></div>' +
      '<div id="rnf-game" class="rnf-screen"><div class="rnf-game-wrap"><div class="rnf-hud" id="rnf-hud"></div><div class="rnf-canvas-wrap"><canvas id="rnf-canvas"></canvas></div></div></div>' +
      '<div id="rnf-over" class="rnf-screen"><div class="rnf-panel"></div></div>';
    document.body.appendChild(root);

    var menuPanel = root.querySelector("#rnf-menu .rnf-panel");
    var settingsPanel = root.querySelector("#rnf-settings .rnf-panel");
    var overPanel = root.querySelector("#rnf-over .rnf-panel");
    var canvas = root.querySelector("#rnf-canvas");
    var hud = root.querySelector("#rnf-hud");
    var W = options.width || 960;
    var H = options.height || 520;
    canvas.width = W;
    canvas.height = H;
    var ctx = canvas.getContext("2d");
    var particles = createParticles();
    var localSave = loadLocalSave() || {};
    var bestScore = localSave.bestScore || 0;

    function show(id) {
      root.querySelectorAll(".rnf-screen").forEach(function (s) {
        s.classList.toggle("active", s.id === id);
      });
    }

    function renderMenu() {
      menuPanel.innerHTML =
        '<div class="rnf-badge">' + (options.creator || "RainyNightFrog") + "</div>" +
        '<h1 class="rnf-title">' + (options.title || "RNF Game") + "</h1>" +
        '<p class="rnf-sub">' + (options.subtitle || "賽博 Synthwave 電競重製") + "</p>" +
        '<div class="rnf-stats"><div class="rnf-stat">最佳分數<span>RECORD</span><b id="rnf-best">' + bestScore.toLocaleString() + "</b></div>" +
        '<div class="rnf-stat">創作者<span>STUDIO</span><b style="font-size:.85rem;color:#c4b5fd">' + (options.creator || "-") + "</b></div></div>" +
        '<div class="rnf-btn-row"><button class="rnf-btn primary" id="rnf-play">開始遊戲</button>' +
        '<button class="rnf-btn" id="rnf-open-settings">設定</button></div>' +
        '<p class="rnf-hint">方向鍵 / WASD · 空白鍵確認 · ESC 返回</p>';
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
    }

    function renderSettings() {
      settingsPanel.innerHTML =
        '<h1 class="rnf-title" style="font-size:1.4rem">設定</h1>' +
        '<div class="rnf-settings">' +
        '<div class="rnf-setting-row"><span>音效 SFX</span><input type="range" id="rnf-sfx" min="0" max="100" value="' + Math.round(settings.sfxVolume * 100) + '"><b id="rnf-sfx-v">' + Math.round(settings.sfxVolume * 100) + "%</b></div>" +
        '<div class="rnf-setting-row"><span>背景音樂 BGM</span><input type="range" id="rnf-bgm" min="0" max="100" value="' + Math.round(settings.bgmVolume * 100) + '"><b id="rnf-bgm-v">' + Math.round(settings.bgmVolume * 100) + "%</b></div>" +
        '<div class="rnf-setting-row"><span>螢幕震動</span><button class="rnf-toggle ' + (settings.screenShake ? "on" : "") + '" id="rnf-shake">' + (settings.screenShake ? "開啟" : "關閉") + "</button></div>" +
        '<div class="rnf-setting-row"><span>畫質</span><div class="rnf-btn-row" style="margin:0"><button class="rnf-btn ' + (settings.quality === "high" ? "selected" : "") + '" id="rnf-q-h">High</button><button class="rnf-btn ' + (settings.quality === "low" ? "selected" : "") + '" id="rnf-q-l">Low</button></div></div>" +
        "</div>" +
        '<div class="rnf-btn-row"><button class="rnf-btn primary" id="rnf-settings-back">返回</button></div>';
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
      if (score > bestScore) {
        bestScore = score;
        localSave.bestScore = bestScore;
        localSave = Object.assign({}, localSave, extra || {});
        saveData(localSave);
      }
      submitScore(score, Object.assign({ slug: slug }, extra || {}));
      overPanel.innerHTML =
        '<div class="rnf-badge">GAME OVER</div><h1 class="rnf-title" style="font-size:1.6rem">任務結束</h1>' +
        '<div class="rnf-score-big">' + Math.floor(score).toLocaleString() + "</div>" +
        '<p class="rnf-sub">分數已自動上傳至 RainyNightFrog 排行榜</p>' +
        '<div class="rnf-stats"><div class="rnf-stat">最佳<span>BEST</span><b>' + bestScore.toLocaleString() + "</b></div></div>" +
        '<div class="rnf-btn-row"><button class="rnf-btn primary" id="rnf-retry">再玩一次</button><button class="rnf-btn" id="rnf-menu-back">主選單</button></div>';
      overPanel.querySelector("#rnf-retry").onclick = function () {
        SFX.confirm();
        show("rnf-game");
        startBgm(options.bgmStyle || "pulse");
        if (options.onStart) options.onStart(true);
      };
      overPanel.querySelector("#rnf-menu-back").onclick = function () {
        SFX.click();
        renderMenu();
        show("rnf-menu");
      };
      show("rnf-over");
    }

    renderMenu();

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
      applyShake: applyShake,
      triggerShake: triggerShake,
      isHighQuality: isHighQuality,
    };
  }

  var RNF = {
    slug: slug,
    init: function () { injectStyles(); ensureAudio(); return RNF; },
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
    isHighQuality: isHighQuality,
  };

  global.RNF = RNF;
})(typeof window !== "undefined" ? window : this);
