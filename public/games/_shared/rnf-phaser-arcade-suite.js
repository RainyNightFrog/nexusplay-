(function () {
  "use strict";

  var W = 960;
  var H = 540;
  var DEFAULT_SLUG = "rnf-suite";
  var DIFF_PRESETS = {
    casual: { id: "casual", label: "Casual 輕鬆", base: 0.78, scoreMult: 1.0, color: "#67e8f9" },
    standard: { id: "standard", label: "Standard 電競", base: 1.0, scoreMult: 1.25, color: "#a78bfa" },
    extreme: { id: "extreme", label: "Extreme 狂暴", base: 1.38, scoreMult: 1.65, color: "#f472b6" }
  };

  var audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function beep(freq, dur, type, vol, slide) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var master = 1;
    try {
      if (typeof window.RNF !== "undefined" && RNF.getGameVolume) master = RNF.getGameVolume();
      else if (typeof window.__RNF_GAME_VOLUME__ === "number") master = window.__RNF_GAME_VOLUME__;
    } catch (_e) {}
    if (master <= 0) return;
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
    gain.gain.setValueAtTime((vol || 0.09) * master, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  var SFX = {
    click: function () { beep(560, 0.05, "triangle", 0.06); },
    confirm: function () { beep(680, 0.08, "square", 0.08); beep(920, 0.1, "square", 0.06); },
    jump: function () { beep(280, 0.1, "sawtooth", 0.09, 620); },
    score: function () { beep(760, 0.08, "square", 0.1); beep(960, 0.09, "triangle", 0.07); },
    hit: function () { beep(170, 0.12, "sawtooth", 0.12, 70); },
    slash: function () { beep(440, 0.06, "sawtooth", 0.08, 980); },
    dash: function () { beep(200, 0.08, "triangle", 0.08, 700); },
    shoot: function () { beep(620, 0.04, "square", 0.06, 520); },
    pinball: function () { beep(840, 0.05, "square", 0.08); beep(1120, 0.05, "triangle", 0.05); },
    beat: function () { beep(700, 0.05, "triangle", 0.07); },
    explode: function () { beep(120, 0.22, "sawtooth", 0.14, 40); beep(92, 0.25, "triangle", 0.08, 30); },
    over: function () { beep(220, 0.18, "sawtooth", 0.12, 80); beep(140, 0.35, "triangle", 0.09, 50); },
    // 節奏判定專用打擊音
    perfect: function () {
      beep(880, 0.06, "square", 0.11);
      beep(1320, 0.09, "triangle", 0.1);
      beep(1760, 0.12, "sine", 0.07);
    },
    great: function () {
      beep(740, 0.06, "square", 0.1);
      beep(1100, 0.1, "triangle", 0.08);
    },
    good: function () {
      beep(620, 0.07, "triangle", 0.08);
    },
    combo: function () {
      beep(520, 0.05, "square", 0.08);
      beep(780, 0.08, "square", 0.09);
      beep(1040, 0.12, "triangle", 0.07);
    }
  };

  function masterVol() {
    try {
      if (typeof window.RNF !== "undefined" && RNF.getGameVolume) return RNF.getGameVolume();
      if (typeof window.__RNF_GAME_VOLUME__ === "number") return window.__RNF_GAME_VOLUME__;
    } catch (_e) {}
    return 1;
  }

  function noiseHit(dur, vol, hpFreq) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var m = masterVol();
    if (m <= 0) return;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    var filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = hpFreq || 1800;
    var g = ctx.createGain();
    var t0 = ctx.currentTime;
    g.gain.setValueAtTime((vol || 0.05) * m, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /** 虛空節奏：依 BPM 的電子鼓＋貝斯＋旋律（無外部音檔） */
  function playRhythmStep(step, fever, intensity) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var m = masterVol();
    if (m <= 0) return;
    intensity = intensity || 1;
    var s = step % 16;
    var hot = !!fever;

    // Kick：每拍
    if (s % 4 === 0) {
      beep(150, 0.12, "sine", 0.14 * intensity, 48);
      beep(70, 0.1, "triangle", 0.1 * intensity, 40);
    }
    // Snare：2、4 拍
    if (s === 4 || s === 12) {
      noiseHit(0.09, 0.07 * intensity, 1200);
      beep(220, 0.06, "triangle", 0.05 * intensity, 120);
    }
    // Hi-hat：八分；Fever 加密
    if (s % 2 === 0 || hot) {
      noiseHit(hot ? 0.035 : 0.045, (hot ? 0.045 : 0.032) * intensity, hot ? 6000 : 4500);
    }
    // 貝斯 root
    if (s % 4 === 0) {
      var bassScale = [55, 65.41, 73.42, 82.41];
      var bf = bassScale[(step >> 2) % bassScale.length];
      beep(bf, 0.22, "sawtooth", 0.07 * intensity, bf * 0.7);
    }
    // 旋律琶音（偏拍）
    if (s === 2 || s === 6 || s === 10 || s === 14 || (hot && s % 2 === 1)) {
      var lead = [523.25, 659.25, 783.99, 987.77, 880, 698.46];
      var lf = lead[(step + (hot ? 2 : 0)) % lead.length] * (hot ? 1.01 : 1);
      beep(lf, 0.08, "square", (hot ? 0.055 : 0.04) * intensity);
      if (hot) beep(lf * 1.5, 0.06, "triangle", 0.03 * intensity);
    }
    // Fever 額外衝擊
    if (hot && s === 0) {
      beep(98, 0.18, "sine", 0.08 * intensity, 55);
    }
  }

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.clear();
    g.fillStyle(0x22d3ee, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(11, 11, 5);
    g.generateTexture("player-orb", 32, 32);

    // 賽博地牢佔位（稍後由 RNFCyberRogueArt 覆寫成像素機甲）
    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillRect(8, 18, 44, 16);
    g.generateTexture("player-fighter", 60, 56);
    g.generateTexture("player-fighter-mk2", 64, 56);

    g.clear();
    g.fillStyle(0xf97316, 1);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0xfde68a, 1);
    g.fillCircle(8, 8, 3);
    g.generateTexture("engine-flame", 16, 16);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(10, 10, 10);
    g.generateTexture("muzzle-flash", 20, 20);

    g.clear();
    g.fillStyle(0x06b6d4, 1);
    g.fillRoundedRect(4, 10, 40, 12, 5);
    g.fillStyle(0x67e8f9, 1);
    g.fillRect(8, 13, 32, 6);
    g.generateTexture("paddle", 48, 32);

    g.clear();
    g.fillStyle(0x22d3ee, 1);
    g.fillRoundedRect(0, 4, 120, 16, 7);
    g.fillStyle(0xffffff, 0.4);
    g.fillRoundedRect(10, 7, 36, 6, 3);
    g.generateTexture("flipper", 120, 24);

    g.clear();
    g.fillStyle(0xf472b6, 1);
    g.fillTriangle(16, 2, 30, 28, 2, 28);
    g.fillStyle(0xffffff, 0.32);
    g.fillCircle(16, 16, 4);
    g.generateTexture("drone", 32, 32);

    // 賽博地牢：多型敵人
    g.clear();
    g.fillStyle(0x38bdf8, 1);
    g.fillTriangle(14, 1, 27, 26, 1, 26);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(14, 14, 3);
    g.generateTexture("foe-scout", 28, 28);

    g.clear();
    g.fillStyle(0xf97316, 1);
    g.fillRoundedRect(2, 2, 28, 28, 4);
    g.fillStyle(0xfed7aa, 0.5);
    g.fillRect(7, 8, 18, 6);
    g.generateTexture("foe-grunt", 32, 32);

    g.clear();
    g.fillStyle(0x64748b, 1);
    g.fillCircle(18, 18, 16);
    g.lineStyle(3, 0x94a3b8, 1);
    g.strokeCircle(18, 18, 13);
    g.fillStyle(0x22d3ee, 0.7);
    g.fillCircle(18, 18, 5);
    g.generateTexture("foe-shield", 36, 36);

    g.clear();
    g.fillStyle(0xa855f7, 1);
    g.fillTriangle(16, 2, 30, 16, 16, 30);
    g.fillTriangle(16, 2, 2, 16, 16, 30);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(16, 16, 4);
    g.generateTexture("foe-spitter", 32, 32);

    g.clear();
    g.fillStyle(0xef4444, 1);
    g.fillRoundedRect(0, 0, 44, 44, 6);
    g.fillStyle(0xfbbf24, 0.55);
    g.fillCircle(22, 22, 10);
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(10, 8, 24, 6);
    g.generateTexture("foe-elite", 44, 44);

    g.clear();
    g.fillStyle(0xfb7185, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0xfef08a, 0.85);
    g.fillCircle(16, 16, 6);
    g.generateTexture("foe-bomber", 32, 32);

    g.clear();
    g.fillStyle(0x4ade80, 1);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0xffffff, 0.45);
    g.fillCircle(6, 6, 2);
    g.generateTexture("foe-swarm", 16, 16);

    // 更多敵外形
    g.clear();
    g.fillStyle(0x14b8a6, 1);
    g.fillEllipse(18, 12, 32, 16);
    g.fillStyle(0x99f6e4, 0.5);
    g.fillCircle(10, 10, 4);
    g.fillTriangle(30, 8, 40, 12, 30, 16);
    g.generateTexture("foe-crawler", 40, 24);

    g.clear();
    g.fillStyle(0x6366f1, 1);
    g.fillTriangle(12, 2, 22, 28, 2, 28);
    g.fillStyle(0xc7d2fe, 0.55);
    g.fillRect(8, 10, 8, 14);
    g.generateTexture("foe-sniper", 24, 30);

    g.clear();
    g.fillStyle(0xb45309, 1);
    g.fillRoundedRect(0, 0, 48, 40, 5);
    g.fillStyle(0xfbbf24, 0.45);
    g.fillRect(8, 8, 32, 10);
    g.fillStyle(0x78716c, 1);
    g.fillRect(4, 28, 40, 8);
    g.generateTexture("foe-jugger", 48, 40);

    g.clear();
    g.fillStyle(0xd946ef, 1);
    g.fillCircle(16, 16, 13);
    g.fillStyle(0x0f172a, 1);
    g.fillRect(6, 12, 20, 8);
    g.fillStyle(0xfae8ff, 0.7);
    g.fillCircle(16, 16, 4);
    g.generateTexture("foe-glitch", 32, 32);

    g.clear();
    g.fillStyle(0xf59e0b, 1);
    g.fillTriangle(16, 0, 28, 20, 4, 20);
    g.fillStyle(0xfef3c7, 0.5);
    g.fillTriangle(16, 8, 22, 20, 10, 20);
    g.generateTexture("foe-wasp", 32, 24);

    // 限時掉落膠囊（加大，場上一定看得見）
    g.clear();
    g.fillStyle(0xfacc15, 0.35);
    g.fillCircle(18, 18, 18);
    g.fillStyle(0xfacc15, 1);
    g.fillRoundedRect(4, 4, 28, 28, 8);
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(18, 8, 26, 22, 10, 22);
    g.fillRect(16, 20, 4, 8);
    g.generateTexture("drop-thunder", 36, 36);

    g.clear();
    g.fillStyle(0xef4444, 0.35);
    g.fillCircle(18, 18, 18);
    g.fillStyle(0xef4444, 1);
    g.fillRoundedRect(4, 4, 28, 28, 8);
    g.fillStyle(0xfbbf24, 1);
    g.fillTriangle(18, 8, 28, 24, 8, 24);
    g.fillStyle(0xffffff, 0.7);
    g.fillTriangle(18, 14, 24, 24, 12, 24);
    g.generateTexture("drop-fire", 36, 36);

    g.clear();
    g.fillStyle(0x38bdf8, 0.35);
    g.fillCircle(18, 18, 18);
    g.fillStyle(0x38bdf8, 1);
    g.fillRoundedRect(4, 4, 28, 28, 8);
    g.fillStyle(0xe0f2fe, 1);
    g.fillCircle(18, 14, 8);
    g.fillRect(13, 20, 10, 8);
    g.generateTexture("drop-ice", 36, 36);

    g.clear();
    g.fillStyle(0xf472b6, 0.35);
    g.fillCircle(18, 18, 18);
    g.fillStyle(0xf472b6, 1);
    g.fillRoundedRect(4, 4, 28, 28, 8);
    g.fillStyle(0xffffff, 0.9);
    g.fillTriangle(8, 18, 28, 10, 28, 26);
    g.generateTexture("drop-missile", 36, 36);

    g.clear();
    g.fillStyle(0x94a3b8, 0.35);
    g.fillCircle(18, 18, 18);
    g.fillStyle(0x94a3b8, 1);
    g.fillRoundedRect(4, 4, 28, 28, 8);
    g.fillStyle(0xe2e8f0, 1);
    g.fillCircle(18, 18, 10);
    g.lineStyle(3, 0x64748b, 1);
    g.strokeCircle(18, 18, 7);
    g.generateTexture("drop-armor", 36, 36);

    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillTriangle(0, 8, 20, 0, 20, 16);
    g.fillStyle(0xfde68a, 0.9);
    g.fillRect(10, 5, 10, 6);
    g.fillStyle(0xf472b6, 1);
    g.fillCircle(4, 8, 3);
    g.generateTexture("bullet-missile", 20, 16);

    g.clear();
    g.fillStyle(0xf97316, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xfef08a, 0.95);
    g.fillCircle(8, 8, 4);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(6, 6, 2);
    g.generateTexture("bullet-fire", 16, 16);

    g.clear();
    g.fillStyle(0xfacc15, 1);
    g.fillRect(0, 2, 24, 6);
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(20, 5, 5);
    g.fillStyle(0xfde68a, 1);
    g.fillCircle(22, 5, 2);
    g.generateTexture("bullet-thunder", 24, 10);

    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(12, 12, 10);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(8, 8, 3);
    g.generateTexture("ball", 24, 24);

    g.clear();
    g.fillStyle(0x818cf8, 1);
    g.fillRoundedRect(0, 0, 64, 20, 8);
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(4, 4, 56, 6, 4);
    g.generateTexture("bumper-bar", 64, 20);

    g.clear();
    g.fillStyle(0xfb7185, 1);
    g.fillRoundedRect(0, 0, 56, 18, 7);
    g.fillStyle(0xffffff, 0.45);
    g.fillRoundedRect(8, 5, 40, 5, 3);
    g.generateTexture("note", 56, 18);

    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillRoundedRect(0, 0, 56, 18, 7);
    g.fillStyle(0xffffff, 0.5);
    g.fillRoundedRect(8, 5, 40, 5, 3);
    g.generateTexture("note-gold", 56, 18);

    g.clear();
    g.fillStyle(0xa78bfa, 1);
    g.fillRoundedRect(0, 0, 16, 72, 6);
    g.fillStyle(0xffffff, 0.28);
    g.fillRoundedRect(3, 6, 10, 60, 4);
    g.generateTexture("note-hold", 16, 72);

    g.clear();
    g.fillStyle(0x34d399, 1);
    g.fillRect(0, 0, 68, 28);
    g.fillStyle(0xffffff, 0.18);
    g.fillRect(6, 4, 54, 8);
    g.generateTexture("runner", 68, 28);

    g.clear();
    g.fillStyle(0xe879f9, 1);
    g.fillRect(0, 0, 40, 40);
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(6, 6, 28, 10);
    g.generateTexture("block", 40, 40);

    g.clear();
    g.fillStyle(0x10b981, 1);
    g.fillCircle(10, 10, 10);
    g.generateTexture("xp", 20, 20);

    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillRoundedRect(0, 2, 22, 8, 3);
    g.fillStyle(0xffffff, 0.95);
    g.fillRoundedRect(12, 3, 10, 6, 2);
    g.generateTexture("bullet", 22, 12);

    g.clear();
    g.fillStyle(0x67e8f9, 1);
    g.fillRoundedRect(0, 1, 20, 6, 2);
    g.fillStyle(0xffffff, 0.8);
    g.fillRect(8, 2, 10, 4);
    g.generateTexture("bullet-pierce", 20, 8);

    g.clear();
    g.fillStyle(0xf97316, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xfde68a, 0.9);
    g.fillCircle(8, 8, 4);
    g.generateTexture("bullet-blast", 16, 16);

    g.clear();
    g.fillStyle(0x38bdf8, 1);
    g.fillRoundedRect(0, 0, 14, 14, 4);
    g.fillStyle(0xe0f2fe, 0.9);
    g.fillCircle(7, 7, 4);
    g.generateTexture("bullet-frost", 14, 14);

    g.clear();
    g.fillStyle(0xe879f9, 1);
    g.fillRect(0, 0, 28, 5);
    g.fillStyle(0xffffff, 0.75);
    g.fillRect(0, 1, 28, 2);
    g.generateTexture("bullet-rail", 28, 5);

    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillRoundedRect(0, 0, 22, 22, 5);
    g.fillStyle(0xffffff, 0.35);
    g.fillRect(4, 4, 14, 6);
    g.generateTexture("mod-crate", 22, 22);

    g.clear();
    g.fillStyle(0xf43f5e, 1);
    g.fillCircle(10, 10, 9);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(8, 4, 4, 12);
    g.fillRect(4, 8, 12, 4);
    g.generateTexture("hp-pack", 20, 20);

    g.clear();
    g.fillStyle(0x67e8f9, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-cyan", 8, 8);

    g.clear();
    g.fillStyle(0xa78bfa, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-violet", 8, 8);

    g.clear();
    g.fillStyle(0xf472b6, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-pink", 8, 8);

    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-gold", 8, 8);

    g.clear();
    g.fillStyle(0x34d399, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-green", 8, 8);

    // 賽博地牢：用像素機甲貼圖覆寫三角／圓形幾何
    if (window.RNFCyberRogueArt && typeof RNFCyberRogueArt.install === "function") {
      RNFCyberRogueArt.install(scene);
    }

    g.destroy();
  }

  function isCombatFxOn() {
    try {
      if (typeof window.RNF !== "undefined" && RNF.getSettings) {
        var s = RNF.getSettings();
        if (s && typeof s.combatFx === "boolean") return s.combatFx;
      }
    } catch (_e) {}
    try {
      var v = localStorage.getItem("rnf:arcade-combat-fx");
      if (v === null || v === undefined) return true;
      return v === "1" || v === "true";
    } catch (_e2) {
      return true;
    }
  }

  function setCombatFxOn(on) {
    var enabled = !!on;
    try {
      localStorage.setItem("rnf:arcade-combat-fx", enabled ? "1" : "0");
    } catch (_e) {}
    try {
      if (typeof window.RNF !== "undefined" && RNF.setSettings) {
        RNF.setSettings({ combatFx: enabled });
      }
    } catch (_e2) {}
  }

  function neonBurst(scene, x, y, key, count) {
    if (!isCombatFxOn()) return;
    var n = Phaser.Math.Clamp(count || 20, 15, 30);
    var emitter = scene.add.particles(x, y, key, {
      speed: { min: 70, max: 280 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 260, max: 640 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 120,
      blendMode: "ADD",
      emitting: false
    });
    emitter.explode(n);
    scene.time.delayedCall(700, function () { emitter.destroy(); });
  }

  function pulseButton(scene, target) {
    scene.tweens.add({
      targets: target,
      scale: 1.08,
      duration: 90,
      yoyo: true,
      ease: "Back.easeOut"
    });
  }

  function makeMenuButton(scene, x, y, label, fill, onClick, width) {
    var bw = width || 300;
    var bh = width && width <= 220 ? 44 : 50;
    var bg = scene.add.rectangle(x, y, bw, bh, fill, 0.2)
      .setStrokeStyle(2, fill, 0.85)
      .setInteractive({ useHandCursor: true });
    var txt = scene.add.text(x, y, label, {
      fontFamily: "Segoe UI, Microsoft JhengHei, sans-serif",
      fontSize: bw <= 220 ? "16px" : "18px",
      fontStyle: "bold",
      color: "#e2e8f0"
    }).setOrigin(0.5);
    bg.on("pointerover", function () {
      scene.tweens.add({ targets: [bg, txt], scale: 1.05, duration: 120, ease: "Cubic.easeOut" });
    });
    bg.on("pointerout", function () {
      scene.tweens.add({ targets: [bg, txt], scale: 1, duration: 120, ease: "Cubic.easeOut" });
    });
    bg.on("pointerdown", function () {
      pulseButton(scene, bg);
      pulseButton(scene, txt);
      SFX.click();
      onClick();
    });
    return { bg: bg, txt: txt };
  }

  function drawBackdrop(scene, accent) {
    scene.cameras.main.setBackgroundColor("#050814");
    scene.add.rectangle(W / 2, H / 2, W, H, 0x050814);
    for (var i = 0; i < 36; i++) {
      var star = scene.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        Phaser.Math.Between(1, 2),
        accent || 0x22d3ee,
        Phaser.Math.FloatBetween(0.12, 0.5)
      );
      scene.tweens.add({
        targets: star,
        alpha: 0.08,
        duration: Phaser.Math.Between(800, 1800),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
    var grid = scene.add.graphics().setAlpha(0.12);
    grid.lineStyle(1, accent || 0x22d3ee, 1);
    for (var x = 0; x < W; x += 40) grid.lineBetween(x, 0, x, H);
    for (var y = 0; y < H; y += 40) grid.lineBetween(0, y, W, y);
  }

  function uiFloat(scene, x, y, label, color) {
    var floater = scene.add.text(x, y, label, {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
      fontStyle: "bold",
      color: color || "#fbbf24"
    }).setOrigin(0.5).setDepth(40);
    scene.tweens.add({
      targets: floater,
      y: y - 50,
      alpha: 0,
      scale: 1.25,
      duration: 500,
      ease: "Cubic.easeOut",
      onComplete: function () { floater.destroy(); }
    });
  }

  var MODES = {
    "cyber-blade-dash": {
      slug: "cyber-blade-dash",
      title: "CYBER BLADE DASH",
      titleZh: "賽博光刃切擊",
      accent: 0x22d3ee,
      help: "WASD / 方向鍵移動，Space 斬擊，Shift 突進，斬破無人機並吸收能量核心。",
      objective: "斬擊無人機 · 吸收核心 · 維持護盾",
      scoreVerb: "CHAIN",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.player = scene.physics.add.sprite(W / 2, H / 2, "player-orb");
        scene.player.setTint(0x22d3ee);
        scene.player.setDrag(1200, 1200);
        scene.player.setMaxVelocity(330, 330);
        scene.player.setCollideWorldBounds(true);
        scene.player.hp = 5;
        scene.player.invuln = 0;
        scene.combo = 0;
        scene.dashCd = 0;
        scene.slashCd = 0;
        scene.spawnAcc = 0;
        scene.energyAcc = 0;
        scene.enemies = scene.physics.add.group();
        scene.pickups = scene.physics.add.group();
        scene.physics.add.overlap(scene.player, scene.enemies, function (_p, enemy) {
          if (scene.player.invuln > 0 || !scene.alive || !enemy.active) return;
          enemy.destroy();
          scene.player.hp -= 1;
          scene.player.invuln = 1.1;
          scene.combo = 0;
          SFX.hit();
          scene.cameras.main.shake(150, 0.018);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-pink", 24);
          if (scene.player.hp <= 0) scene.gameOver();
        });
        scene.physics.add.overlap(scene.player, scene.pickups, function (_p, pickup) {
          if (!pickup.active) return;
          scene.score += Math.floor(110 * scene.diff.scoreMult * (0.75 + scene.dangerMultiplier * 0.25));
          pickup.destroy();
          SFX.score();
          scene.cameras.main.shake(100, 0.01);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-gold", 18);
          uiFloat(scene, scene.player.x, scene.player.y - 18, "+ENERGY", "#fbbf24");
        });
      },
      updateState: function (scene, dt, threat) {
        var left = scene.cursors.left.isDown || scene.keys.A.isDown;
        var right = scene.cursors.right.isDown || scene.keys.D.isDown;
        var up = scene.cursors.up.isDown || scene.keys.W.isDown;
        var down = scene.cursors.down.isDown || scene.keys.S.isDown;
        var dash = scene.shiftKey.isDown;
        var slash = Phaser.Input.Keyboard.JustDown(scene.cursors.space) || Phaser.Input.Keyboard.JustDown(scene.keys.SPACE);
        var vx = 0;
        var vy = 0;
        if (left) vx -= 1;
        if (right) vx += 1;
        if (up) vy -= 1;
        if (down) vy += 1;
        var vec = new Phaser.Math.Vector2(vx, vy);
        if (vec.lengthSq() > 0) vec.normalize();
        scene.player.setAcceleration(vec.x * 1700, vec.y * 1700);
        scene.player.invuln = Math.max(0, scene.player.invuln - dt);
        scene.dashCd = Math.max(0, scene.dashCd - dt);
        scene.slashCd = Math.max(0, scene.slashCd - dt);
        if (scene.player.invuln > 0) {
          scene.player.setAlpha(scene.player.alpha === 1 ? 0.45 : 1);
        } else {
          scene.player.setAlpha(1);
        }
        if (dash && scene.dashCd <= 0 && vec.lengthSq() > 0) {
          scene.player.setVelocity(vec.x * 560, vec.y * 560);
          scene.dashCd = 1.6;
          SFX.dash();
          neonBurst(scene, scene.player.x, scene.player.y, "spark-cyan", 16);
        }
        if (slash && scene.slashCd <= 0) {
          scene.slashCd = 0.42;
          SFX.slash();
          scene.cameras.main.shake(100, 0.01);
          var ring = scene.add.circle(scene.player.x, scene.player.y, 74, 0x22d3ee, 0.16).setStrokeStyle(3, 0x22d3ee, 0.95);
          scene.tweens.add({ targets: ring, scale: 1.3, alpha: 0, duration: 180, ease: "Cubic.easeOut", onComplete: function () { ring.destroy(); } });
          neonBurst(scene, scene.player.x, scene.player.y, "spark-cyan", 22);
          scene.enemies.getChildren().forEach(function (enemy) {
            if (!enemy.active) return;
            if (Phaser.Math.Distance.Between(enemy.x, enemy.y, scene.player.x, scene.player.y) <= 88) {
              enemy.destroy();
              scene.combo += 1;
              var gain = Math.floor((100 + scene.combo * 18) * scene.diff.scoreMult * (0.9 + threat * 0.12));
              scene.score += gain;
              uiFloat(scene, enemy.x, enemy.y, "+" + gain, "#67e8f9");
              neonBurst(scene, enemy.x, enemy.y, "spark-violet", 18);
            }
          });
        }
        scene.spawnAcc += dt;
        scene.energyAcc += dt;
        if (scene.spawnAcc >= Math.max(0.32, 1.05 / threat)) {
          scene.spawnAcc = 0;
          var sx = Phaser.Math.Between(0, 1) ? Phaser.Math.Between(-20, W + 20) : (Phaser.Math.Between(0, 1) ? -20 : W + 20);
          var sy = sx < 0 || sx > W ? Phaser.Math.Between(20, H - 20) : (Phaser.Math.Between(0, 1) ? -20 : H + 20);
          var enemy = scene.enemies.create(sx, sy, "drone").setBlendMode(Phaser.BlendModes.ADD);
          enemy.setData("speed", Phaser.Math.Between(78, 118));
        }
        if (scene.energyAcc >= Math.max(1.35, 3 / threat)) {
          scene.energyAcc = 0;
          var pickup = scene.pickups.create(Phaser.Math.Between(70, W - 70), Phaser.Math.Between(70, H - 70), "xp");
          pickup.setTint(0xfbbf24);
          scene.tweens.add({ targets: pickup, scale: 1.25, alpha: 0.5, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          scene.time.delayedCall(6000, function () { if (pickup.active) pickup.destroy(); });
        }
        scene.enemies.getChildren().forEach(function (enemy) {
          if (!enemy.active) return;
          var angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
          var speed = enemy.getData("speed") * threat;
          enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          enemy.rotation += dt * 3;
        });
        scene.setExtraHud("HP " + scene.player.hp + " · COMBO " + scene.combo);
      }
    },
    "neon-pinball-frenzy": {
      slug: "neon-pinball-frenzy",
      title: "NEON PINBALL FRENZY",
      titleZh: "霓虹狂暴彈珠台",
      accent: 0xf472b6,
      help: "←／A 左擋板、→／D 右擋板揮擊；Space 震台（連震 3 次 TILT）。撞 Bumper、擊破目標牆、點亮 R·N·F、打遊走核心完成任務；連撞進 Fever，大獎可觸發雙球。",
      objective: "任務連破 · 目標牆 · Fever · 雙球狂潮",
      scoreVerb: "HITS",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.physics.world.gravity.y = 800;

        // 場館氛圍線
        scene.add.rectangle(W / 2, H / 2, W - 48, H - 36, 0x07101c, 0.55).setStrokeStyle(2, 0xf472b6, 0.25);
        scene.add.rectangle(W / 2, 88, 220, 56, 0x0b1220, 0.5).setStrokeStyle(1, 0xfbbf24, 0.55);
        scene.add.text(W / 2, 72, "SKILL SHOT", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "11px", fontStyle: "bold", color: "#fbbf24"
        }).setOrigin(0.5);

        scene.topWall = scene.add.rectangle(W / 2, 10, W - 40, 20, 0x0f172a).setStrokeStyle(2, 0xf472b6, 0.45);
        scene.leftWall = scene.add.rectangle(14, H / 2 - 20, 28, H - 40, 0x0f172a).setStrokeStyle(2, 0x22d3ee, 0.35);
        scene.rightWall = scene.add.rectangle(W - 14, H / 2 - 20, 28, H - 40, 0x0f172a).setStrokeStyle(2, 0xa78bfa, 0.35);
        scene.leftShelf = scene.add.rectangle(150, H - 28, 260, 56, 0x111827).setStrokeStyle(2, 0x334155, 0.8);
        scene.rightShelf = scene.add.rectangle(W - 150, H - 28, 260, 56, 0x111827).setStrokeStyle(2, 0x334155, 0.8);
        scene.leftSling = scene.add.rectangle(210, H - 150, 70, 18, 0x22d3ee, 0.35).setAngle(-28).setStrokeStyle(2, 0x22d3ee, 0.8);
        scene.rightSling = scene.add.rectangle(W - 210, H - 150, 70, 18, 0xa78bfa, 0.35).setAngle(28).setStrokeStyle(2, 0xa78bfa, 0.8);
        [scene.topWall, scene.leftWall, scene.rightWall, scene.leftShelf, scene.rightShelf].forEach(function (wall) {
          scene.physics.add.existing(wall, true);
        });
        scene.physics.add.existing(scene.leftSling, true);
        scene.physics.add.existing(scene.rightSling, true);

        scene.leftFlipper = scene.physics.add.sprite(W / 2 - 78, H - 78, "flipper").setImmovable(true);
        scene.rightFlipper = scene.physics.add.sprite(W / 2 + 78, H - 78, "flipper").setImmovable(true);
        scene.leftFlipper.body.allowGravity = false;
        scene.rightFlipper.body.allowGravity = false;
        scene.leftFlipper.body.setSize(118, 18);
        scene.rightFlipper.body.setSize(118, 18);
        scene.leftFlipper.setTint(0x22d3ee);
        scene.rightFlipper.setTint(0xa78bfa);
        scene.leftFlipper.setAngle(12);
        scene.rightFlipper.setAngle(-12);

        scene.balls = scene.physics.add.group();
        scene.spawnPinball = function (x, y, vx, vy) {
          var ball = scene.balls.create(x, y, "ball");
          ball.setCircle(10);
          ball.setBounce(0.68, 0.68);
          ball.setCollideWorldBounds(false);
          ball.setMaxVelocity(740, 740);
          if (typeof ball.setDamping === "function") ball.setDamping(true);
          ball.setDrag(4, 4);
          ball.setVelocity(vx, vy);
          ball.setTint(0xfde68a);
          ball.setData("serveGrace", 0.55);
          return ball;
        };
        // 從右側發射道送出，避免出生在中央落球縫直接出局
        scene.spawnPinball(W - 70, H - 210, -320, -360);

        scene.ballLives = 3;
        scene.hitCombo = 0;
        scene.feverTimer = 0;
        scene.feverMult = 1;
        scene.playMult = 1;
        scene.tiltCount = 0;
        scene.tiltCool = 0;
        scene.tilted = 0;
        scene.tiltDecay = 0;
        scene.comboIdle = 0;
        scene.leftKickCool = 0;
        scene.rightKickCool = 0;
        scene.prevTouchLeft = false;
        scene.prevTouchRight = false;
        scene.touchLeft = false;
        scene.touchRight = false;
        scene.skillShotOpen = true;
        scene.skillShotTimer = 2.4;
        scene.jackpot = 2500;
        scene.missionIndex = 0;
        scene.missionProgress = 0;
        scene.missions = [
          { id: "bump", label: "撞擊 Bumper", need: 6, reward: "BUMPER" },
          { id: "drops", label: "擊破目標牆", need: 3, unit: "DROP" },
          { id: "letters", label: "點亮 R·N·F", need: 3, unit: "LANE" },
          { id: "orbit", label: "打中遊走核心", need: 3, unit: "CORE" },
          { id: "hold", label: "Fever 續航", need: 4, unit: "SEC" }
        ];
        scene.letterLit = [false, false, false];
        scene.dropCleared = 0;
        scene.orbitHits = 0;
        scene.feverHoldAcc = 0;
        scene.multiballTimer = 0;
        scene.bonusOrbTimer = 0;
        scene.bumperColors = [0x22d3ee, 0xf472b6, 0xa78bfa, 0xfbbf24, 0x34d399];

        function award(base, x, y, tag, color) {
          var gain = Math.floor(base * scene.diff.scoreMult * scene.feverMult * scene.playMult * (0.85 + scene.dangerMultiplier * 0.15));
          scene.score += gain;
          scene.jackpot = Math.min(20000, scene.jackpot + Math.floor(gain * 0.08));
          uiFloat(scene, x, y, (tag ? tag + " " : "") + "+" + gain, color || "#f472b6");
          return gain;
        }

        function advanceMission(amount, sourceId) {
          var m = scene.missions[scene.missionIndex];
          if (!m) return;
          if (m.id === "bump" && sourceId !== "bump") return;
          if (m.id === "drops" && sourceId !== "drops") return;
          if (m.id === "letters" && sourceId !== "letters") return;
          if (m.id === "orbit" && sourceId !== "orbit") return;
          if (m.id === "hold" && sourceId !== "hold") return;
          scene.missionProgress += amount;
          if (scene.missionProgress >= m.need) {
            var bonus = Math.floor((1200 + scene.missionIndex * 350 + scene.jackpot * 0.15) * scene.diff.scoreMult * scene.playMult);
            scene.score += bonus;
            scene.playMult = Math.min(5, scene.playMult + 0.25);
            SFX.score();
            scene.cameras.main.shake(140, 0.018);
            neonBurst(scene, W / 2, 160, "spark-gold", 28);
            uiFloat(scene, W / 2, 150, "任務完成 +" + bonus, "#fbbf24");
            scene.missionIndex = (scene.missionIndex + 1) % scene.missions.length;
            scene.missionProgress = 0;
            scene.feverHoldAcc = 0;
            if (scene.missionIndex % 2 === 0) {
              scene.multiballTimer = 10;
              if (scene.balls.countActive(true) < 2) {
                scene.spawnPinball(W / 2 - 120, 210, -140, -300);
                scene.spawnPinball(W / 2 + 120, 210, 140, -300);
              }
              uiFloat(scene, W / 2, 200, "MULTIBALL!", "#67e8f9");
              SFX.explode();
            }
            refreshMissionHud();
          } else {
            refreshMissionHud();
          }
        }

        function refreshMissionHud() {
          var m = scene.missions[scene.missionIndex];
          scene.missionHud.setText("任務 " + (scene.missionIndex + 1) + "/5  " + m.label + "  " + scene.missionProgress + "/" + m.need);
        }

        scene.awardPin = award;
        scene.advanceMission = advanceMission;

        // Bumper
        scene.bumpers = scene.physics.add.staticGroup();
        [
          [W / 2 - 40, 175],
          [W / 2 + 40, 175],
          [W / 2 - 175, 250],
          [W / 2 + 175, 250],
          [W / 2, 310]
        ].forEach(function (item, idx) {
          var bumper = scene.bumpers.create(item[0], item[1], "ball").setDisplaySize(36, 36).refreshBody();
          bumper.setTint(scene.bumperColors[idx]);
          bumper.setData("baseTint", scene.bumperColors[idx]);
          bumper.setData("hitCool", 0);
        });

        // 目標牆（Drop targets）
        scene.dropTargets = scene.physics.add.staticGroup();
        scene.dropStates = [true, true, true];
        [-54, 0, 54].forEach(function (ox, idx) {
          var drop = scene.dropTargets.create(W / 2 + ox, 118, "bumper-bar");
          drop.setDisplaySize(48, 16).refreshBody();
          drop.setTint(0xf472b6);
          drop.setData("idx", idx);
          drop.setData("alive", true);
        });

        // R N F 滾道燈
        scene.letterZones = [];
        scene.letterLabels = [];
        ["R", "N", "F"].forEach(function (ch, idx) {
          var x = W / 2 - 120 + idx * 120;
          var zone = scene.add.rectangle(x, 52, 56, 22, 0x0f172a, 0.7).setStrokeStyle(2, 0x64748b, 0.9);
          scene.physics.add.existing(zone, true);
          zone.body.setSize(56, 22);
          zone.setData("idx", idx);
          scene.letterZones.push(zone);
          var lab = scene.add.text(x, 52, ch, {
            fontFamily: "Segoe UI, sans-serif", fontSize: "16px", fontStyle: "bold", color: "#64748b"
          }).setOrigin(0.5);
          scene.letterLabels.push(lab);
        });

        // 遊走核心
        scene.orbitCore = scene.physics.add.sprite(W / 2, 240, "xp");
        scene.orbitCore.setDisplaySize(22, 22);
        scene.orbitCore.body.allowGravity = false;
        scene.orbitCore.setImmovable(true);
        scene.orbitCore.setTint(0x34d399);
        scene.orbitAngle = 0;
        scene.orbitHitCool = 0;

        // 旋轉加分器（視覺）
        scene.spinner = scene.add.rectangle(W / 2 - 220, 340, 28, 28, 0xfbbf24, 0.85).setStrokeStyle(2, 0xfde68a, 1);
        scene.physics.add.existing(scene.spinner, true);
        scene.spinnerHitCool = 0;

        scene.bonusOrbs = scene.physics.add.group();

        scene.missionHud = scene.add.text(W / 2, H - 14, "", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#e2e8f0"
        }).setOrigin(0.5, 1).setDepth(25);
        scene.modeHud = scene.add.text(W / 2, 36, "", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "12px", fontStyle: "bold", color: "#94a3b8"
        }).setOrigin(0.5, 0).setDepth(25);
        refreshMissionHud();

        function onBumper(ball, bumper) {
          if (bumper.getData("hitCool") > 0) return;
          bumper.setData("hitCool", 0.08);
          scene.hitCombo += 1;
          scene.comboIdle = 0;
          if (scene.hitCombo >= 8) {
            scene.feverTimer = Math.max(scene.feverTimer, 5);
            scene.feverMult = 2;
          }
          var angle = Phaser.Math.Angle.Between(bumper.x, bumper.y, ball.x, ball.y);
          var threatNow = scene.dangerMultiplier * scene.diff.base;
          var power = (350 + Math.min(scene.hitCombo, 18) * 10) * (0.92 + threatNow * 0.05);
          ball.setVelocity(Math.cos(angle) * power, Math.sin(angle) * power - 50);
          award(80 + scene.hitCombo * 12, bumper.x, bumper.y - 18, scene.feverMult > 1 ? "FEVER" : "", scene.feverMult > 1 ? "#fbbf24" : "#f472b6");
          SFX.pinball();
          scene.cameras.main.shake(90, 0.01);
          neonBurst(scene, bumper.x, bumper.y, scene.feverMult > 1 ? "spark-gold" : "spark-pink", Phaser.Math.Between(16, 24));
          scene.tweens.add({ targets: bumper, scale: 1.22, duration: 70, yoyo: true, ease: "Back.easeOut" });
          advanceMission(1, "bump");
        }

        function onDrop(ball, drop) {
          if (!drop.getData("alive")) return;
          drop.setData("alive", false);
          drop.setActive(false).setVisible(false);
          drop.body.enable = false;
          scene.dropStates[drop.getData("idx")] = false;
          scene.dropCleared += 1;
          award(220, drop.x, drop.y - 16, "DROP", "#fb7185");
          SFX.slash();
          neonBurst(scene, drop.x, drop.y, "spark-pink", 20);
          advanceMission(1, "drops");
          var allDown = scene.dropStates.every(function (v) { return !v; });
          if (allDown) {
            var jp = Math.floor(scene.jackpot * scene.playMult * scene.diff.scoreMult);
            scene.score += jp;
            uiFloat(scene, W / 2, 130, "JACKPOT +" + jp, "#fbbf24");
            neonBurst(scene, W / 2, 130, "spark-gold", 30);
            SFX.explode();
            scene.cameras.main.shake(180, 0.022);
            scene.jackpot = 2500;
            scene.feverTimer = Math.max(scene.feverTimer, 6);
            scene.feverMult = 2;
            scene.time.delayedCall(700, function () {
              scene.dropTargets.getChildren().forEach(function (d, i) {
                d.setData("alive", true);
                d.setActive(true).setVisible(true);
                d.body.enable = true;
                scene.dropStates[i] = true;
              });
            });
          }
        }

        scene.physics.add.collider(scene.balls, scene.topWall);
        scene.physics.add.collider(scene.balls, scene.leftWall);
        scene.physics.add.collider(scene.balls, scene.rightWall);
        scene.physics.add.collider(scene.balls, scene.leftShelf);
        scene.physics.add.collider(scene.balls, scene.rightShelf);
        scene.physics.add.collider(scene.balls, scene.leftSling, function (ball) {
          if (!ball || !ball.body || typeof ball.setVelocity !== "function") return;
          ball.setVelocity(Math.abs(ball.body.velocity.x) + 180, -Math.abs(ball.body.velocity.y) - 160);
          SFX.dash();
          neonBurst(scene, scene.leftSling.x, scene.leftSling.y, "spark-cyan", 15);
        });
        scene.physics.add.collider(scene.balls, scene.rightSling, function (ball) {
          if (!ball || !ball.body || typeof ball.setVelocity !== "function") return;
          ball.setVelocity(-(Math.abs(ball.body.velocity.x) + 180), -Math.abs(ball.body.velocity.y) - 160);
          SFX.dash();
          neonBurst(scene, scene.rightSling.x, scene.rightSling.y, "spark-violet", 15);
        });
        scene.physics.add.collider(scene.balls, scene.bumpers, onBumper);
        scene.physics.add.collider(scene.balls, scene.dropTargets, onDrop);
        scene.physics.add.collider(scene.balls, scene.leftFlipper);
        scene.physics.add.collider(scene.balls, scene.rightFlipper);
        scene.physics.add.overlap(scene.balls, scene.orbitCore, function (ball) {
          if (scene.orbitHitCool > 0) return;
          scene.orbitHitCool = 0.35;
          scene.orbitHits += 1;
          award(160, scene.orbitCore.x, scene.orbitCore.y - 18, "CORE", "#34d399");
          SFX.score();
          neonBurst(scene, scene.orbitCore.x, scene.orbitCore.y, "spark-green", 20);
          ball.setVelocity(ball.body.velocity.x * 0.4 + Phaser.Math.Between(-120, 120), -320);
          advanceMission(1, "orbit");
        });
        scene.physics.add.overlap(scene.balls, scene.spinner, function (ball) {
          if (scene.spinnerHitCool > 0) return;
          scene.spinnerHitCool = 0.25;
          scene.spinner.rotation += 1.2;
          award(70, scene.spinner.x, scene.spinner.y - 16, "SPIN", "#fde68a");
          SFX.pinball();
          ball.setVelocityY(ball.body.velocity.y - 80);
        });
        scene.letterZones.forEach(function (zone) {
          scene.physics.add.overlap(scene.balls, zone, function () {
            var idx = zone.getData("idx");
            if (scene.letterLit[idx]) return;
            scene.letterLit[idx] = true;
            zone.setStrokeStyle(2, 0x67e8f9, 1);
            scene.letterLabels[idx].setColor("#67e8f9");
            award(150, zone.x, zone.y + 18, "LANE", "#67e8f9");
            SFX.confirm();
            advanceMission(1, "letters");
            if (scene.letterLit.every(Boolean)) {
              scene.playMult = Math.min(5, scene.playMult + 0.5);
              award(800, W / 2, 70, "RNF", "#22d3ee");
              neonBurst(scene, W / 2, 60, "spark-cyan", 26);
              scene.time.delayedCall(900, function () {
                scene.letterLit = [false, false, false];
                scene.letterZones.forEach(function (z, i) {
                  z.setStrokeStyle(2, 0x64748b, 0.9);
                  scene.letterLabels[i].setColor("#64748b");
                });
              });
            }
          });
        });
        scene.physics.add.overlap(scene.balls, scene.bonusOrbs, function (ball, orb) {
          if (!orb.active) return;
          orb.destroy();
          award(300, orb.x, orb.y, "ORB", "#a78bfa");
          SFX.score();
          neonBurst(scene, orb.x, orb.y, "spark-violet", 22);
          scene.feverTimer = Math.max(scene.feverTimer, 3.5);
          scene.feverMult = 2;
        });

        scene.input.on("pointerdown", function (pointer) {
          if (pointer.x < W / 2) scene.touchLeft = true;
          else scene.touchRight = true;
        });
        scene.input.on("pointerup", function () {
          if (scene.input.manager.pointers.filter(function (p) { return p.isDown; }).length === 0) {
            scene.touchLeft = false;
            scene.touchRight = false;
          }
        });
      },
      updateState: function (scene, dt, threat) {
        scene.bumpers.getChildren().forEach(function (bumper) {
          var cool = bumper.getData("hitCool") || 0;
          if (cool > 0) bumper.setData("hitCool", cool - dt);
          bumper.setTint(scene.feverMult > 1 ? 0xfbbf24 : bumper.getData("baseTint"));
        });

        if (scene.orbitHitCool > 0) scene.orbitHitCool -= dt;
        if (scene.spinnerHitCool > 0) scene.spinnerHitCool -= dt;
        scene.orbitAngle += dt * (1.1 + threat * 0.25);
        scene.orbitCore.x = W / 2 + Math.cos(scene.orbitAngle) * (150 + Math.sin(scene.orbitAngle * 0.7) * 30);
        scene.orbitCore.y = 245 + Math.sin(scene.orbitAngle * 1.35) * 70;
        scene.orbitCore.body.reset(scene.orbitCore.x, scene.orbitCore.y);
        scene.spinner.rotation += dt * 1.5;

        if (scene.skillShotOpen) {
          scene.skillShotTimer -= dt;
          var skillHit = false;
          scene.balls.getChildren().forEach(function (ball) {
            if (!ball.active) return;
            if (ball.y < 100 && Math.abs(ball.x - W / 2) < 110 && ball.body.velocity.y < 0) skillHit = true;
          });
          if (skillHit) {
            scene.skillShotOpen = false;
            scene.awardPin(600, W / 2, 90, "SKILL", "#fbbf24");
            SFX.confirm();
            neonBurst(scene, W / 2, 88, "spark-gold", 24);
            scene.feverTimer = Math.max(scene.feverTimer, 3);
            scene.feverMult = 2;
          } else if (scene.skillShotTimer <= 0) {
            scene.skillShotOpen = false;
          }
        }

        if (scene.feverTimer > 0) {
          scene.feverTimer -= dt;
          scene.feverHoldAcc += dt;
          if (scene.feverHoldAcc >= 1) {
            scene.feverHoldAcc -= 1;
            scene.advanceMission(1, "hold");
          }
          if (scene.feverTimer <= 0) {
            scene.feverTimer = 0;
            scene.feverMult = 1;
            scene.feverHoldAcc = 0;
          }
        }

        scene.comboIdle += dt;
        if (scene.comboIdle > 1.6) {
          scene.hitCombo = Math.max(0, scene.hitCombo - 1);
          scene.comboIdle = 0.4;
        }

        if (scene.tiltCool > 0) scene.tiltCool -= dt;
        if (scene.tilted > 0) scene.tilted -= dt;
        if (scene.leftKickCool > 0) scene.leftKickCool -= dt;
        if (scene.rightKickCool > 0) scene.rightKickCool -= dt;
        if (scene.multiballTimer > 0) scene.multiballTimer -= dt;

        scene.bonusOrbTimer += dt;
        if (scene.bonusOrbTimer >= Math.max(4.5, 9 / threat)) {
          scene.bonusOrbTimer = 0;
          var orb = scene.bonusOrbs.create(Phaser.Math.Between(120, W - 120), 70, "xp");
          orb.setTint(0xa78bfa);
          orb.setDisplaySize(18, 18);
          orb.body.allowGravity = false;
          orb.setVelocity(Phaser.Math.Between(-40, 40), 55 + threat * 10);
        }
        scene.bonusOrbs.getChildren().forEach(function (orb) {
          if (orb.active && orb.y > H - 40) orb.destroy();
        });

        var leftHeld = !scene.tilted && (scene.cursors.left.isDown || scene.keys.A.isDown || scene.touchLeft);
        var rightHeld = !scene.tilted && (scene.cursors.right.isDown || scene.keys.D.isDown || scene.touchRight);
        var leftJust = !scene.tilted && (
          Phaser.Input.Keyboard.JustDown(scene.cursors.left) ||
          Phaser.Input.Keyboard.JustDown(scene.keys.A) ||
          (leftHeld && !scene.prevTouchLeft)
        );
        var rightJust = !scene.tilted && (
          Phaser.Input.Keyboard.JustDown(scene.cursors.right) ||
          Phaser.Input.Keyboard.JustDown(scene.keys.D) ||
          (rightHeld && !scene.prevTouchRight)
        );
        scene.prevTouchLeft = leftHeld;
        scene.prevTouchRight = rightHeld;
        var nudge = Phaser.Input.Keyboard.JustDown(scene.cursors.space) || Phaser.Input.Keyboard.JustDown(scene.keys.SPACE);

        var leftY = leftHeld ? H - 96 : H - 78;
        var rightY = rightHeld ? H - 96 : H - 78;
        scene.leftFlipper.setAngle(leftHeld ? -26 : 14);
        scene.rightFlipper.setAngle(rightHeld ? 26 : -14);
        scene.leftFlipper.body.reset(scene.leftFlipper.x, leftY);
        scene.rightFlipper.body.reset(scene.rightFlipper.x, rightY);
        scene.leftFlipper.y = leftY;
        scene.rightFlipper.y = rightY;

        function tryKick(flipper, side, justPressed, held, coolKey) {
          if (!held || scene[coolKey] > 0) return;
          var kicked = false;
          scene.balls.getChildren().forEach(function (ball) {
            if (!ball.active || kicked) return;
            var dx = ball.x - flipper.x;
            var dy = ball.y - flipper.y;
            if (Math.abs(dx) > 78 || dy < -28 || dy > 40) return;
            var fallingOnPad = ball.body.velocity.y > 40;
            if (!justPressed && !fallingOnPad) return;
            kicked = true;
            scene[coolKey] = justPressed ? 0.14 : 0.2;
            var power = justPressed ? 540 : 280;
            var outward = side === "left" ? -1 : 1;
            var hitBias = Phaser.Math.Clamp(dx / 70, -1, 1);
            ball.setVelocity(
              ball.body.velocity.x * 0.2 + outward * 100 + hitBias * 150,
              -power
            );
            SFX.pinball();
            neonBurst(scene, flipper.x, flipper.y, side === "left" ? "spark-cyan" : "spark-violet", justPressed ? 22 : 15);
            if (justPressed) {
              scene.cameras.main.shake(80, 0.01);
              scene.tweens.add({ targets: flipper, scaleY: 1.15, duration: 70, yoyo: true, ease: "Cubic.easeOut" });
            }
          });
        }

        scene.physics.world.collide(scene.balls, scene.leftFlipper, function () {
          tryKick(scene.leftFlipper, "left", leftJust, leftHeld, "leftKickCool");
        });
        scene.physics.world.collide(scene.balls, scene.rightFlipper, function () {
          tryKick(scene.rightFlipper, "right", rightJust, rightHeld, "rightKickCool");
        });
        if (leftJust) tryKick(scene.leftFlipper, "left", true, true, "leftKickCool");
        if (rightJust) tryKick(scene.rightFlipper, "right", true, true, "rightKickCool");

        if (nudge && scene.tiltCool <= 0 && scene.tilted <= 0) {
          scene.tiltCool = 0.28;
          scene.tiltCount += 1;
          scene.tiltDecay = 0;
          scene.balls.getChildren().forEach(function (ball) {
            if (!ball.active) return;
            ball.setVelocity(
              ball.body.velocity.x + Phaser.Math.Between(-110, 110),
              ball.body.velocity.y - 90
            );
          });
          SFX.dash();
          scene.cameras.main.shake(120, 0.016);
          if (scene.tiltCount >= 3) {
            scene.tilted = 2.8;
            scene.tiltCount = 0;
            scene.hitCombo = 0;
            scene.feverTimer = 0;
            scene.feverMult = 1;
            SFX.hit();
            uiFloat(scene, W / 2, H / 2, "TILT!", "#fb7185");
          }
        }
        if (scene.tilted <= 0 && scene.tiltCool <= 0) {
          scene.tiltDecay += dt;
          if (scene.tiltDecay > 2.2) {
            scene.tiltCount = Math.max(0, scene.tiltCount - 1);
            scene.tiltDecay = 0;
          }
        }

        var drained = false;
        scene.balls.getChildren().forEach(function (ball) {
          if (!ball.active) return;
          var grace = ball.getData("serveGrace") || 0;
          if (grace > 0) {
            ball.setData("serveGrace", grace - dt);
            // 發球保護：避免一出生就掉進中央縫
            if (ball.y > H - 100 && Math.abs(ball.x - W / 2) < 70) {
              ball.setVelocity(ball.body.velocity.x * 0.4 + (ball.x < W / 2 ? -120 : 120), -420);
              ball.y = H - 160;
              ball.body.reset(ball.x, ball.y);
            }
          }
          if (ball.y > H + 36) {
            ball.destroy();
            drained = true;
          } else {
            var speed = ball.body.velocity.length();
            var maxSpeed = 560 + threat * 40;
            if (speed > maxSpeed) ball.body.velocity.scale(maxSpeed / speed);
          }
        });
        if (drained && scene.balls.countActive(true) === 0) {
          scene.ballLives -= 1;
          scene.hitCombo = 0;
          scene.feverTimer = 0;
          scene.feverMult = 1;
          scene.playMult = Math.max(1, scene.playMult - 0.25);
          scene.skillShotOpen = true;
          scene.skillShotTimer = 2.4;
          SFX.hit();
          scene.cameras.main.shake(180, 0.02);
          neonBurst(scene, W / 2, H - 24, "spark-pink", 24);
          if (scene.ballLives <= 0) {
            scene.gameOver();
            return;
          }
          scene.spawnPinball(W - 70, H - 210, -320, -360);
        }

        var feverLabel = scene.feverMult > 1 ? ("FEVER x2 " + scene.feverTimer.toFixed(1) + "s") : ("COMBO " + scene.hitCombo);
        var multiLabel = scene.balls.countActive(true) > 1 ? " · MULTIBALL" : "";
        var tiltLabel = scene.tilted > 0 ? " · TILT" : (scene.tiltCount > 0 ? " · SHAKE " + scene.tiltCount + "/3" : "");
        scene.setExtraHud("BALLS " + scene.ballLives + " · x" + scene.playMult.toFixed(2) + " · JP " + scene.jackpot + " · " + feverLabel + multiLabel + tiltLabel);
        scene.modeHud.setText(scene.skillShotOpen ? "技能射門時窗 " + Math.max(0, scene.skillShotTimer).toFixed(1) + "s" : "大獎累積中");
      }
    },
    "void-rhythm-beat": {
      slug: "void-rhythm-beat",
      title: "VOID RHYTHM BEAT",
      titleZh: "虛空節奏拍點",
      accent: 0xa78bfa,
      help: "D / F / J / K（或點擊底部四鍵）跟拍電子節奏。Perfect／Great／Good 會爆出加分與打擊特效；金色為加分音、長條為按住音。連擊 20 進 FEVER，漏拍扣同步值。",
      objective: "四軌跟拍 · 譜面連段 · Fever 狂熱",
      scoreVerb: "COMBO",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);

        // 場地框：所有軌道／音符都鎖在此框內，禁止掉出畫面
        var frameW = 420;
        var frameH = 430;
        var frameX = W / 2;
        var frameY = H / 2 + 8;
        scene.trackTop = frameY - frameH / 2 + 18;
        scene.trackBottom = frameY + frameH / 2 - 18;
        scene.judgementY = scene.trackBottom - 58;
        scene.missY = scene.judgementY + 46;
        scene.spawnY = scene.trackTop + 8;
        scene.laneGap = 92;
        scene.lanes = [
          frameX - scene.laneGap * 1.5,
          frameX - scene.laneGap * 0.5,
          frameX + scene.laneGap * 0.5,
          frameX + scene.laneGap * 1.5
        ];
        scene.laneColors = [0x22d3ee, 0x34d399, 0xa78bfa, 0xf472b6];
        scene.laneColorHex = ["#67e8f9", "#6ee7b7", "#c4b5fd", "#f9a8d4"];

        scene.playFrame = scene.add.rectangle(frameX, frameY, frameW, frameH, 0x070b16, 0.82)
          .setStrokeStyle(3, 0xa78bfa, 0.85)
          .setDepth(1);
        scene.add.rectangle(frameX, frameY, frameW - 18, frameH - 18, 0x0b1220, 0.35)
          .setStrokeStyle(1, 0x334155, 0.55)
          .setDepth(1);

        // 遮罩：音符不會畫到框外
        scene.noteMaskGfx = scene.make.graphics({ x: 0, y: 0, add: false });
        scene.noteMaskGfx.fillStyle(0xffffff, 1);
        scene.noteMaskGfx.fillRect(frameX - frameW / 2 + 10, scene.trackTop - 4, frameW - 20, scene.trackBottom - scene.trackTop + 10);
        scene.noteMask = scene.noteMaskGfx.createGeometryMask();

        scene.laneKeys = [
          { name: "D", key: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D) },
          { name: "F", key: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F) },
          { name: "J", key: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J) },
          { name: "K", key: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K) }
        ];

        scene.laneVisuals = [];
        scene.judgePads = [];
        scene.touchPads = [];
        scene.lanes.forEach(function (laneX, idx) {
          var rail = scene.add.rectangle(laneX, (scene.trackTop + scene.judgementY) / 2, 74, scene.judgementY - scene.trackTop + 24, 0x0f172a, 0.72)
            .setStrokeStyle(2, scene.laneColors[idx], 0.45)
            .setDepth(2);
          var judge = scene.add.rectangle(laneX, scene.judgementY, 74, 18, scene.laneColors[idx], 0.28)
            .setStrokeStyle(2, scene.laneColors[idx], 0.95)
            .setDepth(6);
          var keyLabel = scene.add.text(laneX, scene.trackBottom - 10, scene.laneKeys[idx].name, {
            fontFamily: "Segoe UI, sans-serif",
            fontSize: "26px",
            fontStyle: "bold",
            color: scene.laneColorHex[idx]
          }).setOrigin(0.5).setDepth(8);
          var pad = scene.add.rectangle(laneX, scene.trackBottom - 10, 78, 44, scene.laneColors[idx], 0.12)
            .setStrokeStyle(2, scene.laneColors[idx], 0.55)
            .setInteractive({ useHandCursor: true })
            .setDepth(7);
          pad.on("pointerdown", function () {
            scene.hitLane(idx, true);
          });
          scene.laneVisuals.push({ rail: rail, judge: judge, keyLabel: keyLabel, pad: pad });
          scene.judgePads.push(judge);
          scene.touchPads.push(pad);
        });

        scene.syncHp = 100;
        scene.combo = 0;
        scene.maxCombo = 0;
        scene.perfects = 0;
        scene.greats = 0;
        scene.goods = 0;
        scene.misses = 0;
        scene.fever = false;
        scene.feverTimer = 0;
        scene.beatClock = 0;
        scene.beatPulse = 0;
        scene.patternIdx = 0;
        scene.holdLane = [null, null, null, null];
        scene.notes = scene.add.group();
        scene.bpm = scene.diffKey === "casual" ? 108 : scene.diffKey === "extreme" ? 148 : 128;
        scene.musicStep = 0;
        scene.musicOn = true;
        scene.musicIntensity = 1;

        // 中央連擊／判定大字
        scene.comboBanner = scene.add.text(W / 2, H / 2 - 70, "", {
          fontFamily: "Segoe UI, Microsoft JhengHei, sans-serif",
          fontSize: "36px",
          fontStyle: "bold",
          color: "#e2e8f0"
        }).setOrigin(0.5).setAlpha(0).setDepth(40);
        scene.gradeBanner = scene.add.text(W / 2, scene.judgementY - 70, "", {
          fontFamily: "Segoe UI, sans-serif",
          fontSize: "44px",
          fontStyle: "bold",
          color: "#67e8f9"
        }).setOrigin(0.5).setAlpha(0).setDepth(41);
        scene.scorePopup = scene.add.text(W / 2, scene.judgementY - 110, "", {
          fontFamily: "Segoe UI, sans-serif",
          fontSize: "26px",
          fontStyle: "bold",
          color: "#fde68a"
        }).setOrigin(0.5).setAlpha(0).setDepth(41);

        // 啟動節奏音樂（也嘗試 SDK 環境底噪）
        try {
          if (typeof RNF !== "undefined" && RNF.startBgm) RNF.startBgm("pulse");
        } catch (_e) {}
        ensureAudio();
        scene.time.delayedCall(200, function () {
          if (scene.alive && scene.musicOn) {
            uiFloat(scene, W / 2, 110, "♪ VOID PULSE ON", "#c4b5fd");
          }
        });

        var origGameOver = scene.gameOver.bind(scene);
        scene.gameOver = function () {
          scene.musicOn = false;
          try {
            if (typeof RNF !== "undefined" && RNF.stopBgm) RNF.stopBgm();
          } catch (_e2) {}
          origGameOver();
        };
        scene.syncBarBg = scene.add.rectangle(W / 2, 78, 280, 12, 0x1e293b, 0.9).setDepth(20);
        scene.syncBarFill = scene.add.rectangle(W / 2 - 140, 78, 280, 12, 0x34d399, 0.95).setOrigin(0, 0.5).setDepth(21);
        scene.modeHud = scene.add.text(W / 2, 58, "READY", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#c4b5fd"
        }).setOrigin(0.5).setDepth(22);

        // 譜面模式庫：單音／雙音／之字／連打／和弦／金色／長音
        scene.patterns = [
          { kind: "single", lanes: [0] },
          { kind: "single", lanes: [1] },
          { kind: "single", lanes: [2] },
          { kind: "single", lanes: [3] },
          { kind: "double", lanes: [0, 2] },
          { kind: "double", lanes: [1, 3] },
          { kind: "double", lanes: [0, 3] },
          { kind: "zigzag", lanes: [0, 1, 2, 3] },
          { kind: "zigzag", lanes: [3, 2, 1, 0] },
          { kind: "stream", lanes: [1, 1, 2, 2] },
          { kind: "chord", lanes: [1, 2] },
          { kind: "gold", lanes: [0] },
          { kind: "hold", lanes: [0] },
          { kind: "hold", lanes: [3] },
          { kind: "burst", lanes: [0, 1, 2, 3] }
        ];

        scene.spawnNoteAt = function (lane, type) {
          lane = Phaser.Math.Clamp(lane, 0, 3);
          var key = type === "gold" ? "note-gold" : type === "hold" ? "note-hold" : "note";
          var note = scene.add.image(scene.lanes[lane], scene.spawnY, key).setDepth(10);
          note.setMask(scene.noteMask);
          if (type !== "gold") note.setTint(scene.laneColors[lane]);
          note.setData("lane", lane);
          note.setData("hit", false);
          note.setData("type", type || "tap");
          note.setData("holdProg", 0);
          note.setData("holdNeed", type === "hold" ? 0.55 : 0);
          if (type === "hold") {
            note.setDisplaySize(16, 64);
            note.y = scene.spawnY + 20;
          } else {
            note.setDisplaySize(56, 18);
          }
          scene.notes.add(note);
          return note;
        };

        scene.queuePattern = function () {
          var p = scene.patterns[scene.patternIdx % scene.patterns.length];
          scene.patternIdx += 1;
          // 依威脅度偶爾跳過長音／爆發，避免 casual 過密
          if (scene.diffKey === "casual" && (p.kind === "burst" || p.kind === "hold") && Math.random() < 0.45) {
            p = scene.patterns[Phaser.Math.Between(0, 6)];
          }
          var delay = 0;
          var step = Math.max(0.12, (60 / scene.bpm) * (p.kind === "burst" ? 0.42 : p.kind === "stream" || p.kind === "zigzag" ? 0.55 : 1));
          if (p.kind === "gold") {
            scene.spawnNoteAt(Phaser.Math.Between(0, 3), "gold");
            return step * 1.2;
          }
          if (p.kind === "double" || p.kind === "chord") {
            p.lanes.forEach(function (lane) {
              scene.spawnNoteAt(lane, "tap");
            });
            return step * 1.15;
          }
          if (p.kind === "hold") {
            scene.spawnNoteAt(p.lanes[0], "hold");
            return step * 1.6;
          }
          p.lanes.forEach(function (lane, i) {
            scene.time.delayedCall(delay, function () {
              if (!scene.alive) return;
              scene.spawnNoteAt(lane, p.kind === "burst" && i === p.lanes.length - 1 ? "gold" : "tap");
            });
            delay += step * 1000;
          });
          return delay / 1000 + step * 0.4;
        };

        scene.flashLane = function (idx, color) {
          var pad = scene.judgePads[idx];
          var rail = scene.laneVisuals[idx] && scene.laneVisuals[idx].rail;
          if (!pad) return;
          pad.setFillStyle(color || scene.laneColors[idx], 0.85);
          if (rail) rail.setStrokeStyle(3, color || scene.laneColors[idx], 0.95);
          scene.tweens.add({
            targets: pad,
            alpha: 0.35,
            duration: 160,
            ease: "Cubic.easeOut",
            onComplete: function () {
              pad.setFillStyle(scene.laneColors[idx], 0.28);
              pad.setAlpha(1);
              if (rail) rail.setStrokeStyle(2, scene.laneColors[idx], 0.45);
            }
          });
          scene.tweens.add({
            targets: [scene.touchPads[idx], pad],
            scaleX: 1.14,
            scaleY: 1.14,
            duration: 90,
            yoyo: true,
            ease: "Back.easeOut"
          });
        };

        scene.showHitJuice = function (lane, grade, gain, color) {
          var x = scene.lanes[lane];
          var y = scene.judgementY;
          var ringColor = grade === "PERFECT" ? 0xfde68a : grade === "GREAT" ? 0x67e8f9 : 0xa78bfa;
          var ring = scene.add.circle(x, y, 10, ringColor, 0.55).setDepth(30).setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({
            targets: ring,
            scale: grade === "PERFECT" ? 4.2 : 3.2,
            alpha: 0,
            duration: grade === "PERFECT" ? 340 : 260,
            ease: "Cubic.easeOut",
            onComplete: function () { ring.destroy(); }
          });
          var ring2 = scene.add.circle(x, y, 6, 0xffffff, 0.7).setDepth(31);
          scene.tweens.add({
            targets: ring2,
            scale: 2.4,
            alpha: 0,
            duration: 180,
            ease: "Cubic.easeOut",
            onComplete: function () { ring2.destroy(); }
          });

          // 判定大字
          scene.gradeBanner.setText(grade);
          scene.gradeBanner.setColor(color);
          scene.gradeBanner.setPosition(x, y - 56);
          scene.gradeBanner.setAlpha(1).setScale(0.35);
          scene.tweens.killTweensOf(scene.gradeBanner);
          scene.tweens.add({
            targets: scene.gradeBanner,
            scale: grade === "PERFECT" ? 1.25 : 1.08,
            duration: 160,
            ease: "Back.easeOut",
            yoyo: true,
            hold: 80,
            onComplete: function () {
              scene.tweens.add({
                targets: scene.gradeBanner,
                alpha: 0,
                y: y - 90,
                duration: 280,
                ease: "Cubic.easeOut"
              });
            }
          });

          // 加分數字（獨立、更大）
          scene.scorePopup.setText("+" + gain);
          scene.scorePopup.setColor(grade === "PERFECT" ? "#fde68a" : "#e2e8f0");
          scene.scorePopup.setPosition(x, y - 100);
          scene.scorePopup.setAlpha(1).setScale(0.5);
          scene.tweens.killTweensOf(scene.scorePopup);
          scene.tweens.add({
            targets: scene.scorePopup,
            scale: 1.2,
            y: y - 140,
            duration: 220,
            ease: "Back.easeOut",
            onComplete: function () {
              scene.tweens.add({
                targets: scene.scorePopup,
                alpha: 0,
                y: y - 170,
                duration: 320,
                ease: "Cubic.easeOut"
              });
            }
          });

          // 連擊橫幅
          if (scene.combo >= 2) {
            scene.comboBanner.setText(scene.combo + " COMBO");
            scene.comboBanner.setColor(scene.fever ? "#fbbf24" : "#f8fafc");
            scene.comboBanner.setAlpha(1).setScale(0.55);
            scene.tweens.killTweensOf(scene.comboBanner);
            scene.tweens.add({
              targets: scene.comboBanner,
              scale: 1.05,
              duration: 140,
              ease: "Back.easeOut",
              yoyo: true,
              hold: 60,
              onComplete: function () {
                scene.tweens.add({
                  targets: scene.comboBanner,
                  alpha: 0,
                  duration: 420,
                  ease: "Cubic.easeOut"
                });
              }
            });
          }

          // 軌道光束
          var beam = scene.add.rectangle(x, (scene.trackTop + y) / 2, 8, y - scene.trackTop, scene.laneColors[lane], 0.55)
            .setDepth(9)
            .setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({
            targets: beam,
            alpha: 0,
            scaleX: 4,
            duration: 220,
            ease: "Cubic.easeOut",
            onComplete: function () { beam.destroy(); }
          });

          // 短促鏡頭衝擊
          scene.cameras.main.shake(grade === "PERFECT" ? 120 : 80, grade === "PERFECT" ? 0.016 : 0.01);
          if (grade === "PERFECT") {
            scene.tweens.add({
              targets: scene.cameras.main,
              zoom: 1.04,
              duration: 70,
              yoyo: true,
              ease: "Cubic.easeOut"
            });
          }
        };

        scene.applyMiss = function (lane, reason) {
          scene.combo = 0;
          scene.fever = false;
          scene.feverTimer = 0;
          scene.misses += 1;
          scene.syncHp = Math.max(0, scene.syncHp - (reason === "empty" ? 5 : 10));
          SFX.hit();
          scene.cameras.main.shake(90, 0.012);
          var x = typeof lane === "number" ? scene.lanes[lane] : W / 2;
          neonBurst(scene, x, scene.judgementY, "spark-pink", 18);
          uiFloat(scene, x, scene.judgementY - 36, "MISS", "#fb7185");
          scene.comboBanner.setAlpha(0);
          if (typeof lane === "number") scene.flashLane(lane, 0xfb7185);
          if (scene.syncHp <= 0) scene.gameOver();
        };

        scene.resolveHit = function (note, dist) {
          var lane = note.getData("lane");
          var type = note.getData("type");
          note.setData("hit", true);
          var grade = "GOOD";
          var base = 70;
          var spark = "spark-violet";
          var color = "#c4b5fd";
          if (dist <= 14) {
            grade = "PERFECT";
            base = type === "gold" ? 260 : 180;
            spark = type === "gold" ? "spark-gold" : "spark-cyan";
            color = type === "gold" ? "#fde68a" : "#67e8f9";
            scene.perfects += 1;
            scene.syncHp = Math.min(100, scene.syncHp + (type === "gold" ? 8 : 3));
          } else if (dist <= 28) {
            grade = "GREAT";
            base = type === "gold" ? 170 : 120;
            spark = "spark-violet";
            color = "#c4b5fd";
            scene.greats += 1;
            scene.syncHp = Math.min(100, scene.syncHp + 1);
          } else {
            scene.goods += 1;
          }
          note.destroy();
          scene.combo += 1;
          scene.maxCombo = Math.max(scene.maxCombo, scene.combo);
          if (scene.combo >= 20 && !scene.fever) {
            scene.fever = true;
            scene.feverTimer = 8;
            scene.musicIntensity = 1.25;
            SFX.combo();
            SFX.confirm();
            uiFloat(scene, W / 2, H / 2 - 40, "FEVER!", "#fbbf24");
            scene.cameras.main.shake(160, 0.02);
            neonBurst(scene, W / 2, scene.judgementY, "spark-gold", 30);
            neonBurst(scene, W / 2, H / 2, "spark-violet", 22);
          }
          var feverMul = scene.fever ? 2 : 1;
          var comboBonus = scene.combo * 6 + (grade === "PERFECT" ? 20 : grade === "GREAT" ? 10 : 0);
          var gain = Math.floor(base * scene.diff.scoreMult * (0.85 + scene.dangerMultiplier * 0.15) * feverMul) + comboBonus;
          scene.score += gain;

          // 分級打擊音效
          if (grade === "PERFECT") SFX.perfect();
          else if (grade === "GREAT") SFX.great();
          else SFX.good();
          if (type === "gold") SFX.score();

          neonBurst(scene, scene.lanes[lane], scene.judgementY, spark, grade === "PERFECT" ? 28 : grade === "GREAT" ? 20 : 15);
          if (grade === "PERFECT") {
            neonBurst(scene, scene.lanes[lane], scene.judgementY - 20, "spark-gold", 16);
          }
          scene.showHitJuice(lane, grade, gain, color);
          scene.flashLane(lane, scene.laneColors[lane]);

          // 連擊里程碑
          if (scene.combo === 10 || scene.combo === 25 || scene.combo === 50 || scene.combo === 100) {
            SFX.combo();
            uiFloat(scene, W / 2, H / 2 - 20, scene.combo + " HIT STREAK!", "#fbbf24");
            neonBurst(scene, W / 2, H / 2, "spark-gold", 26);
          }
        };

        scene.hitLane = function (idx, fromTouch) {
          if (!scene.alive) return;
          var candidates = scene.notes.getChildren().filter(function (note) {
            return note.active && !note.getData("hit") && note.getData("lane") === idx;
          }).sort(function (a, b) {
            return Math.abs(a.y - scene.judgementY) - Math.abs(b.y - scene.judgementY);
          });
          if (!candidates.length) {
            // 空按不重罰：僅在判定線附近有音時才算 miss；完全空軌只閃一下
            scene.flashLane(idx, 0x64748b);
            if (fromTouch) SFX.click();
            return;
          }
          var note = candidates[0];
          var type = note.getData("type");
          var dist = Math.abs(note.y - scene.judgementY);
          if (type === "hold") {
            if (dist <= 48 && note.y >= scene.judgementY - 40) {
              scene.holdLane[idx] = note;
              note.setData("holding", true);
              scene.flashLane(idx, scene.laneColors[idx]);
              SFX.beat();
            } else if (dist <= 70) {
              // 太早／太晚按長音 → miss 該音
              note.setData("hit", true);
              note.destroy();
              scene.applyMiss(idx, "timing");
            }
            return;
          }
          if (dist <= 46) {
            scene.resolveHit(note, dist);
          } else if (dist <= 70) {
            note.setData("hit", true);
            note.destroy();
            scene.applyMiss(idx, "timing");
          } else {
            scene.flashLane(idx, 0x64748b);
          }
        };

        scene.nextPatternIn = 0.35;
        scene.beatPulseRing = scene.add.circle(W / 2, scene.judgementY, 8, 0xa78bfa, 0.0).setDepth(5);
      },
      updateState: function (scene, dt, threat) {
        if (!scene.alive) return;

        // BPM 拍點視覺 + 節奏音樂（每 1/4 拍進一步）
        var beatSec = 60 / scene.bpm;
        var stepSec = beatSec / 4;
        scene.beatClock += dt;
        scene.beatPulse += dt;
        if (scene.beatPulse >= stepSec) {
          scene.beatPulse -= stepSec;
          if (scene.musicOn) {
            playRhythmStep(scene.musicStep, scene.fever, scene.musicIntensity || 1);
            scene.musicStep += 1;
          }
          // 每整拍閃判定線
          if (scene.musicStep % 4 === 1) {
            scene.judgePads.forEach(function (pad) {
              scene.tweens.add({
                targets: pad,
                scaleX: 1.08,
                duration: 70,
                yoyo: true,
                ease: "Sine.easeOut"
              });
            });
            if (scene.playFrame) {
              scene.tweens.add({
                targets: scene.playFrame,
                alpha: 0.95,
                duration: 60,
                yoyo: true
              });
            }
          }
        }

        if (scene.fever) {
          scene.feverTimer -= dt;
          if (scene.feverTimer <= 0) {
            scene.fever = false;
            scene.feverTimer = 0;
            scene.musicIntensity = 1;
          }
        }

        // 譜面生成（依 BPM + 危險倍率）
        scene.nextPatternIn -= dt;
        if (scene.nextPatternIn <= 0) {
          var wait = scene.queuePattern();
          var dens = Math.max(0.55, 1.35 / Math.sqrt(threat));
          scene.nextPatternIn = Math.max(0.18, wait * dens);
        }

        var fallSpeed = (210 + 90 * threat) * (scene.diffKey === "extreme" ? 1.12 : scene.diffKey === "casual" ? 0.88 : 1);

        // 長音按住檢測
        scene.laneKeys.forEach(function (lane, idx) {
          var held = lane.key.isDown;
          var holdNote = scene.holdLane[idx];
          if (holdNote && holdNote.active && holdNote.getData("holding")) {
            if (held) {
              var prog = (holdNote.getData("holdProg") || 0) + dt;
              holdNote.setData("holdProg", prog);
              holdNote.setTint(0xfbbf24);
              if (prog >= holdNote.getData("holdNeed")) {
                holdNote.setData("hit", true);
                scene.holdLane[idx] = null;
                scene.resolveHit(holdNote, 0);
              }
            } else {
              // 鬆開太早
              holdNote.setData("hit", true);
              holdNote.destroy();
              scene.holdLane[idx] = null;
              scene.applyMiss(idx, "hold");
            }
          }
        });

        // 鍵盤 JustDown
        scene.laneKeys.forEach(function (lane, idx) {
          if (Phaser.Input.Keyboard.JustDown(lane.key)) scene.hitLane(idx, false);
        });

        // 音符下落（dt），並嚴格夾在軌道內
        scene.notes.getChildren().forEach(function (note) {
          if (!note.active || note.getData("hit")) return;
          if (note.getData("holding")) {
            // 長音按住時鎖在判定線
            note.y = scene.judgementY;
            note.x = scene.lanes[note.getData("lane")];
            return;
          }
          note.y += fallSpeed * dt;
          note.x = scene.lanes[note.getData("lane")];
          if (note.y > scene.missY) {
            note.setData("hit", true);
            var lane = note.getData("lane");
            note.destroy();
            if (scene.holdLane[lane] === note) scene.holdLane[lane] = null;
            scene.applyMiss(lane, "drop");
          }
        });

        // 同步條與 HUD
        var sync = Math.max(0, Math.min(100, scene.syncHp));
        scene.syncBarFill.width = 280 * (sync / 100);
        scene.syncBarFill.setFillStyle(sync > 55 ? 0x34d399 : sync > 25 ? 0xfbbf24 : 0xf472b6, 0.95);
        var total = scene.perfects + scene.greats + scene.goods + scene.misses;
        var acc = total ? ((scene.perfects + scene.greats * 0.7 + scene.goods * 0.4) / total) * 100 : 100;
        var feverLabel = scene.fever ? ("FEVER " + Math.max(0, scene.feverTimer).toFixed(1) + "s") : ("COMBO " + scene.combo);
        scene.setExtraHud("SYNC " + Math.round(sync) + "% · " + feverLabel + " · ACC " + acc.toFixed(0) + "%");
        scene.modeHud.setText(
          (scene.fever ? "狂熱倍率 x2 · " : "") +
          "P" + scene.perfects + " G" + scene.greats + " · MAX " + scene.maxCombo +
          " · " + Math.round(scene.bpm * Math.min(1.35, 0.85 + threat * 0.2)) + " BPM"
        );
      }
    },
    "astro-gravity-runner": {
      slug: "astro-gravity-runner",
      title: "ASTRO GRAVITY RUNNER",
      titleZh: "星際重力翻轉者",
      accent: 0x34d399,
      help: "點擊／空白鍵／W／↑ 翻轉重力，在上下星軌之間滑翔。障礙可讀可躲，翻轉途中仍會碰撞。同 X 不會雙線封死。收集星核加分。",
      objective: "流暢翻轉 · 讀陣閃避 · 收集星核",
      scoreVerb: "DIST",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.physics.world.gravity.y = 0;

        // 跑道對齊地板：消除「站在空中」的奇怪感
        scene.laneDown = H - 96;
        scene.laneUp = 96;
        scene.railHalf = 10;
        scene.runnerGravity = 1;
        scene.isFlipping = false;
        scene.flipCd = 0;
        scene.flipInvuln = 0;
        scene.spawnAcc = 0;
        scene.starAcc = 0;
        scene.patternQueue = [];
        scene.lastSpawnLane = 1;

        // 專用炫彩貼圖 v3（強制新 key，避免舊貼圖殘留）
        (function buildAstroArt() {
          var g = scene.make.graphics({ x: 0, y: 0, add: false });

          // ── 艦體：流線戰艦 + 雙翼刃 + 引擎噴口 ──
          g.clear();
          // 外層光暈底
          g.fillStyle(0x34d399, 0.25);
          g.fillEllipse(48, 22, 92, 36);
          // 下翼
          g.fillStyle(0x059669, 1);
          g.fillTriangle(18, 22, 52, 34, 8, 38);
          g.fillStyle(0xf472b6, 0.95);
          g.fillTriangle(20, 24, 48, 32, 12, 36);
          // 上翼
          g.fillStyle(0x0ea5e9, 1);
          g.fillTriangle(18, 22, 52, 10, 8, 6);
          g.fillStyle(0xa78bfa, 0.95);
          g.fillTriangle(20, 20, 48, 12, 12, 8);
          // 主艦身
          g.fillStyle(0x022c22, 1);
          g.fillRoundedRect(10, 12, 58, 20, 8);
          g.fillStyle(0x34d399, 1);
          g.fillRoundedRect(12, 14, 54, 16, 7);
          g.fillStyle(0x6ee7b7, 1);
          g.fillRoundedRect(16, 16, 42, 8, 4);
          // 金色裝甲飾條
          g.fillStyle(0xfbbf24, 1);
          g.fillRect(18, 20, 38, 3);
          g.fillStyle(0xfff7ed, 0.9);
          g.fillRect(20, 20, 20, 1);
          // 座艙
          g.fillStyle(0x082f49, 1);
          g.fillRoundedRect(22, 15, 20, 10, 4);
          g.fillStyle(0x22d3ee, 0.95);
          g.fillRoundedRect(24, 16, 16, 8, 3);
          g.fillStyle(0xffffff, 0.75);
          g.fillCircle(30, 19, 2.5);
          // 艦首刃
          g.fillStyle(0xecfeff, 1);
          g.fillTriangle(64, 14, 94, 22, 64, 30);
          g.fillStyle(0x67e8f9, 1);
          g.fillTriangle(66, 16, 88, 22, 66, 28);
          g.fillStyle(0xfbbf24, 1);
          g.fillTriangle(78, 20, 94, 22, 78, 24);
          // 引擎噴口
          g.fillStyle(0x0f172a, 1);
          g.fillRoundedRect(4, 15, 12, 14, 3);
          g.fillStyle(0xf472b6, 1);
          g.fillCircle(8, 22, 5);
          g.fillStyle(0xfbbf24, 1);
          g.fillCircle(7, 22, 3);
          g.fillStyle(0xffffff, 0.95);
          g.fillCircle(6, 21, 1.5);
          g.generateTexture("astro-ship-v3", 96, 44);

          // ── 下軌尖刺：高對比警示錐（紅白斜紋，易辨）──
          g.clear();
          g.fillStyle(0x000000, 0.55);
          g.fillTriangle(30, 4, 58, 54, 2, 54);
          g.fillStyle(0xffffff, 1);
          g.fillTriangle(30, 2, 56, 52, 4, 52);
          g.fillStyle(0xdc2626, 1);
          g.fillTriangle(30, 8, 50, 50, 10, 50);
          // 黃黑警示斜紋
          g.fillStyle(0xfbbf24, 1);
          g.fillTriangle(30, 16, 44, 46, 30, 46);
          g.fillStyle(0x111827, 1);
          g.fillTriangle(30, 22, 40, 46, 30, 46);
          g.fillStyle(0xfbbf24, 1);
          g.fillTriangle(30, 30, 36, 46, 30, 46);
          // 驚嘆號
          g.fillStyle(0xffffff, 1);
          g.fillRoundedRect(27, 20, 6, 16, 2);
          g.fillCircle(30, 42, 3.5);
          g.generateTexture("astro-spike-down", 60, 56);

          // ── 上軌尖刺：紫白警示錐（與下軌明顯不同色）──
          g.clear();
          g.fillStyle(0x000000, 0.55);
          g.fillTriangle(30, 4, 58, 54, 2, 54);
          g.fillStyle(0xffffff, 1);
          g.fillTriangle(30, 2, 56, 52, 4, 52);
          g.fillStyle(0x7c3aed, 1);
          g.fillTriangle(30, 8, 50, 50, 10, 50);
          g.fillStyle(0xf5d0fe, 1);
          g.fillTriangle(30, 16, 44, 46, 30, 46);
          g.fillStyle(0x4c1d95, 1);
          g.fillTriangle(30, 22, 40, 46, 30, 46);
          g.fillStyle(0xf5d0fe, 1);
          g.fillTriangle(30, 30, 36, 46, 30, 46);
          g.fillStyle(0xffffff, 1);
          g.fillRoundedRect(27, 20, 6, 16, 2);
          g.fillCircle(30, 42, 3.5);
          g.generateTexture("astro-spike-up", 60, 56);

          // ── 下軌能量柱：紅底白框 + DANGER 條紋 ──
          g.clear();
          g.fillStyle(0x000000, 0.5);
          g.fillRoundedRect(4, 2, 44, 72, 8);
          g.fillStyle(0xffffff, 1);
          g.fillRoundedRect(6, 4, 40, 68, 7);
          g.fillStyle(0xb91c1c, 1);
          g.fillRoundedRect(10, 8, 32, 60, 5);
          g.fillStyle(0xfbbf24, 1);
          g.fillRect(10, 14, 32, 10);
          g.fillStyle(0x111827, 1);
          g.fillRect(10, 24, 32, 10);
          g.fillStyle(0xfbbf24, 1);
          g.fillRect(10, 34, 32, 10);
          g.fillStyle(0x111827, 1);
          g.fillRect(10, 44, 32, 10);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(26, 58, 8);
          g.fillStyle(0xdc2626, 1);
          g.fillRoundedRect(24, 50, 4, 10, 1);
          g.fillCircle(26, 64, 2.5);
          g.generateTexture("astro-pillar-down", 52, 76);

          // ── 上軌能量柱：紫底白框 ──
          g.clear();
          g.fillStyle(0x000000, 0.5);
          g.fillRoundedRect(4, 2, 44, 72, 8);
          g.fillStyle(0xffffff, 1);
          g.fillRoundedRect(6, 4, 40, 68, 7);
          g.fillStyle(0x6d28d9, 1);
          g.fillRoundedRect(10, 8, 32, 60, 5);
          g.fillStyle(0xe9d5ff, 1);
          g.fillRect(10, 14, 32, 10);
          g.fillStyle(0x2e1065, 1);
          g.fillRect(10, 24, 32, 10);
          g.fillStyle(0xe9d5ff, 1);
          g.fillRect(10, 34, 32, 10);
          g.fillStyle(0x2e1065, 1);
          g.fillRect(10, 44, 32, 10);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(26, 58, 8);
          g.fillStyle(0xa78bfa, 1);
          g.fillRoundedRect(24, 50, 4, 10, 1);
          g.fillCircle(26, 64, 2.5);
          g.generateTexture("astro-pillar-up", 52, 76);

          // ── 星核獎勵：棱彩寶珠 + 八角芒 ──
          g.clear();
          g.fillStyle(0xfbbf24, 0.35);
          g.fillCircle(28, 28, 26);
          // 八角星芒
          g.fillStyle(0xfde68a, 0.9);
          g.fillTriangle(28, 2, 32, 22, 24, 22);
          g.fillTriangle(28, 54, 32, 34, 24, 34);
          g.fillTriangle(2, 28, 22, 32, 22, 24);
          g.fillTriangle(54, 28, 34, 32, 34, 24);
          g.fillStyle(0xf472b6, 0.85);
          g.fillTriangle(10, 10, 24, 24, 18, 28);
          g.fillTriangle(46, 10, 32, 24, 38, 28);
          g.fillTriangle(10, 46, 24, 32, 18, 28);
          g.fillTriangle(46, 46, 32, 32, 38, 28);
          // 珠體
          g.fillStyle(0xb45309, 1);
          g.fillCircle(28, 28, 14);
          g.fillStyle(0xfbbf24, 1);
          g.fillCircle(28, 28, 12);
          g.fillStyle(0x22d3ee, 0.9);
          g.fillCircle(28, 28, 8);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(28, 28, 5);
          g.fillStyle(0xf472b6, 0.8);
          g.fillCircle(24, 24, 3);
          g.fillStyle(0xffffff, 1);
          g.fillCircle(23, 23, 1.5);
          g.generateTexture("astro-core-v3", 56, 56);

          // ── 光粒子／拖尾用 ──
          g.clear();
          g.fillStyle(0x34d399, 1);
          g.fillCircle(4, 4, 4);
          g.generateTexture("astro-spark-g", 8, 8);
          g.clear();
          g.fillStyle(0x22d3ee, 1);
          g.fillCircle(4, 4, 4);
          g.generateTexture("astro-spark-c", 8, 8);
          g.clear();
          g.fillStyle(0xf472b6, 1);
          g.fillCircle(4, 4, 4);
          g.generateTexture("astro-spark-p", 8, 8);
          g.clear();
          g.fillStyle(0xfbbf24, 1);
          g.fillCircle(5, 5, 5);
          g.generateTexture("astro-spark-gold", 10, 10);
          g.clear();
          g.fillStyle(0xa78bfa, 1);
          g.fillCircle(4, 4, 4);
          g.generateTexture("astro-spark-v", 8, 8);

          g.destroy();
        })();

        // 雙星軌：寬霓虹軌道 + 內發光
        scene.add.rectangle(W / 2, H / 2, W, H, 0x020617, 0.35).setDepth(0);
        var railDown = scene.add.rectangle(W / 2, scene.laneDown + 24, W + 40, 22, 0x0ea5e9, 0.35).setDepth(2);
        var railUp = scene.add.rectangle(W / 2, scene.laneUp - 24, W + 40, 22, 0x8b5cf6, 0.35).setDepth(2);
        railDown.setStrokeStyle(2, 0x67e8f9, 0.85);
        railUp.setStrokeStyle(2, 0xc4b5fd, 0.85);
        scene.floorLines = [railDown, railUp];
        scene.add.rectangle(W / 2, scene.laneDown + 24, W + 40, 3, 0xecfeff, 0.95)
          .setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
        scene.add.rectangle(W / 2, scene.laneUp - 24, W + 40, 3, 0xf5d0fe, 0.95)
          .setDepth(3).setBlendMode(Phaser.BlendModes.ADD);
        scene.add.rectangle(W / 2, H / 2, W, 3, 0x22d3ee, 0.12)
          .setDepth(1).setBlendMode(Phaser.BlendModes.ADD);

        // 背景漂浮星塵
        for (var si = 0; si < 28; si++) {
          var sc = [0x22d3ee, 0xa78bfa, 0xf472b6, 0xfbbf24, 0x34d399][si % 5];
          var starDust = scene.add.circle(
            Phaser.Math.Between(20, W - 20),
            Phaser.Math.Between(40, H - 40),
            Phaser.Math.Between(1, 3), sc, Phaser.Math.FloatBetween(0.15, 0.45)
          ).setDepth(1).setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({
            targets: starDust,
            x: starDust.x - Phaser.Math.Between(40, 120),
            alpha: 0.08,
            duration: Phaser.Math.Between(1800, 3600),
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
        }

        scene.player = scene.physics.add.sprite(168, scene.laneDown, "astro-ship-v3");
        scene.player.body.allowGravity = false;
        scene.player.setCollideWorldBounds(true);
        scene.player.setSize(52, 18);
        scene.player.setOffset(14, 13);
        scene.player.setDepth(12);
        scene.player.setScale(1.05);

        // 雙層艦體光環
        scene.shipGlow = scene.add.circle(scene.player.x - 6, scene.player.y, 28, 0x34d399, 0.22)
          .setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
        scene.shipGlow2 = scene.add.circle(scene.player.x + 8, scene.player.y, 16, 0x22d3ee, 0.28)
          .setDepth(10).setBlendMode(Phaser.BlendModes.ADD);
        scene.tweens.add({
          targets: scene.shipGlow, scale: 1.25, alpha: 0.12, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });
        scene.tweens.add({
          targets: scene.shipGlow2, scale: 1.35, alpha: 0.1, duration: 380, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });

        // 引擎拖尾粒子
        scene.engineTrail = scene.add.particles(scene.player.x - 28, scene.player.y, "astro-spark-g", {
          speed: { min: 40, max: 120 },
          angle: { min: 150, max: 210 },
          lifespan: { min: 220, max: 480 },
          scale: { start: 1.1, end: 0 },
          alpha: { start: 0.95, end: 0 },
          blendMode: "ADD",
          frequency: 28,
          quantity: 2
        }).setDepth(11);
        scene.engineTrail2 = scene.add.particles(scene.player.x - 24, scene.player.y, "astro-spark-p", {
          speed: { min: 20, max: 80 },
          angle: { min: 160, max: 200 },
          lifespan: { min: 180, max: 360 },
          scale: { start: 0.8, end: 0 },
          alpha: { start: 0.7, end: 0 },
          blendMode: "ADD",
          frequency: 40,
          quantity: 1
        }).setDepth(11);

        scene.obstacles = scene.physics.add.group();
        scene.stars = scene.physics.add.group();

        scene.syncShipPose = function () {
          scene.player.setAngle(scene.runnerGravity > 0 ? 5 : -5);
          scene.player.setFlipY(false);
          var down = scene.runnerGravity > 0;
          if (scene.shipGlow) scene.shipGlow.setFillStyle(down ? 0x34d399 : 0xa78bfa, 0.28);
          if (scene.shipGlow2) scene.shipGlow2.setFillStyle(down ? 0x22d3ee : 0xf472b6, 0.32);
        };
        scene.syncShipPose();

        scene.destroyFxChild = function (obj) {
          if (!obj) return;
          var aura = obj.getData("aura");
          var ring = obj.getData("ring");
          var trail = obj.getData("trail");
          var tag = obj.getData("tag");
          if (aura && aura.destroy) aura.destroy();
          if (ring && ring.destroy) ring.destroy();
          if (trail && trail.destroy) trail.destroy();
          if (tag && tag.destroy) tag.destroy();
        };

        scene.doFlip = function () {
          if (!scene.alive || scene.isFlipping || scene.flipCd > 0) return;
          scene.runnerGravity *= -1;
          scene.flipCd = 0.12;
          scene.isFlipping = true;
          scene.flipInvuln = 0.07;
          var targetY = scene.runnerGravity > 0 ? scene.laneDown : scene.laneUp;
          SFX.jump();
          scene.cameras.main.shake(70, 0.007);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-green", 16);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-violet", 14);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-gold", 12);
          // 翻轉光柱
          var beam = scene.add.rectangle(scene.player.x, H / 2, 18, H - 80, 0x34d399, 0.35)
            .setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({
            targets: beam, alpha: 0, scaleX: 3, duration: 260, ease: "Cubic.easeOut",
            onComplete: function () { beam.destroy(); }
          });
          scene.syncShipPose();

          scene.tweens.killTweensOf(scene.player);
          scene.tweens.add({
            targets: scene.player,
            y: targetY,
            duration: 200,
            ease: "Cubic.easeInOut",
            onUpdate: function () {
              if (scene.player && scene.player.body) {
                scene.player.body.reset(scene.player.x, scene.player.y);
              }
            },
            onComplete: function () {
              scene.isFlipping = false;
              if (scene.player && scene.player.body) {
                scene.player.y = targetY;
                scene.player.body.reset(scene.player.x, targetY);
              }
            }
          });
        };

        scene.hitObstacle = function (obs) {
          if (!scene.alive || !obs || !obs.active) return;
          if (scene.flipInvuln > 0) return;
          scene.destroyFxChild(obs);
          try { obs.destroy(); } catch (_e) {}
          SFX.hit();
          SFX.explode();
          scene.cameras.main.shake(220, 0.028);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-pink", 28);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-violet", 18);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-gold", 14);
          scene.gameOver();
        };

        scene.physics.add.overlap(scene.player, scene.obstacles, function (_p, obs) {
          scene.hitObstacle(obs);
        });
        scene.physics.add.overlap(scene.player, scene.stars, function (_p, star) {
          if (!star.active) return;
          var sx = star.x;
          var sy = star.y;
          scene.destroyFxChild(star);
          star.destroy();
          scene.score += Math.floor(160 * scene.diff.scoreMult * (0.85 + scene.dangerMultiplier * 0.15));
          SFX.score();
          scene.cameras.main.shake(100, 0.012);
          neonBurst(scene, sx, sy, "spark-gold", 26);
          neonBurst(scene, sx, sy, "spark-pink", 16);
          neonBurst(scene, sx, sy, "spark-cyan", 14);
          // 炫彩得分彈幕
          var pop = scene.add.text(sx, sy, "+STAR CORE", {
            fontFamily: "Segoe UI, sans-serif", fontSize: "18px", fontStyle: "bold",
            color: "#ffffff", stroke: "#fbbf24", strokeThickness: 4
          }).setOrigin(0.5).setDepth(30).setScale(0.5);
          var ghost = scene.add.text(sx, sy, "+STAR CORE", {
            fontFamily: "Segoe UI, sans-serif", fontSize: "18px", fontStyle: "bold", color: "#f472b6"
          }).setOrigin(0.5).setDepth(29).setAlpha(0.6);
          scene.tweens.add({
            targets: [pop, ghost], y: sy - 48, scale: 1.25, duration: 520, ease: "Back.easeOut"
          });
          scene.tweens.add({
            targets: [pop, ghost], alpha: 0, duration: 360, delay: 200, ease: "Cubic.easeIn",
            onComplete: function () { pop.destroy(); ghost.destroy(); }
          });
          var ring = scene.add.circle(sx, sy, 8, 0xfbbf24, 0)
            .setStrokeStyle(3, 0xfbbf24, 1).setDepth(28).setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({
            targets: ring, scale: 5, alpha: 0, duration: 400, ease: "Cubic.easeOut",
            onComplete: function () { ring.destroy(); }
          });
        });

        scene.input.on("pointerdown", function () {
          if (scene.alive) scene.doFlip();
        });

        scene.spawnObstacle = function (lane, kind, xExtra) {
          var laneY = lane === 0 ? scene.laneDown : scene.laneUp;
          var key = kind === "pillar"
            ? (lane === 0 ? "astro-pillar-down" : "astro-pillar-up")
            : (lane === 0 ? "astro-spike-down" : "astro-spike-up");
          var obs = scene.obstacles.create(W + 48 + (xExtra || 0), laneY, key);
          obs.body.allowGravity = false;
          if (kind === "pillar") {
            obs.setSize(26, 52);
            obs.setOffset(13, 12);
            obs.y = lane === 0 ? laneY - 12 : laneY + 12;
            obs.setScale(1.12);
          } else {
            obs.setSize(30, 32);
            obs.setOffset(15, 14);
            if (lane === 1) obs.setFlipY(true);
            obs.y = lane === 0 ? laneY - 6 : laneY + 6;
            obs.setScale(1.15);
          }
          if (obs.body) obs.body.reset(obs.x, obs.y);
          obs.setDepth(8);
          obs.setData("lane", lane);

          // 清晰描邊光暈（深色陰影＋細亮框），避免糊成一片
          var shadow = scene.add.circle(obs.x, obs.y + 2, kind === "pillar" ? 28 : 22, 0x000000, 0.45)
            .setDepth(7);
          var ring = scene.add.circle(obs.x, obs.y, kind === "pillar" ? 26 : 20, 0xffffff, 0)
            .setStrokeStyle(3, lane === 0 ? 0xfbbf24 : 0xe9d5ff, 1)
            .setDepth(7);
          // 警示標籤：下軌「危」、上軌「險」一眼分色
          var tag = scene.add.text(obs.x, obs.y + (kind === "pillar" ? -40 : -28), lane === 0 ? "▼危" : "▲險", {
            fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
            fontSize: "13px",
            fontStyle: "bold",
            color: "#ffffff",
            backgroundColor: lane === 0 ? "#dc2626" : "#7c3aed",
            padding: { x: 5, y: 2 }
          }).setOrigin(0.5).setDepth(9);
          scene.tweens.add({
            targets: ring, scale: 1.12, duration: 280, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
          });
          obs.setData("aura", shadow);
          obs.setData("ring", ring);
          obs.setData("tag", tag);
          return obs;
        };

        scene.enqueuePatterns = function (threat) {
          // 可讀陣型：絕不在同一 X 雙線封死
          var bag = [
            { kind: "single", lane: 0 },
            { kind: "single", lane: 1 },
            { kind: "single", lane: scene.lastSpawnLane ^ 1 },
            { kind: "pair-stagger", first: 0 },
            { kind: "pair-stagger", first: 1 },
            { kind: "triple-alt" },
            { kind: "pillar-gate", lane: 0 },
            { kind: "pillar-gate", lane: 1 }
          ];
          if (threat > 1.35) {
            bag.push({ kind: "fast-double", lane: 0 });
            bag.push({ kind: "fast-double", lane: 1 });
          }
          if (threat > 1.8) {
            bag.push({ kind: "zig-zag" });
          }
          // Casual 偏單障、少連發
          if (scene.diffKey === "casual") {
            bag = bag.filter(function (p) {
              return p.kind === "single" || p.kind === "pair-stagger" || p.kind === "pillar-gate";
            });
          }
          Phaser.Utils.Array.Shuffle(bag);
          for (var i = 0; i < Math.min(4, bag.length); i++) scene.patternQueue.push(bag[i]);
        };

        scene.firePattern = function (pat, speed) {
          if (!pat) return;
          if (pat.kind === "single") {
            scene.spawnObstacle(pat.lane, "spike", 0).setVelocityX(-speed);
            scene.lastSpawnLane = pat.lane;
          } else if (pat.kind === "pair-stagger") {
            // 錯開 X：先逼翻轉，再回來——可讀
            var a = scene.spawnObstacle(pat.first, "spike", 0);
            var b = scene.spawnObstacle(pat.first ^ 1, "spike", 150);
            a.setVelocityX(-speed);
            b.setVelocityX(-speed);
            scene.lastSpawnLane = pat.first ^ 1;
          } else if (pat.kind === "triple-alt") {
            var lanes = [0, 1, 0];
            for (var t = 0; t < 3; t++) {
              scene.spawnObstacle(lanes[t], "spike", t * 120).setVelocityX(-speed);
            }
            scene.lastSpawnLane = 0;
          } else if (pat.kind === "pillar-gate") {
            scene.spawnObstacle(pat.lane, "pillar", 0).setVelocityX(-speed * 0.92);
            scene.lastSpawnLane = pat.lane;
          } else if (pat.kind === "fast-double") {
            scene.spawnObstacle(pat.lane, "spike", 0).setVelocityX(-speed * 1.12);
            scene.spawnObstacle(pat.lane, "spike", 70).setVelocityX(-speed * 1.12);
            scene.lastSpawnLane = pat.lane;
          } else if (pat.kind === "zig-zag") {
            for (var z = 0; z < 4; z++) {
              scene.spawnObstacle(z % 2, "spike", z * 100).setVelocityX(-speed * 1.05);
            }
            scene.lastSpawnLane = 1;
          }
        };
      },
      updateState: function (scene, dt, threat) {
        if (!scene.alive) return;

        var flipKey =
          Phaser.Input.Keyboard.JustDown(scene.cursors.space) ||
          Phaser.Input.Keyboard.JustDown(scene.keys.W) ||
          Phaser.Input.Keyboard.JustDown(scene.cursors.up) ||
          Phaser.Input.Keyboard.JustDown(scene.keys.SPACE);
        if (flipKey) scene.doFlip();

        scene.flipCd = Math.max(0, scene.flipCd - dt);
        scene.flipInvuln = Math.max(0, scene.flipInvuln - dt);

        if (scene.shipGlow && scene.player) {
          scene.shipGlow.setPosition(scene.player.x - 4, scene.player.y);
        }
        if (scene.shipGlow2 && scene.player) {
          scene.shipGlow2.setPosition(scene.player.x + 10, scene.player.y);
        }
        if (scene.engineTrail && scene.player) {
          scene.engineTrail.setPosition(scene.player.x - 30, scene.player.y);
        }
        if (scene.engineTrail2 && scene.player) {
          scene.engineTrail2.setPosition(scene.player.x - 26, scene.player.y);
        }

        // 鎖定 X，避免世界邊界推擠造成左右漂移怪異
        if (scene.player && scene.player.body) {
          scene.player.x = 168;
          scene.player.setVelocityX(0);
          if (!scene.isFlipping) {
            var lockY = scene.runnerGravity > 0 ? scene.laneDown : scene.laneUp;
            if (Math.abs(scene.player.y - lockY) > 1) {
              scene.player.y = lockY;
              scene.player.body.reset(168, lockY);
            }
            scene.player.setVelocityY(0);
          }
        }

        // 手動 AABB（高速防穿透）
        var pb = scene.player && scene.player.body;
        if (pb && scene.flipInvuln <= 0) {
          var kids = scene.obstacles.getChildren();
          for (var i = 0; i < kids.length; i++) {
            var obs = kids[i];
            if (!obs || !obs.active || !obs.body) continue;
            var ob = obs.body;
            if (pb.right > ob.left && pb.left < ob.right && pb.bottom > ob.top && pb.top < ob.bottom) {
              scene.hitObstacle(obs);
              return;
            }
          }
        }

        var speed = 240 * threat + 40 + (scene.diffKey === "extreme" ? 40 : 0);
        scene.spawnAcc += dt;
        scene.starAcc += dt;
        scene.score += Math.floor(16 * dt * scene.diff.scoreMult * threat);

        var spawnEvery = Math.max(
          scene.diffKey === "casual" ? 0.72 : scene.diffKey === "extreme" ? 0.34 : 0.48,
          (scene.diffKey === "casual" ? 1.15 : scene.diffKey === "extreme" ? 0.72 : 0.92) / Math.max(0.85, threat)
        );
        if (scene.spawnAcc >= spawnEvery) {
          scene.spawnAcc = 0;
          if (!scene.patternQueue.length) scene.enqueuePatterns(threat);
          scene.firePattern(scene.patternQueue.shift(), speed);
        }

        if (scene.starAcc >= Math.max(1.0, 2.6 / Math.max(0.9, threat))) {
          scene.starAcc = 0;
          var starLane = scene.lastSpawnLane ^ 1;
          if (Math.random() < 0.28) starLane = Phaser.Math.Between(0, 1);
          var starY = starLane === 0 ? scene.laneDown : scene.laneUp;
          var star = scene.stars.create(W + 28, starY, "astro-core-v3");
          star.body.allowGravity = false;
          star.setVelocityX(-(speed * 0.88));
          star.setDepth(9);
          star.setScale(0.95);
          star.setSize(28, 28);
          star.setOffset(14, 14);

          var aura = scene.add.circle(star.x, star.y, 22, 0xfbbf24, 0.28)
            .setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
          var ring = scene.add.circle(star.x, star.y, 18, 0xf472b6, 0)
            .setStrokeStyle(2, 0x22d3ee, 0.95)
            .setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
          var trail = scene.add.particles(star.x, star.y, "astro-spark-gold", {
            speed: { min: 10, max: 50 },
            lifespan: 420,
            scale: { start: 0.9, end: 0 },
            alpha: { start: 0.85, end: 0 },
            blendMode: "ADD",
            frequency: 50,
            follow: star
          }).setDepth(8);
          scene.tweens.add({
            targets: star, scale: 1.15, angle: 360, duration: 900, repeat: -1, ease: "Linear"
          });
          scene.tweens.add({
            targets: aura, scale: 1.4, alpha: 0.1, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
          });
          scene.tweens.add({
            targets: ring, scale: 1.5, alpha: 0.3, duration: 480, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
          });
          star.setData("aura", aura);
          star.setData("ring", ring);
          star.setData("trail", trail);
        }

        scene.obstacles.getChildren().forEach(function (o) {
          if (!o.active) return;
          var isPillar = o.texture && (o.texture.key === "astro-pillar-down" || o.texture.key === "astro-pillar-up");
          if (o.body) o.setVelocityX(-(speed * (isPillar ? 0.92 : 1)));
          var aura = o.getData("aura");
          var ring = o.getData("ring");
          var tag = o.getData("tag");
          if (aura) aura.setPosition(o.x, o.y + 2);
          if (ring) ring.setPosition(o.x, o.y);
          if (tag) tag.setPosition(o.x, o.y + (isPillar ? -40 : -28));
          if (o.x < -50) {
            scene.destroyFxChild(o);
            o.destroy();
          }
        });
        scene.stars.getChildren().forEach(function (s) {
          if (!s.active) return;
          var aura = s.getData("aura");
          var ring = s.getData("ring");
          if (aura) aura.setPosition(s.x, s.y);
          if (ring) ring.setPosition(s.x, s.y);
          if (s.x < -40) {
            scene.destroyFxChild(s);
            s.destroy();
          }
        });

        var gravLabel = scene.runnerGravity > 0 ? "↓ 下軌" : "↑ 上軌";
        var flipHint = scene.isFlipping ? "翻轉中" : "點擊翻轉";
        scene.setExtraHud(gravLabel + " · " + flipHint);
      }
    },
    "cyber-rogue-dungeon": {
      slug: "cyber-rogue-dungeon",
      title: "CYBER ROGUE DUNGEON",
      titleZh: "賽博地牢倖存者",
      accent: 0xfbbf24,
      help: "WASD / 方向鍵走位，自動索敵開火。擊敗敵人收集 XP、永久模組箱，以及限時元素膠囊（雷／火／冰／導／甲）：雷鏈、燃燒、寒霜緩速、導引飛彈、護甲層。敵人依難度與時間進化，具血量與防禦。",
      objective: "走位清怪 · 限時元素膠囊 · 模組火力",
      scoreVerb: "KILLS",
      startState: function (scene) {
        // 大地圖 + 鏡頭跟隨：可視範圍仍 960×540，實際可走約 1.75 倍邊長
        var mapW = 1680;
        var mapH = 960;
        scene.mapW = mapW;
        scene.mapH = mapH;
        scene.physics.world.setBounds(0, 0, mapW, mapH);
        scene.cameras.main.setBounds(0, 0, mapW, mapH);

        if (window.RNFCyberRogueArt && RNFCyberRogueArt.buildDungeonScene) {
          RNFCyberRogueArt.buildDungeonScene(scene, mapW, mapH);
        } else {
          scene.add.rectangle(mapW / 2, mapH / 2, mapW - 24, mapH - 24, 0x0a0f1a, 0.35)
            .setStrokeStyle(2, 0xfbbf24, 0.28);
        }

        scene.player = scene.physics.add.sprite(mapW / 2, mapH / 2, "player-fighter");
        scene.player.setDepth(12);
        scene.player.setScale(0.72);
        scene.player.setDrag(0, 0);
        scene.player.setMaxVelocity(400, 400);
        scene.player.setCollideWorldBounds(true);
        scene.player.setSize(30, 16);
        scene.player.setOffset(41, 24);
        scene.player.aimAngle = 0;
        scene.player.moveSpeed = 320;
        scene.player.hp = scene.diffKey === "casual" ? 7 : scene.diffKey === "extreme" ? 4 : 5;
        scene.player.maxHp = scene.player.hp + 2;
        scene.player.weaponLevel = 1;
        scene.player.invuln = 0;
        scene.player.atk = 1;
        scene.player.fireCd = 0.42;
        scene.player.bulletCount = 1;
        scene.player.spread = 0.08;
        scene.player.pierce = 0;
        scene.player.explode = 0;
        scene.player.homing = 0;
        scene.player.frost = 0;
        scene.player.rail = 0;
        scene.player.crit = 0.05;
        scene.player.bulletSpeed = 540;
        scene.player.armorCharges = 0;
        scene.player.buffs = { thunder: 0, fire: 0, ice: 0, missile: 0, armor: 0 };
        scene.mods = [];
        scene.thunderAcc = 0;
        scene.missileAcc = 0;
        scene.burnTickAcc = 0;
        scene.engineAcc = 0;
        scene.maxBuffPickups = 2;

        // 引擎尾焰（收斂，少擋視野）
        scene.engineGlow = scene.add.image(scene.player.x - 28, scene.player.y, "engine-flame")
          .setDepth(11)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(0.7)
          .setAlpha(0.75);
        scene.engineGlow2 = null;
        scene.engineEmitter = null;

        // 機體柔光極淡
        scene.shipRing = scene.add.image(scene.player.x, scene.player.y, "ship-glow")
          .setDepth(10)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(0.14)
          .setScale(0.4);

        scene.cameras.main.startFollow(scene.player, true, 0.1, 0.1);
        scene.cameras.main.setDeadzone(48, 32);

        scene.killCount = 0;
        scene.xp = 0;
        scene.xpNeed = 6;
        scene.spawnAcc = 0;
        scene.fireAcc = 0;
        scene.eliteAcc = 0;
        scene.waveLabel = "偵察波";
        scene.enemies = scene.physics.add.group();
        scene.bullets = scene.physics.add.group();
        scene.enemyShots = scene.physics.add.group();
        scene.xpOrbs = scene.physics.add.group();
        scene.pickups = scene.physics.add.group();

        scene.auraRing = scene.add.circle(scene.player.x, scene.player.y, 42, 0xfbbf24, 0)
          .setStrokeStyle(3, 0xfacc15, 0.75)
          .setDepth(5)
          .setVisible(false);

        scene.refreshShipLook = function () {
          var lv = scene.player.weaponLevel || 1;
          var key = lv >= 5 ? "player-fighter-mk2" : "player-fighter";
          if (scene.player.texture.key !== key) scene.player.setTexture(key);
          var sc = 0.72 + Math.min(0.12, (lv - 1) * 0.015);
          scene.player.setScale(sc);
          // 不整機染色，避免變成色塊糊團；只改光暈色
          scene.player.clearTint();
          if (scene.shipRing) {
            var ringCol = scene.player.buffs.fire > 0 ? 0xef4444 :
              scene.player.buffs.thunder > 0 ? 0xfacc15 :
              scene.player.buffs.ice > 0 ? 0x38bdf8 :
              scene.player.buffs.missile > 0 ? 0xf472b6 :
              (scene.player.buffs.armor > 0 || scene.player.armorCharges > 0) ? 0xe2e8f0 : 0xfbbf24;
            scene.shipRing.setTint(ringCol);
            scene.shipRing.setAlpha(0.14);
          }
        };
        scene.refreshShipLook();

        scene.spawnMuzzleFlash = function (ang, kind) {
          if (!isCombatFxOn()) return;
          var ox = Math.cos(ang) * 28;
          var oy = Math.sin(ang) * 28;
          var col = kind === "thunder" ? 0xfacc15 : kind === "fire" ? 0xef4444 : kind === "frost" ? 0x38bdf8 : kind === "missile" ? 0xf472b6 : kind === "rail" ? 0xe879f9 : 0xfbbf24;
          var flash = scene.add.rectangle(scene.player.x + ox, scene.player.y + oy, 12, 6, col, 0.85)
            .setDepth(30)
            .setRotation(ang)
            .setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({
            targets: flash,
            alpha: 0,
            scaleX: 1.4,
            duration: 80,
            ease: "Cubic.easeOut",
            onComplete: function () { flash.destroy(); }
          });
        };

        scene.spawnBulletTrail = function (bullet, kind) {
          var col = kind === "fire" ? 0xef4444 : kind === "frost" ? 0x38bdf8 : kind === "thunder" ? 0xfacc15 : kind === "missile" ? 0xf472b6 : kind === "rail" ? 0xe879f9 : 0xfbbf24;
          bullet.setData("trailColor", col);
          // 不依賴粒子：在 update 用圓點拖尾
          bullet.setData("trailPts", []);
        };

        scene.spawnImpactFx = function (x, y, kind) {
          if (!isCombatFxOn()) return;
          var col = kind === "fire" ? 0xef4444 : kind === "frost" ? 0x38bdf8 : kind === "thunder" ? 0xfacc15 : kind === "missile" || kind === "blast" ? 0xf472b6 : 0xfbbf24;
          var spark = kind === "frost" ? "spark-cyan" : kind === "missile" ? "spark-pink" : "spark-gold";
          try { neonBurst(scene, x, y, spark, 14); } catch (_e) {}
          var ring = scene.add.circle(x, y, 8, col, 0.55).setDepth(25).setBlendMode(Phaser.BlendModes.ADD);
          scene.tweens.add({
            targets: ring,
            scale: 2.4,
            alpha: 0,
            duration: 160,
            ease: "Cubic.easeOut",
            onComplete: function () { ring.destroy(); }
          });
        };

        scene.modeHud = scene.add.text(W / 2, 40, "", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#fde68a"
        }).setOrigin(0.5).setDepth(22).setScrollFactor(0);

        scene.buffHud = scene.add.text(W / 2, H - 28, "", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "14px",
          fontStyle: "bold",
          color: "#e2e8f0"
        }).setOrigin(0.5).setDepth(22).setScrollFactor(0);

        // 版本戳：確認不是舊快取
        scene.add.text(W - 12, H - 10, "設定 ART6", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "11px",
          fontStyle: "bold",
          color: "#94a3b8"
        }).setOrigin(1, 1).setDepth(30).setAlpha(0.75).setScrollFactor(0);

        var TEMP_BUFFS = {
          thunder: { duration: 6, label: "雷", tex: "drop-thunder", color: "#facc15", tint: 0xfacc15 },
          fire: { duration: 7, label: "火", tex: "drop-fire", color: "#ef4444", tint: 0xef4444 },
          ice: { duration: 7, label: "冰", tex: "drop-ice", color: "#38bdf8", tint: 0x38bdf8 },
          missile: { duration: 8, label: "導", tex: "drop-missile", color: "#f472b6", tint: 0xf472b6 },
          armor: { duration: 10, label: "甲", tex: "drop-armor", color: "#94a3b8", tint: 0x94a3b8 }
        };
        scene.TEMP_BUFFS = TEMP_BUFFS;

        var MOD_DEFS = {
          ATK: { label: "攻擊+1", color: "#fbbf24", apply: function () { scene.player.atk += 1; } },
          RAPID: { label: "連射", color: "#67e8f9", apply: function () { scene.player.fireCd = Math.max(0.22, scene.player.fireCd - 0.04); } },
          SPREAD: { label: "散射", color: "#c4b5fd", apply: function () { scene.player.bulletCount = Math.min(3, scene.player.bulletCount + 1); scene.player.spread += 0.03; } },
          PIERCE: { label: "穿透", color: "#38bdf8", apply: function () { scene.player.pierce = Math.min(2, scene.player.pierce + 1); } },
          BLAST: { label: "爆破", color: "#fb923c", apply: function () { scene.player.explode = Math.min(2, scene.player.explode + 1); } },
          HOMING: { label: "追蹤", color: "#f472b6", apply: function () { scene.player.homing = Math.min(2, scene.player.homing + 1); } },
          FROST: { label: "寒霜", color: "#7dd3fc", apply: function () { scene.player.frost = Math.min(2, scene.player.frost + 1); } },
          RAIL: { label: "軌道炮", color: "#e879f9", apply: function () { scene.player.rail = Math.min(1, scene.player.rail + 1); scene.player.bulletSpeed += 40; } },
          CRIT: { label: "暴擊", color: "#fde68a", apply: function () { scene.player.crit = Math.min(0.28, scene.player.crit + 0.05); } },
          SHIELD: { label: "護盾+1", color: "#4ade80", apply: function () { scene.player.hp = Math.min(scene.player.maxHp + 1, scene.player.hp + 1); scene.player.maxHp += 1; } }
        };
        scene.MOD_DEFS = MOD_DEFS;

        scene.activateBuff = function (key, silent) {
          var def = TEMP_BUFFS[key];
          if (!def) return;
          scene.player.buffs[key] = Math.min(20, (scene.player.buffs[key] || 0) + def.duration);
          if (key === "armor") {
            scene.player.armorCharges = Math.min(3, (scene.player.armorCharges || 0) + 1);
          }
          if (key === "thunder") scene.thunderAcc = 0;
          if (key === "missile") scene.missileAcc = 0;
          if (scene.refreshShipLook) scene.refreshShipLook();
          if (!silent) {
            SFX.confirm();
            scene.cameras.main.shake(70, 0.006);
            neonBurst(scene, scene.player.x, scene.player.y, "spark-gold", 12);
            uiFloat(scene, scene.player.x, scene.player.y - 36, def.label + " " + Math.ceil(scene.player.buffs[key]) + "s", def.color);
          }
        };

        scene.spawnTimedDrop = function (x, y, preferKey) {
          var activeBuffDrops = scene.pickups.getChildren().filter(function (p) {
            return p.active && p.getData("kind") === "buff";
          }).length;
          if (activeBuffDrops >= (scene.maxBuffPickups || 2)) return null;
          var keys = Object.keys(TEMP_BUFFS);
          var key = preferKey && TEMP_BUFFS[preferKey] ? preferKey : keys[Phaser.Math.Between(0, keys.length - 1)];
          var def = TEMP_BUFFS[key];
          var glow = scene.add.rectangle(x, y, 28, 28, def.tint, 0.15)
            .setDepth(15)
            .setStrokeStyle(1, def.tint, 0.7);
          var drop = scene.pickups.create(x, y, def.tex);
          drop.body.allowGravity = false;
          drop.setData("kind", "buff");
          drop.setData("buff", key);
          drop.setTint(def.tint);
          drop.setScale(0.85);
          drop.setDepth(16);
          drop.body.setSize(22, 22);
          var tag = scene.add.text(x, y - 18, def.label, {
            fontFamily: "Microsoft JhengHei",
            fontSize: "12px",
            fontStyle: "bold",
            color: def.color,
            stroke: "#000000",
            strokeThickness: 3
          }).setOrigin(0.5).setDepth(17);
          drop.setData("tag", tag);
          drop.setData("glow", glow);
          scene.tweens.add({
            targets: [drop, glow],
            scale: 0.95,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
          });
          return drop;
        };

        scene.grantMod = function (key, silent) {
          var def = MOD_DEFS[key];
          if (!def) return;
          def.apply();
          scene.mods.push(key);
          if (scene.mods.length > 8) scene.mods.shift();
          if (!silent) {
            SFX.confirm();
            scene.cameras.main.shake(110, 0.012);
            neonBurst(scene, scene.player.x, scene.player.y, "spark-gold", 22);
            uiFloat(scene, scene.player.x, scene.player.y - 36, def.label, def.color);
          }
        };

        scene.levelUp = function () {
          scene.player.weaponLevel += 1;
          scene.xpNeed = 6 + scene.player.weaponLevel * 4;
          scene.player.hp = Math.min(scene.player.maxHp, scene.player.hp + 1);
          if (scene.player.weaponLevel % 3 === 0) scene.player.atk += 1;
          var pool = ["ATK", "RAPID", "SPREAD", "PIERCE", "BLAST", "HOMING", "FROST", "RAIL", "CRIT", "SHIELD"];
          if (scene.elapsedTime > 45) pool = pool.concat(["BLAST", "HOMING", "PIERCE"]);
          if (scene.diffKey === "extreme") pool = pool.concat(["ATK", "RAPID"]);
          var pick = pool[Phaser.Math.Between(0, pool.length - 1)];
          scene.grantMod(pick, false);
          if (Math.random() < 0.12) {
            var buffKeys = Object.keys(TEMP_BUFFS);
            scene.activateBuff(buffKeys[Phaser.Math.Between(0, buffKeys.length - 1)], false);
          }
          uiFloat(scene, scene.player.x, scene.player.y - 58, "LV " + scene.player.weaponLevel, "#4ade80");
          if (scene.refreshShipLook) scene.refreshShipLook();
          neonBurst(scene, scene.player.x, scene.player.y, "spark-green", 16);
        };

        scene.enemyCatalog = [
          { id: "scout", tex: "foe-scout", tint: 0x38bdf8, hp: 2, def: 0, hpGrow: 0.35, speed: 118, score: 70, unlock: 0, weight: 30, behavior: "chase", scale: 1 },
          { id: "swarm", tex: "foe-swarm", tint: 0x4ade80, hp: 1, def: 0, hpGrow: 0.25, speed: 150, score: 35, unlock: 4, weight: 24, behavior: "swarm", scale: 1, pack: 4 },
          { id: "wasp", tex: "foe-wasp", tint: 0xfbbf24, hp: 2, def: 0, hpGrow: 0.3, speed: 165, score: 55, unlock: 8, weight: 18, behavior: "swarm", scale: 1, pack: 3 },
          { id: "grunt", tex: "foe-grunt", tint: 0xf97316, hp: 6, def: 1, hpGrow: 0.55, speed: 78, score: 110, unlock: 10, weight: 22, behavior: "chase", scale: 1.05 },
          { id: "crawler", tex: "foe-crawler", tint: 0xa3e635, hp: 7, def: 1, hpGrow: 0.6, speed: 55, score: 130, unlock: 18, weight: 14, behavior: "tank", scale: 1.08 },
          { id: "shield", tex: "foe-shield", tint: 0x94a3b8, hp: 6, def: 3, hpGrow: 0.5, speed: 62, score: 150, unlock: 22, weight: 14, behavior: "tank", scale: 1.1 },
          { id: "sniper", tex: "foe-sniper", tint: 0xe879f9, hp: 4, def: 1, hpGrow: 0.45, speed: 68, score: 160, unlock: 26, weight: 12, behavior: "kite", scale: 1, shootCd: 1.6 },
          { id: "spitter", tex: "foe-spitter", tint: 0xa855f7, hp: 4, def: 1, hpGrow: 0.5, speed: 70, score: 140, unlock: 28, weight: 12, behavior: "kite", scale: 1, shootCd: 1.4 },
          { id: "glitch", tex: "foe-glitch", tint: 0x22d3ee, hp: 5, def: 1, hpGrow: 0.55, speed: 100, score: 180, unlock: 32, weight: 10, behavior: "glitch", scale: 1 },
          { id: "bomber", tex: "foe-bomber", tint: 0xfb7185, hp: 3, def: 0, hpGrow: 0.4, speed: 96, score: 160, unlock: 35, weight: 11, behavior: "bomber", scale: 1.05 },
          { id: "jugger", tex: "foe-jugger", tint: 0xf59e0b, hp: 22, def: 3, hpGrow: 0.9, speed: 42, score: 380, unlock: 45, weight: 5, behavior: "tank", scale: 1.2 },
          { id: "elite", tex: "foe-elite", tint: 0xef4444, hp: 18, def: 2, hpGrow: 0.85, speed: 54, score: 420, unlock: 50, weight: 6, behavior: "elite", scale: 1.15, shootCd: 1.8 }
        ];

        scene.pickEnemyType = function (threat) {
          var t = scene.elapsedTime || 0;
          var diffBoost = scene.diffKey === "casual" ? 0.75 : scene.diffKey === "extreme" ? 1.35 : 1;
          var unlockPad = scene.diffKey === "casual" ? 8 : scene.diffKey === "extreme" ? -6 : 0;
          var pool = [];
          scene.enemyCatalog.forEach(function (e) {
            if (t + unlockPad < e.unlock && e.id !== "scout") return;
            var w = e.weight;
            if (e.id === "elite" || e.id === "shield" || e.id === "jugger") w *= diffBoost;
            if (threat > 1.6 && (e.id === "grunt" || e.id === "bomber" || e.id === "wasp")) w *= 1.25;
            if (threat > 2.2 && (e.id === "elite" || e.id === "jugger")) w *= 1.5;
            pool.push({ e: e, w: w });
          });
          var sum = pool.reduce(function (a, b) { return a + b.w; }, 0);
          var r = Math.random() * sum;
          for (var i = 0; i < pool.length; i++) {
            r -= pool[i].w;
            if (r <= 0) return pool[i].e;
          }
          return scene.enemyCatalog[0];
        };

        scene.spawnEnemyOf = function (type, ex, ey) {
          var lv = scene.player.weaponLevel || 1;
          var diffMul = scene.diffKey === "casual" ? 0.85 : scene.diffKey === "extreme" ? 1.22 : 1;
          var timeBonus = Math.floor((scene.elapsedTime || 0) / 32);
          var lvBonus = Math.floor(Math.pow(Math.max(0, lv - 1), 0.85) * (type.hpGrow || 0.5));
          var hp = Math.round((type.hp + timeBonus + lvBonus) * diffMul);
          if (type.id === "swarm" || type.id === "scout" || type.id === "wasp") {
            hp = Math.min(hp, type.hp + 3 + Math.floor(lv / 4) + Math.floor(timeBonus / 2));
          }
          if (type.id === "elite" || type.id === "jugger") {
            hp = Math.round(hp * 1.08);
          }
          hp = Math.max(1, hp);
          var def = Math.max(0, Math.round(type.def * (scene.diffKey === "casual" ? 0.6 : scene.diffKey === "extreme" ? 1.2 : 1) + ((scene.elapsedTime || 0) > 60 ? 1 : 0)));
          def = Math.min(def, scene.player.atk);
          var enemy = scene.enemies.create(ex, ey, type.tex);
          enemy.clearTint();
          enemy.setScale(type.scale || 1);
          enemy.setData("type", type.id);
          enemy.setData("hp", hp);
          enemy.setData("maxHp", hp);
          enemy.setData("def", def);
          enemy.setData("speed", type.speed * Phaser.Math.FloatBetween(0.92, 1.08));
          enemy.setData("score", type.score);
          enemy.setData("behavior", type.behavior);
          enemy.setData("slow", 0);
          enemy.setData("burn", 0);
          enemy.setData("shootCd", type.shootCd || 0);
          enemy.setData("shootAcc", Phaser.Math.FloatBetween(0.2, 0.8));
          enemy.setDepth(9);
          return enemy;
        };

        scene.spawnEnemyEdge = function (threat) {
          var mw = scene.mapW || W;
          var mh = scene.mapH || H;
          var type = scene.pickEnemyType(threat);
          var edge = Phaser.Math.Between(0, 3);
          var ex = edge === 0 ? -24 : edge === 1 ? mw + 24 : Phaser.Math.Between(30, mw - 30);
          var ey = edge === 2 ? -24 : edge === 3 ? mh + 24 : Phaser.Math.Between(30, mh - 30);
          var pack = type.pack || 1;
          if ((type.id === "swarm" || type.id === "wasp") && scene.diffKey === "extreme") pack += 1;
          for (var i = 0; i < pack; i++) {
            scene.spawnEnemyOf(type, ex + Phaser.Math.Between(-18, 18), ey + Phaser.Math.Between(-18, 18));
          }
        };

        scene.chainLightning = function () {
          var living = scene.enemies.getChildren().filter(function (e) { return e.active; });
          if (!living.length) return;
          living.sort(function (a, b) {
            return Phaser.Math.Distance.Between(a.x, a.y, scene.player.x, scene.player.y) -
              Phaser.Math.Distance.Between(b.x, b.y, scene.player.x, scene.player.y);
          });
          var hits = living.slice(0, 3);
          var prevX = scene.player.x;
          var prevY = scene.player.y;
          var dmg = Math.max(1, scene.player.atk + 1);
          hits.forEach(function (e) {
            var line = scene.add.line(0, 0, prevX, prevY, e.x, e.y, 0xfacc15, 0.85).setOrigin(0, 0).setDepth(25);
            if (line.setLineWidth) line.setLineWidth(2);
            scene.tweens.add({
              targets: line,
              alpha: 0,
              duration: 180,
              onComplete: function () { line.destroy(); }
            });
            neonBurst(scene, e.x, e.y, "spark-gold", 12);
            scene.hurtEnemy(e, dmg, null);
            prevX = e.x;
            prevY = e.y;
          });
          SFX.hit();
          scene.cameras.main.shake(70, 0.008);
        };

        scene.fireMissileSalvo = function () {
          var living = scene.enemies.getChildren().filter(function (e) { return e.active; });
          if (!living.length) return;
          living.sort(function (a, b) {
            return Phaser.Math.Distance.Between(a.x, a.y, scene.player.x, scene.player.y) -
              Phaser.Math.Distance.Between(b.x, b.y, scene.player.x, scene.player.y);
          });
          for (var i = 0; i < 1; i++) {
            var ang = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, living[0].x, living[0].y);
            var m = scene.bullets.create(scene.player.x, scene.player.y, "bullet-missile");
            m.body.allowGravity = false;
            m.setTint(0xf472b6);
            m.setRotation(ang);
            m.setVelocity(Math.cos(ang) * 360, Math.sin(ang) * 360);
            m.setData("dmg", scene.player.atk);
            m.setData("kind", "missile");
            m.setData("pierceLeft", 0);
            m.setData("homing", Math.max(1, scene.player.homing + 1));
            m.setData("life", 1.4);
            scene.time.delayedCall(1400, function (b) { if (b && b.active) b.destroy(); }, [m]);
          }
          SFX.shoot();
          neonBurst(scene, scene.player.x, scene.player.y, "spark-pink", 8);
        };

        scene.hurtEnemy = function (enemy, rawDmg, bullet) {
          if (!enemy.active) return false;
          var def = enemy.getData("def") || 0;
          var dmg = Math.max(1, rawDmg - def);
          if (Math.random() < scene.player.crit) {
            dmg = Math.floor(dmg * 2);
            uiFloat(scene, enemy.x, enemy.y - 18, "CRIT", "#fde68a");
          }
          enemy.setData("hp", enemy.getData("hp") - dmg);
          enemy.setTint(0xffffff);
          scene.time.delayedCall(50, function () {
            if (enemy.active) enemy.clearTint();
          });
          var bKind = bullet ? bullet.getData("kind") : null;
          if (scene.player.buffs.fire > 0 || bKind === "fire") {
            enemy.setData("burn", Math.max(enemy.getData("burn") || 0, 2.4));
          }
          if (scene.player.buffs.ice > 0 || bKind === "frost") {
            enemy.setData("slow", Math.max(enemy.getData("slow") || 0, 0.62));
            enemy.setData("slowTimer", 1.8);
          } else if (scene.player.frost > 0) {
            enemy.setData("slow", Math.max(enemy.getData("slow") || 0, 0.35 + scene.player.frost * 0.12));
            enemy.setData("slowTimer", 1.2);
          }
          if (scene.player.explode > 0 && bullet && bullet.getData("kind") === "blast") {
            scene.aoeBlast(enemy.x, enemy.y, 48 + scene.player.explode * 18, Math.max(1, Math.floor(scene.player.atk * 0.7)));
          }
          if (enemy.getData("hp") <= 0) {
            scene.killEnemy(enemy);
            return true;
          }
          return false;
        };

        scene.aoeBlast = function (x, y, radius, dmg) {
          neonBurst(scene, x, y, "spark-gold", 24);
          neonBurst(scene, x, y, "spark-pink", 16);
          scene.cameras.main.shake(90, 0.01);
          SFX.explode();
          scene.enemies.getChildren().forEach(function (e) {
            if (!e.active) return;
            if (Phaser.Math.Distance.Between(e.x, e.y, x, y) <= radius) {
              var def = e.getData("def") || 0;
              e.setData("hp", e.getData("hp") - Math.max(1, dmg - Math.floor(def * 0.5)));
              if (e.getData("hp") <= 0) scene.killEnemy(e);
            }
          });
        };

        scene.killEnemy = function (enemy) {
          if (!enemy || !enemy.active) return;
          var type = enemy.getData("type");
          var bx = enemy.x;
          var by = enemy.y;
          var scoreBase = enemy.getData("score") || 80;
          if (enemy.hpBar) {
            enemy.hpBar.destroy();
            enemy.hpBar = null;
          }
          enemy.destroy();
          scene.killCount += 1;
          scene.score += Math.floor(scoreBase * scene.diff.scoreMult * (0.85 + scene.dangerMultiplier * 0.2));
          neonBurst(scene, bx, by, (type === "elite" || type === "jugger") ? "spark-gold" : "spark-violet", (type === "elite" || type === "jugger") ? 28 : 18);
          SFX.hit();
          if (type === "bomber") {
            scene.aoeBlast(bx, by, 70, 2);
            if (Phaser.Math.Distance.Between(bx, by, scene.player.x, scene.player.y) < 78 && scene.player.invuln <= 0) {
              scene.damagePlayer(1);
            }
          }
          var xp = scene.xpOrbs.create(bx, by, "xp");
          xp.body.allowGravity = false;
          xp.setTint(0x34d399);
          xp.setData("val", (type === "elite" || type === "jugger") ? 3 : type === "swarm" ? 1 : 1);

          var buffRate = scene.diffKey === "casual" ? 0.07 : scene.diffKey === "extreme" ? 0.05 : 0.06;
          if (type === "elite" || type === "jugger") buffRate = 0.22;
          if (Math.random() < buffRate) {
            scene.spawnTimedDrop(bx + Phaser.Math.Between(-12, 12), by + Phaser.Math.Between(-10, 10));
          }

          var modRate = scene.diffKey === "casual" ? 0.07 : scene.diffKey === "extreme" ? 0.04 : 0.05;
          if (type === "elite" || type === "jugger") modRate = Math.max(modRate, 0.16);
          if (Math.random() < modRate) {
            var crate = scene.pickups.create(bx + 10, by - 8, "mod-crate");
            crate.body.allowGravity = false;
            crate.setTint(0xfbbf24);
            crate.setData("kind", "mod");
            scene.tweens.add({ targets: crate, scale: 1.2, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          }
          if (Math.random() < (type === "elite" || type === "jugger" ? 0.04 : 0.012)) {
            var pack = scene.pickups.create(bx - 10, by + 6, "hp-pack");
            pack.body.allowGravity = false;
            pack.setData("kind", "hp");
          }
        };

        scene.damagePlayer = function (amount) {
          if (!scene.alive || scene.player.invuln > 0) return;
          if (scene.player.armorCharges > 0) {
            scene.player.armorCharges -= 1;
            scene.player.invuln = 0.55;
            SFX.hit();
            scene.cameras.main.shake(90, 0.01);
            neonBurst(scene, scene.player.x, scene.player.y, "spark-cyan", 18);
            uiFloat(scene, scene.player.x, scene.player.y - 28, "甲盾", "#94a3b8");
            return;
          }
          scene.player.hp -= amount;
          scene.player.invuln = 0.85;
          SFX.hit();
          scene.cameras.main.shake(170, 0.02);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-pink", 26);
          if (scene.player.hp <= 0) scene.gameOver();
        };

        scene.fireWeapon = function () {
          var living = scene.enemies.getChildren().filter(function (e) { return e.active; });
          if (!living.length) return;
          living.sort(function (a, b) {
            return Phaser.Math.Distance.Between(a.x, a.y, scene.player.x, scene.player.y) -
              Phaser.Math.Distance.Between(b.x, b.y, scene.player.x, scene.player.y);
          });
          var target = living[0];
          var baseAngle = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, target.x, target.y);
          scene.player.aimAngle = baseAngle;
          scene.player.setRotation(baseAngle);
          var count = Math.max(1, scene.player.bulletCount);
          if (scene.player.rail > 0) count = Math.max(1, Math.min(3, scene.player.bulletCount));
          var kind = "normal";
          var tex = "bullet";
          var tint = 0xfbbf24;
          var extraHoming = 0;
          var bulletScale = 0.9;
          if (scene.player.buffs.thunder > 0) {
            kind = "thunder"; tex = "bullet-thunder"; tint = 0xfacc15; bulletScale = 1.05;
          } else if (scene.player.buffs.fire > 0) {
            kind = "fire"; tex = "bullet-fire"; tint = 0xef4444; bulletScale = 1.05;
          } else if (scene.player.buffs.ice > 0) {
            kind = "frost"; tex = "bullet-frost"; tint = 0x38bdf8; bulletScale = 1.0;
          } else if (scene.player.buffs.missile > 0) {
            kind = "missile"; tex = "bullet-missile"; tint = 0xf472b6; extraHoming = 2; bulletScale = 1.0;
          } else if (scene.player.rail > 0 && Math.random() < 0.35 + scene.player.rail * 0.1) {
            kind = "rail"; tex = "bullet-rail"; tint = 0xe879f9; bulletScale = 1.1;
          } else if (scene.player.explode > 0 && Math.random() < 0.22 + scene.player.explode * 0.08) {
            kind = "blast"; tex = "bullet-blast"; tint = 0xfb923c; bulletScale = 1.05;
          } else if (scene.player.frost > 0 && Math.random() < 0.2 + scene.player.frost * 0.08) {
            kind = "frost"; tex = "bullet-frost"; tint = 0x38bdf8; bulletScale = 1.0;
          } else if (scene.player.pierce > 0) {
            kind = "pierce"; tex = "bullet-pierce"; tint = 0x67e8f9; bulletScale = 0.95;
          }
          var dmg = scene.player.atk + (kind === "rail" ? 1 + scene.player.rail : 0);
          var speed = scene.player.bulletSpeed * (kind === "rail" || kind === "thunder" ? 1.25 : kind === "blast" ? 0.85 : kind === "missile" ? 0.9 : 1);
          scene.spawnMuzzleFlash(baseAngle, kind);
          for (var i = 0; i < count; i++) {
            var spread = (i - (count - 1) / 2) * scene.player.spread;
            var ang = baseAngle + spread;
            var bullet = scene.bullets.create(scene.player.x + Math.cos(ang) * 22, scene.player.y + Math.sin(ang) * 22, tex);
            bullet.body.allowGravity = false;
            bullet.setTint(tint);
            bullet.setRotation(ang);
            bullet.setScale(bulletScale);
            bullet.setBlendMode(Phaser.BlendModes.ADD);
            bullet.setDepth(15);
            bullet.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
            bullet.setData("dmg", dmg);
            bullet.setData("kind", kind);
            bullet.setData("pierceLeft", kind === "pierce" || kind === "rail" || kind === "thunder" ? scene.player.pierce + (kind === "rail" || kind === "thunder" ? 2 : 0) : 0);
            bullet.setData("homing", scene.player.homing + extraHoming);
            bullet.setData("life", kind === "rail" ? 1.45 : kind === "missile" ? 1.4 : 1.1);
            scene.spawnBulletTrail(bullet, kind);
            scene.time.delayedCall((kind === "rail" ? 1450 : kind === "missile" ? 1400 : 1100), function (b) {
              if (!b) return;
              var tr = b.getData && b.getData("trail");
              if (tr && tr.destroy) try { tr.destroy(); } catch (_e) {}
              if (b.active) b.destroy();
            }, [bullet]);
          }
          if (kind === "rail" || kind === "thunder") scene.cameras.main.shake(50, 0.006);
          SFX.shoot();
        };

        scene.physics.add.overlap(scene.player, scene.enemies, function (_p, enemy) {
          if (!enemy.active || !scene.alive) return;
          var typ = enemy.getData("type");
          if (typ === "bomber") {
            scene.killEnemy(enemy);
            return;
          }
          if (typ === "swarm" || typ === "scout" || typ === "wasp") {
            scene.killEnemy(enemy);
            if (scene.player.invuln <= 0) scene.damagePlayer(1);
            return;
          }
          if (scene.player.invuln > 0) return;
          scene.damagePlayer(1);
          var ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
          scene.player.setVelocity(Math.cos(ang) * 320, Math.sin(ang) * 320);
          enemy.x -= Math.cos(ang) * 36;
          enemy.y -= Math.sin(ang) * 36;
        });

        scene.physics.add.overlap(scene.player, scene.enemyShots, function (_p, shot) {
          if (!shot.active) return;
          shot.destroy();
          scene.damagePlayer(1);
        });

        scene.physics.add.overlap(scene.bullets, scene.enemies, function (bullet, enemy) {
          if (!bullet.active || !enemy.active) return;
          var dmg = bullet.getData("dmg") || scene.player.atk;
          var pierceLeft = bullet.getData("pierceLeft") || 0;
          var kind = bullet.getData("kind") || "normal";
          var hx = enemy.x;
          var hy = enemy.y;
          scene.hurtEnemy(enemy, dmg, bullet);
          if (scene.spawnImpactFx) scene.spawnImpactFx(hx, hy, kind);
          if (pierceLeft > 0) {
            bullet.setData("pierceLeft", pierceLeft - 1);
          } else {
            var tr = bullet.getData("trail");
            if (tr && tr.destroy) try { tr.destroy(); } catch (_e) {}
            bullet.destroy();
          }
        });

        scene.physics.add.overlap(scene.player, scene.xpOrbs, function (_p, orb) {
          if (!orb.active) return;
          var val = orb.getData("val") || 1;
          orb.destroy();
          scene.xp += val;
          SFX.score();
          while (scene.xp >= scene.xpNeed) {
            scene.xp -= scene.xpNeed;
            scene.levelUp();
          }
        });

        scene.physics.add.overlap(scene.player, scene.pickups, function (_p, item) {
          if (!item.active) return;
          var kind = item.getData("kind");
          var buffKey = item.getData("buff");
          var tag = item.getData("tag");
          if (tag && tag.destroy) try { tag.destroy(); } catch (_e) {}
          var glow = item.getData("glow");
          if (glow && glow.destroy) try { glow.destroy(); } catch (_e2) {}
          item.destroy();
          if (kind === "hp") {
            scene.player.hp = Math.min(scene.player.maxHp, scene.player.hp + 1);
            SFX.score();
            neonBurst(scene, scene.player.x, scene.player.y, "spark-pink", 10);
            uiFloat(scene, scene.player.x, scene.player.y - 24, "+1 HP", "#fb7185");
          } else if (kind === "buff") {
            scene.activateBuff(buffKey || "thunder", false);
          } else {
            var keys = Object.keys(scene.MOD_DEFS).filter(function (k) { return k !== "SHIELD"; });
            scene.grantMod(keys[Phaser.Math.Between(0, keys.length - 1)], false);
          }
        });

        scene.time.delayedCall(400, function () {
          if (!scene.alive) return;
          uiFloat(scene, scene.player.x, scene.player.y - 70, "清怪求生", "#fbbf24");
        });
      },
      updateState: function (scene, dt, threat) {
        if (!scene.alive) return;
        var mapW = scene.mapW || W;
        var mapH = scene.mapH || H;
        var left = scene.cursors.left.isDown || scene.keys.A.isDown;
        var right = scene.cursors.right.isDown || scene.keys.D.isDown;
        var up = scene.cursors.up.isDown || scene.keys.W.isDown;
        var down = scene.cursors.down.isDown || scene.keys.S.isDown;
        var vec = new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
        if (vec.lengthSq() > 0) {
          vec.normalize();
          var spd = scene.player.moveSpeed || 320;
          scene.player.setAcceleration(0, 0);
          scene.player.setVelocity(vec.x * spd, vec.y * spd);
          if (!scene.enemies.countActive(true)) {
            scene.player.aimAngle = Math.atan2(vec.y, vec.x);
            scene.player.setRotation(scene.player.aimAngle);
          }
        } else {
          scene.player.setAcceleration(0, 0);
          scene.player.setVelocity(0, 0);
        }
        scene.player.invuln = Math.max(0, scene.player.invuln - dt);
        scene.player.setAlpha(scene.player.invuln > 0 ? 0.55 : 1);

        var pang = scene.player.rotation || 0;
        if (scene.shipRing) {
          scene.shipRing.setPosition(scene.player.x, scene.player.y);
          scene.shipRing.setRotation(pang);
          scene.shipRing.setScale(0.4);
        }
        if (scene.engineGlow) {
          scene.engineGlow.setPosition(scene.player.x + Math.cos(pang) * -22, scene.player.y + Math.sin(pang) * -22);
          scene.engineGlow.setRotation(pang);
          scene.engineGlow.setScale(0.45 + Math.random() * 0.15);
        }
        if (scene.engineGlow2) {
          scene.engineGlow2.setPosition(scene.player.x + Math.cos(pang) * -30, scene.player.y + Math.sin(pang) * -30);
          scene.engineGlow2.setRotation(pang);
        }
        if (scene.engineEmitter && scene.engineEmitter.followOffset) {
          scene.engineEmitter.followOffset.x = Math.cos(pang) * -28;
          scene.engineEmitter.followOffset.y = Math.sin(pang) * -28;
        }

        var buffKeys = ["thunder", "fire", "ice", "missile", "armor"];
        var activeBuff = null;
        var bi;
        for (bi = 0; bi < buffKeys.length; bi++) {
          var bk = buffKeys[bi];
          if (scene.player.buffs[bk] > 0) {
            scene.player.buffs[bk] = Math.max(0, scene.player.buffs[bk] - dt);
            if (scene.player.buffs[bk] > 0 && !activeBuff) activeBuff = bk;
          }
        }

        if (scene.auraRing) {
          scene.auraRing.setPosition(scene.player.x, scene.player.y);
          if (activeBuff && scene.TEMP_BUFFS[activeBuff]) {
            scene.auraRing.setVisible(true);
            scene.auraRing.setStrokeStyle(2, scene.TEMP_BUFFS[activeBuff].tint, 0.7);
            scene.auraRing.setScale(1 + Math.sin((scene.elapsedTime || 0) * 6) * 0.06);
          } else {
            scene.auraRing.setVisible(false);
          }
        }

        var buffParts = [];
        var labelMap = { thunder: "雷", fire: "火", ice: "冰", missile: "導", armor: "甲" };
        for (bi = 0; bi < buffKeys.length; bi++) {
          var bkk = buffKeys[bi];
          if (scene.player.buffs[bkk] > 0) {
            buffParts.push(labelMap[bkk] + scene.player.buffs[bkk].toFixed(1));
          }
        }
        if (scene.player.armorCharges > 0) {
          buffParts.push("盾×" + scene.player.armorCharges);
        }
        if (scene.buffHud) {
          scene.buffHud.setText(buffParts.length ? buffParts.join("  ") : "");
        }

        if (scene.player.buffs.thunder > 0) {
          scene.thunderAcc += dt;
          if (scene.thunderAcc >= 1.15) {
            scene.thunderAcc = 0;
            scene.chainLightning();
          }
        }
        if (scene.player.buffs.missile > 0) {
          scene.missileAcc += dt;
          if (scene.missileAcc >= 2.0) {
            scene.missileAcc = 0;
            scene.fireMissileSalvo();
          }
        }

        scene.burnTickAcc += dt;
        if (scene.burnTickAcc >= 0.4) {
          scene.burnTickAcc = 0;
          scene.enemies.getChildren().forEach(function (e) {
            if (!e.active) return;
            var burn = e.getData("burn") || 0;
            if (burn > 0) {
              e.setData("burn", burn - 0.4);
              var burnDmg = Math.max(1, Math.floor(scene.player.atk * 0.45));
              e.setData("hp", e.getData("hp") - burnDmg);
              neonBurst(scene, e.x, e.y, "spark-pink", 6);
              if (e.getData("hp") <= 0) scene.killEnemy(e);
            }
          });
        }

        var t = scene.elapsedTime || 0;
        if (t < 12) scene.waveLabel = "偵察波";
        else if (t < 28) scene.waveLabel = "機甲潮";
        else if (t < 50) scene.waveLabel = "護盾突襲";
        else if (t < 75) scene.waveLabel = "轟炸帶";
        else scene.waveLabel = "精英狂潮";

        scene.spawnAcc += dt;
        scene.fireAcc += dt;
        scene.eliteAcc += dt;
        var livingCount = scene.enemies.countActive(true);
        var softCap = scene.diffKey === "casual" ? 36 : scene.diffKey === "extreme" ? 60 : 48;
        var spawnEvery = Math.max(0.12, (scene.diffKey === "casual" ? 0.62 : scene.diffKey === "extreme" ? 0.38 : 0.48) / threat);
        if (livingCount < softCap && scene.spawnAcc >= spawnEvery) {
          scene.spawnAcc = 0;
          scene.spawnEnemyEdge(threat);
          if (Math.random() < (scene.diffKey === "casual" ? 0.45 : 0.65)) scene.spawnEnemyEdge(threat);
          if (threat > 1.5 && Math.random() < 0.4) scene.spawnEnemyEdge(threat);
        }
        if (t > 28 && scene.eliteAcc >= Math.max(6, 14 / threat)) {
          scene.eliteAcc = 0;
          var elite = null;
          for (var ei = 0; ei < scene.enemyCatalog.length; ei++) {
            if (scene.enemyCatalog[ei].id === "elite") { elite = scene.enemyCatalog[ei]; break; }
          }
          if (elite) {
            var edge = Phaser.Math.Between(0, 3);
            var ex = edge === 0 ? -30 : edge === 1 ? mapW + 30 : Phaser.Math.Between(40, mapW - 40);
            var ey = edge === 2 ? -30 : edge === 3 ? mapH + 30 : Phaser.Math.Between(40, mapH - 40);
            scene.spawnEnemyOf(elite, ex, ey);
            uiFloat(scene, scene.player.x, scene.player.y - 90, "精英突入！", "#ef4444");
            SFX.explode();
            scene.cameras.main.shake(120, 0.014);
          }
        }

        var fireEvery = Math.max(0.18, scene.player.fireCd - Math.min(0.1, scene.player.weaponLevel * 0.008));
        if (scene.player.buffs.fire > 0) fireEvery *= 0.9;
        if (scene.fireAcc >= fireEvery) {
          scene.fireAcc = 0;
          scene.fireWeapon();
        }

        scene.bullets.getChildren().forEach(function (b) {
          if (!b.active) return;
          var life = (b.getData("life") || 1) - dt;
          b.setData("life", life);
          if (life <= 0) { b.destroy(); return; }
          var trailAcc = (b.getData("trailAcc") || 0) + dt;
          if (isCombatFxOn() && trailAcc >= 0.05) {
            b.setData("trailAcc", 0);
            var tc = b.getData("trailColor") || 0x67e8f9;
            var spark = scene.add.circle(b.x, b.y, 2, tc, 0.55).setDepth(8);
            scene.tweens.add({
              targets: spark,
              alpha: 0,
              scale: 0.2,
              duration: 120,
              onComplete: function () { spark.destroy(); }
            });
          } else {
            b.setData("trailAcc", trailAcc);
          }
          var homing = b.getData("homing") || 0;
          if (homing > 0) {
            var foes = scene.enemies.getChildren().filter(function (e) { return e.active; });
            if (foes.length) {
              foes.sort(function (a, c) {
                return Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y) - Phaser.Math.Distance.Between(c.x, c.y, b.x, b.y);
              });
              var ang = Phaser.Math.Angle.Between(b.x, b.y, foes[0].x, foes[0].y);
              var spd = b.body.velocity.length();
              var turn = 2.2 + homing * 0.9;
              var cur = Math.atan2(b.body.velocity.y, b.body.velocity.x);
              var diff = Phaser.Math.Angle.Wrap(ang - cur);
              var next = cur + Phaser.Math.Clamp(diff, -turn * dt, turn * dt);
              b.setVelocity(Math.cos(next) * spd, Math.sin(next) * spd);
              b.setRotation(next);
            }
          }
          if (b.x < -40 || b.x > mapW + 40 || b.y < -40 || b.y > mapH + 40) b.destroy();
        });

        scene.enemyShots.getChildren().forEach(function (s) {
          if (!s.active) return;
          if (s.x < -40 || s.x > mapW + 40 || s.y < -40 || s.y > mapH + 40) s.destroy();
        });

        scene.enemies.getChildren().forEach(function (enemy) {
          if (!enemy.active) return;
          var slowTimer = enemy.getData("slowTimer") || 0;
          if (slowTimer > 0) {
            enemy.setData("slowTimer", slowTimer - dt);
            if (slowTimer - dt <= 0) enemy.setData("slow", 0);
          }
          var slow = enemy.getData("slow") || 0;
          var speed = enemy.getData("speed") * threat * (1 - slow);
          var behavior = enemy.getData("behavior");
          var ang = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
          var dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);

          if (behavior === "kite") {
            if (dist < 170) ang += Math.PI;
            else if (dist > 260) { /* chase */ }
            else ang += Math.PI / 2;
            enemy.setData("shootAcc", (enemy.getData("shootAcc") || 0) + dt);
            if (enemy.getData("shootAcc") >= (enemy.getData("shootCd") || 1.4)) {
              enemy.setData("shootAcc", 0);
              var shotAng = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
              var shot = scene.enemyShots.create(enemy.x, enemy.y, "bullet");
              shot.body.allowGravity = false;
              shot.setTint(enemy.getData("type") === "sniper" ? 0xe879f9 : 0xa855f7);
              var shotSpd = enemy.getData("type") === "sniper" ? 320 : 260;
              shot.setVelocity(Math.cos(shotAng) * shotSpd, Math.sin(shotAng) * shotSpd);
              scene.time.delayedCall(2200, function (s) { if (s && s.active) s.destroy(); }, [shot]);
              SFX.shoot();
            }
          } else if (behavior === "tank") {
            speed *= 0.85;
          } else if (behavior === "elite") {
            speed *= 0.9;
            enemy.setData("shootAcc", (enemy.getData("shootAcc") || 0) + dt);
            if (enemy.getData("shootAcc") >= 1.8) {
              enemy.setData("shootAcc", 0);
              for (var k = 0; k < 3; k++) {
                var a = ang + (k - 1) * 0.22;
                var es = scene.enemyShots.create(enemy.x, enemy.y, "bullet");
                es.body.allowGravity = false;
                es.setTint(0xef4444);
                es.setVelocity(Math.cos(a) * 240, Math.sin(a) * 240);
                scene.time.delayedCall(2400, function (s) { if (s && s.active) s.destroy(); }, [es]);
              }
            }
          } else if (behavior === "swarm") {
            ang += Math.sin((scene.elapsedTime || 0) * 8 + enemy.x * 0.05) * 0.5;
            speed *= 1.15;
          } else if (behavior === "bomber") {
            speed *= 1.1;
          } else if (behavior === "glitch") {
            enemy.setData("glitchAcc", (enemy.getData("glitchAcc") || 0) + dt);
            if (enemy.getData("glitchAcc") >= 1.15) {
              enemy.setData("glitchAcc", 0);
              enemy.x = Phaser.Math.Clamp(enemy.x + Phaser.Math.Between(-90, 90), 24, mapW - 24);
              enemy.y = Phaser.Math.Clamp(enemy.y + Phaser.Math.Between(-90, 90), 24, mapH - 24);
              neonBurst(scene, enemy.x, enemy.y, "spark-cyan", 10);
            }
            ang += Math.sin((scene.elapsedTime || 0) * 12 + enemy.y * 0.04) * 0.85;
            speed *= 1.05;
          }

          enemy.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
          enemy.rotation += dt * (behavior === "elite" ? 1.2 : behavior === "glitch" ? 5 : 3);

          var maxHp = enemy.getData("maxHp") || 1;
          var hp = enemy.getData("hp") || 0;
          if (!enemy.hpBar) {
            enemy.hpBar = scene.add.rectangle(enemy.x, enemy.y - 22, 28, 3, 0x22c55e, 0.9).setDepth(15);
          }
          enemy.hpBar.setPosition(enemy.x, enemy.y - 22 - (enemy.displayHeight * 0.2));
          enemy.hpBar.width = 28 * Phaser.Math.Clamp(hp / maxHp, 0, 1);
          enemy.hpBar.setFillStyle(hp / maxHp > 0.45 ? 0x22c55e : 0xf97316, 0.9);
          if (!enemy.active && enemy.hpBar) { enemy.hpBar.destroy(); enemy.hpBar = null; }
        });

        scene.enemies.getChildren().forEach(function (enemy) {
          if (!enemy.active && enemy.hpBar) {
            enemy.hpBar.destroy();
            enemy.hpBar = null;
          }
        });

        scene.xpOrbs.getChildren().forEach(function (orb) {
          if (!orb.active) return;
          var dist = Phaser.Math.Distance.Between(orb.x, orb.y, scene.player.x, scene.player.y);
          if (dist < 140) {
            var angle = Phaser.Math.Angle.Between(orb.x, orb.y, scene.player.x, scene.player.y);
            orb.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
          }
        });

        var modShort = scene.mods.slice(-3).join("+") || "BASIC";
        scene.setExtraHud(
          "HP " + scene.player.hp + "/" + scene.player.maxHp +
          " · LV" + scene.player.weaponLevel +
          " · ATK" + scene.player.atk +
          " · KILL " + scene.killCount
        );
        scene.modeHud.setText(scene.waveLabel + " · XP " + scene.xp + "/" + scene.xpNeed + " · " + modShort);
      }
    }
  };

  function createGame(configInput) {
    var cfg = MODES[(configInput && configInput.slug) || DEFAULT_SLUG] || MODES["cyber-blade-dash"];
    var selectedDiff = "standard";

    class BootScene extends Phaser.Scene {
      constructor() { super("BootScene"); }
      create() {
        makeTextures(this);
        this.cameras.main.fadeIn(400, 4, 6, 12);
        this.add.text(W / 2, H / 2, cfg.titleZh, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "30px",
          fontStyle: "bold",
          color: "#e2e8f0"
        }).setOrigin(0.5);
        this.add.text(W / 2, H / 2 + 40, "RainyNightFrog · Phaser 3 Esports Suite", {
          fontFamily: "Segoe UI, sans-serif",
          fontSize: "14px",
          color: "#64748b"
        }).setOrigin(0.5);
        this.time.delayedCall(350, function () {
          this.scene.start("MainMenuScene");
        }, [], this);
      }
    }

    class MainMenuScene extends Phaser.Scene {
      constructor() { super("MainMenuScene"); }
      create() {
        ensureAudio();
        drawBackdrop(this, cfg.accent);
        var badge = this.add.text(W / 2, 90, "RNF PHASER 3 ESPORTS", {
          fontFamily: "Segoe UI, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#22d3ee",
          letterSpacing: 4
        }).setOrigin(0.5).setAlpha(0);
        var title = this.add.text(W / 2, 150, cfg.title, {
          fontFamily: "Segoe UI, Microsoft JhengHei, sans-serif",
          fontSize: "46px",
          fontStyle: "bold",
          color: "#ffffff"
        }).setOrigin(0.5).setScale(0.6).setAlpha(0);
        var sub = this.add.text(W / 2, 208, cfg.titleZh + " · " + cfg.objective, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "16px",
          color: "#94a3b8"
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: badge, alpha: 1, y: 100, duration: 420, ease: "Cubic.easeOut" });
        this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 520, ease: "Back.easeOut", delay: 80 });
        this.tweens.add({ targets: sub, alpha: 1, duration: 400, ease: "Cubic.easeOut", delay: 160 });
        var self = this;
        makeMenuButton(this, W / 2, 300, "開始遊戲 START", cfg.accent, function () {
          SFX.confirm();
          self.cameras.main.fadeOut(220, 4, 6, 12);
          self.time.delayedCall(230, function () { self.scene.start("DifficultyScene"); });
        });
        makeMenuButton(this, W / 2, 358, "設定", 0xfbbf24, function () {
          SFX.click();
          self.scene.start("SettingsScene");
        });
        makeMenuButton(this, W / 2, 416, "排行榜", 0x34d399, function () {
          SFX.click();
          self.scene.start("LeaderboardScene", { difficulty: selectedDiff || "standard" });
        });
        makeMenuButton(this, W / 2, 474, "操作說明", 0xa78bfa, function () {
          if (window.RNFPhaserHelp && RNFPhaserHelp.showHelpOverlay) {
            RNFPhaserHelp.showHelpOverlay(self, cfg.help, { W: W, H: H, accent: cfg.accent });
          }
        });
      }
    }

    class SettingsScene extends Phaser.Scene {
      constructor() { super("SettingsScene"); }
      create() {
        drawBackdrop(this, cfg.accent);
        this.cameras.main.fadeIn(180, 4, 6, 12);
        this.add.text(W / 2, 90, "設定", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "36px",
          fontStyle: "bold",
          color: "#e2e8f0"
        }).setOrigin(0.5);
        this.add.text(W / 2, 140, "可關閉打擊特效以降低畫面干擾", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "14px",
          color: "#64748b"
        }).setOrigin(0.5);

        var self = this;
        var fxOn = isCombatFxOn();
        var fxBtn = makeMenuButton(this, W / 2, 260, "打擊特效：" + (fxOn ? "開" : "關"), fxOn ? 0x22d3ee : 0x64748b, function () {
          setCombatFxOn(!isCombatFxOn());
          SFX.click();
          self.scene.restart();
        });

        var shakeOn = true;
        try {
          if (typeof RNF !== "undefined" && RNF.getSettings) {
            var st = RNF.getSettings();
            if (st && typeof st.screenShake === "boolean") shakeOn = st.screenShake;
          }
        } catch (_e) {}
        makeMenuButton(this, W / 2, 330, "螢幕震動：" + (shakeOn ? "開" : "關"), shakeOn ? 0xa78bfa : 0x64748b, function () {
          try {
            if (typeof RNF !== "undefined" && RNF.setSettings && RNF.getSettings) {
              RNF.setSettings({ screenShake: !RNF.getSettings().screenShake });
            }
          } catch (_e2) {}
          SFX.click();
          self.scene.restart();
        });

        makeMenuButton(this, W / 2, 430, "返回", 0x94a3b8, function () {
          SFX.click();
          self.scene.start("MainMenuScene");
        });
      }
    }

    class DifficultyScene extends Phaser.Scene {
      constructor() { super("DifficultyScene"); }
      create() {
        drawBackdrop(this, cfg.accent);
        this.cameras.main.fadeIn(200, 4, 6, 12);
        var head = this.add.text(W / 2, 100, "選擇難度", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "36px",
          fontStyle: "bold",
          color: "#e2e8f0"
        }).setOrigin(0.5).setScale(0.7).setAlpha(0);
        this.tweens.add({ targets: head, alpha: 1, scale: 1, duration: 400, ease: "Back.easeOut" });
        this.add.text(W / 2, 150, "Casual / Standard / Extreme + 動態危險倍率", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "14px",
          color: "#64748b"
        }).setOrigin(0.5);
        var self = this;
        ["casual", "standard", "extreme"].forEach(function (key, i) {
          var d = DIFF_PRESETS[key];
          var color = Phaser.Display.Color.HexStringToColor(d.color).color;
          makeMenuButton(self, W / 2, 230 + i * 70, d.label, color, function () {
            selectedDiff = key;
            SFX.confirm();
            self.cameras.main.fadeOut(200, 4, 6, 12);
            self.time.delayedCall(210, function () {
              self.scene.start("GameScene", { difficulty: key });
            });
          });
        });
      }
    }

    class GameScene extends Phaser.Scene {
      constructor() { super("GameScene"); }
      init(data) {
        this.diffKey = (data && data.difficulty) || selectedDiff || "standard";
        this.diff = DIFF_PRESETS[this.diffKey] || DIFF_PRESETS.standard;
        this.score = 0;
        this.elapsedTime = 0;
        this.dangerMultiplier = 1;
        this.alive = true;
        this.extraHudValue = "";
      }
      setExtraHud(value) {
        this.extraHudValue = value;
        if (this.hudExtra) this.hudExtra.setText(value);
      }
      create() {
        ensureAudio();
        drawBackdrop(this, cfg.accent);
        this.cameras.main.fadeIn(250, 4, 6, 12);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("W,A,S,D,SPACE,SHIFT");
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.hudScore = this.add.text(24, 18, "SCORE 0", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "18px", fontStyle: "bold", color: "#67e8f9"
        }).setScrollFactor(0).setDepth(20);
        this.hudDanger = this.add.text(24, 46, "DANGER x1.00", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "16px", fontStyle: "bold", color: "#f472b6"
        }).setScrollFactor(0).setDepth(20);
        this.hudDiff = this.add.text(W - 24, 18, this.diff.label, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "14px", color: this.diff.color
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
        this.hudHint = this.add.text(W / 2, 18, cfg.objective, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "13px", color: "#64748b"
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);
        this.hudExtra = this.add.text(W - 24, 44, "", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "14px", fontStyle: "bold", color: "#f8fafc"
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
        cfg.startState(this);
        // 打擊特效／震動開關：關閉時略過震屏
        var cam = this.cameras.main;
        var rawShake = cam.shake.bind(cam);
        cam.shake = function (duration, intensity) {
          if (!isCombatFxOn()) return cam;
          try {
            if (typeof RNF !== "undefined" && RNF.getSettings) {
              var s = RNF.getSettings();
              if (s && s.screenShake === false) return cam;
            }
          } catch (_e) {}
          return rawShake(duration, intensity);
        };
      }
      update(_time, delta) {
        if (!this.alive) return;
        var dt = delta / 1000;
        this.elapsedTime += dt;
        this.dangerMultiplier = 1 + Math.log(1 + this.elapsedTime / 30) * 0.8;
        var threat = this.dangerMultiplier * this.diff.base;
        this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
        this.hudScore.setText("SCORE " + this.score.toLocaleString());
        cfg.updateState(this, dt, threat);
      }
      gameOver() {
        if (!this.alive) return;
        this.alive = false;
        this.physics.pause();
        SFX.over();
        var raw = this.score;
        var finalScore = Math.floor(raw * (this.diff.scoreMult || 1));
        var meta = {
          slug: cfg.slug,
          difficulty: this.diff.id,
          rawScore: raw,
          dangerPeak: Number(this.dangerMultiplier.toFixed(2)),
          elapsed: Math.floor(this.elapsedTime)
        };
        try {
          if (window.RNFPhaserLeaderboard && RNFPhaserLeaderboard.submitRun) {
            RNFPhaserLeaderboard.submitRun(finalScore, meta);
          } else if (typeof RNF !== "undefined" && RNF.submitScore) {
            RNF.submitScore(finalScore, meta);
          }
        } catch (_e) {}
        this.scene.launch("GameOverModal", {
          score: finalScore,
          rawScore: raw,
          diff: this.diff,
          danger: this.dangerMultiplier,
          elapsed: this.elapsedTime,
          title: cfg.titleZh,
          scoreVerb: cfg.scoreVerb
        });
      }
    }

    class GameOverModal extends Phaser.Scene {
      constructor() { super("GameOverModal"); }
      init(data) { this.payload = data || {}; }
      create() {
        var score = this.payload.score || 0;
        var raw = this.payload.rawScore || score;
        var diff = this.payload.diff || DIFF_PRESETS.standard;
        var danger = this.payload.danger || 1;
        var elapsed = this.payload.elapsed || 0;
        this.add.rectangle(W / 2, H / 2, W, H, 0x02040a, 0.72).setInteractive();
        var panel = this.add.rectangle(W / 2, H / 2, 480, 500, 0x0b1220, 0.96)
          .setStrokeStyle(2, cfg.accent, 0.9)
          .setScale(0.7)
          .setAlpha(0);
        var badge = this.add.text(W / 2, H / 2 - 168, "GAME OVER", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "14px", fontStyle: "bold", color: "#22d3ee", letterSpacing: 3
        }).setOrigin(0.5).setAlpha(0);
        var title = this.add.text(W / 2, H / 2 - 128, this.payload.title || cfg.titleZh, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "26px", fontStyle: "bold", color: "#ffffff"
        }).setOrigin(0.5).setAlpha(0);
        var scoreTxt = this.add.text(W / 2, H / 2 - 48, score.toLocaleString(), {
          fontFamily: "Segoe UI, sans-serif", fontSize: "52px", fontStyle: "bold", color: "#67e8f9"
        }).setOrigin(0.5).setScale(0.4).setAlpha(0);
        var meta = this.add.text(
          W / 2,
          H / 2 + 20,
          diff.label + " · DANGER x" + Number(danger).toFixed(2) + " · " + Math.floor(elapsed) + "s" +
          (raw !== score ? " · RAW " + raw.toLocaleString() : ""),
          {
            fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
            fontSize: "13px",
            color: "#94a3b8",
            align: "center",
            wordWrap: { width: 400 }
          }
        ).setOrigin(0.5).setAlpha(0);
        var uploaded = this.add.text(W / 2, H / 2 + 52, "分數已送交本遊戲獨立排行榜", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "12px",
          color: "#a78bfa"
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: panel, alpha: 1, scale: 1, duration: 380, ease: "Back.easeOut" });
        this.tweens.add({ targets: [badge, title, meta, uploaded], alpha: 1, duration: 320, ease: "Cubic.easeOut", delay: 80 });
        this.tweens.add({ targets: scoreTxt, alpha: 1, scale: 1, duration: 480, ease: "Back.easeOut", delay: 120 });
        neonBurst(this, W / 2, H / 2 - 48, "spark-cyan", 24);
        neonBurst(this, W / 2, H / 2 - 48, "spark-violet", 18);
        var self = this;
        // 兩排按鈕：落在面板內（半高 250）
        makeMenuButton(this, W / 2 - 110, H / 2 + 95, "再來一次", cfg.accent, function () {
          SFX.confirm();
          self.scene.stop("GameOverModal");
          self.scene.stop("GameScene");
          self.scene.start("GameScene", { difficulty: selectedDiff });
        }, 180);
        makeMenuButton(this, W / 2 + 110, H / 2 + 95, "排行榜", 0x34d399, function () {
          SFX.click();
          self.scene.stop("GameOverModal");
          self.scene.stop("GameScene");
          self.scene.start("LeaderboardScene", { difficulty: selectedDiff || "standard" });
        }, 180);
        makeMenuButton(this, W / 2, H / 2 + 155, "主選單", 0xa78bfa, function () {
          SFX.click();
          self.scene.stop("GameOverModal");
          self.scene.stop("GameScene");
          self.scene.start("MainMenuScene");
        }, 200);
      }
    }

    var LeaderboardScene = null;
    if (window.RNFPhaserLeaderboard && RNFPhaserLeaderboard.createLeaderboardScene) {
      LeaderboardScene = RNFPhaserLeaderboard.createLeaderboardScene({
        Phaser: Phaser,
        makeButton: makeMenuButton,
        W: W,
        H: H,
        accent: cfg.accent,
        returnScene: "MainMenuScene",
        getDefaultDiff: function () { return selectedDiff || "standard"; }
      });
    } else {
      LeaderboardScene = class LeaderboardSceneFallback extends Phaser.Scene {
        constructor() { super("LeaderboardScene"); }
        create() {
          this.add.text(W / 2, H / 2, "排行榜模組未載入", {
            fontFamily: "Microsoft JhengHei, Segoe UI", fontSize: "18px", color: "#f472b6"
          }).setOrigin(0.5);
          var self = this;
          makeMenuButton(this, W / 2, H - 60, "返回", 0x64748b, function () {
            self.scene.start("MainMenuScene");
          }, 180);
        }
      };
    }

    if (typeof RNF !== "undefined" && RNF.init) RNF.init();
    var game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: "game-host",
      width: W,
      height: H,
      backgroundColor: "#04060c",
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [BootScene, MainMenuScene, SettingsScene, DifficultyScene, GameScene, GameOverModal, LeaderboardScene]
    });
    if (typeof RNF !== "undefined" && RNF.setShowMenuHandler) {
      RNF.setShowMenuHandler(function () {
        try {
          ["GameOverModal", "LeaderboardScene", "DifficultyScene", "GameScene", "SettingsScene"].forEach(function (key) {
            try {
              if (game.scene.getScene(key)) game.scene.stop(key);
            } catch (_e) {}
          });
          game.scene.start("MainMenuScene");
        } catch (_e2) {}
      });
    }
    return game;
  }

  window.RNFArcadeSuite = {
    createGame: createGame
  };
})();
