/**
 * RainyNightFrog Demo Phaser Kit
 * Shared juice / difficulty / menu helpers / PlatformBridge glue for demo rewrites.
 */
(function (global) {
  "use strict";

  var W = 960;
  var H = 540;

  var DIFF_PRESETS = {
    casual: {
      id: "casual",
      legacy: "easy",
      label: "Casual 輕鬆",
      base: 0.75,
      scoreMult: 1.0,
      color: "#67e8f9"
    },
    standard: {
      id: "standard",
      legacy: "normal",
      label: "Standard 電競",
      base: 1.0,
      scoreMult: 1.25,
      color: "#a78bfa"
    },
    extreme: {
      id: "extreme",
      legacy: "hard",
      label: "Extreme 狂暴",
      base: 1.45,
      scoreMult: 1.75,
      color: "#f472b6"
    }
  };

  var LEGACY_TO_DIFF = { easy: "casual", normal: "standard", hard: "extreme" };

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
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
    g.gain.setValueAtTime((vol || 0.1) * master, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  var SFX = {
    click: function () { beep(520, 0.06, "triangle", 0.08); },
    confirm: function () { beep(660, 0.08, "square", 0.1); beep(880, 0.1, "square", 0.08); },
    jump: function () { beep(280, 0.1, "sawtooth", 0.09, 520); },
    score: function () { beep(740, 0.07, "square", 0.1); beep(980, 0.09, "triangle", 0.08); },
    hit: function () { beep(180, 0.12, "sawtooth", 0.14, 60); },
    dash: function () { beep(200, 0.09, "triangle", 0.1, 720); },
    beat: function () { beep(700, 0.05, "triangle", 0.08); },
    place: function () { beep(480, 0.06, "square", 0.08); },
    explode: function () { beep(120, 0.22, "sawtooth", 0.16, 40); beep(90, 0.28, "triangle", 0.1, 30); },
    over: function () { beep(220, 0.18, "sawtooth", 0.12, 80); beep(140, 0.35, "triangle", 0.1, 50); },
    win: function () { beep(520, 0.08, "square", 0.1); beep(780, 0.12, "triangle", 0.1); beep(1040, 0.16, "square", 0.08); }
  };

  function neonBurst(scene, x, y, color, count) {
    var n = count || Phaser.Math.Between(18, 26);
    var c = typeof color === "number" ? color : 0x22d3ee;
    for (var i = 0; i < n; i++) {
      var p = scene.add.circle(x, y, Phaser.Math.Between(2, 5), c, 1).setDepth(40);
      var ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var dist = Phaser.Math.Between(40, 140);
      scene.tweens.add({
        targets: p,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(280, 520),
        ease: "Cubic.easeOut",
        onComplete: function (_tw, targets) {
          var list = Array.isArray(targets) ? targets : [targets];
          for (var j = 0; j < list.length; j++) {
            if (list[j] && typeof list[j].destroy === "function") list[j].destroy();
          }
        }
      });
    }
  }

  function screenShake(scene, dur, intens) {
    if (scene && scene.cameras && scene.cameras.main) {
      scene.cameras.main.shake(dur || 100, intens || 0.01);
    }
  }

  function pulseButton(scene, target) {
    scene.tweens.add({
      targets: target,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 90,
      yoyo: true,
      ease: "Back.easeOut"
    });
  }

  function makeMenuButton(scene, x, y, label, tint, onClick, width) {
    var w = width || 280;
    var bg = scene.add.rectangle(x, y, w, 48, tint, 0.22).setStrokeStyle(2, tint, 0.85).setInteractive({ useHandCursor: true });
    var txt = scene.add.text(x, y, label, {
      fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      color: "#f8fafc"
    }).setOrigin(0.5);
    bg.on("pointerover", function () {
      scene.tweens.add({ targets: [bg, txt], scaleX: 1.04, scaleY: 1.04, duration: 120, ease: "Cubic.easeOut" });
    });
    bg.on("pointerout", function () {
      scene.tweens.add({ targets: [bg, txt], scaleX: 1, scaleY: 1, duration: 120, ease: "Cubic.easeOut" });
    });
    bg.on("pointerdown", function () {
      pulseButton(scene, bg);
      pulseButton(scene, txt);
      SFX.click();
      onClick();
    });
    return { bg: bg, txt: txt };
  }

  function makeStarfield(scene, count, color) {
    for (var i = 0; i < (count || 36); i++) {
      var star = scene.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        Phaser.Math.Between(1, 2),
        color || 0x22d3ee,
        Phaser.Math.FloatBetween(0.12, 0.5)
      );
      scene.tweens.add({
        targets: star,
        alpha: 0.08,
        duration: Phaser.Math.Between(700, 1800),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
  }

  function calcDanger(elapsedSec) {
    return 1 + Math.log(1 + elapsedSec / 30) * 0.8;
  }

  function resolveDiffKey(raw) {
    if (!raw) return "standard";
    if (DIFF_PRESETS[raw]) return raw;
    return LEGACY_TO_DIFF[raw] || "standard";
  }

  function tFactory(slug) {
    var pack = window.RNF_DEMO_I18N && RNF_DEMO_I18N.apply(slug);
    return function (key, fb) {
      if (pack && pack[key] != null && pack[key] !== "") return pack[key];
      if (window.RNF_DEMO_I18N && RNF_DEMO_I18N.t) {
        var tt = RNF_DEMO_I18N.t(slug);
        if (tt) return tt(key, fb);
      }
      return fb != null ? fb : key;
    };
  }

  function getLocaleMode(slug) {
    var pack = window.RNF_DEMO_I18N && window.RNF_DEMO_PACKS && window.RNF_DEMO_PACKS[slug];
    var applied = window.RNF_DEMO_I18N && RNF_DEMO_I18N.apply && RNF_DEMO_I18N.apply(slug);
    var lang = (((applied && applied.htmlLang) || document.documentElement.lang || "zh-TW") + "").toLowerCase();
    if (lang.indexOf("es") === 0) return "es";
    if (lang.indexOf("en") === 0) return "en";
    if (lang.indexOf("hans") !== -1 || lang === "zh-cn") return "zh-CN";
    return "zh-HK";
  }

  function wrapHelpHtml(html) {
    return (html || "").replace(/<\/?ul>/g, "\n").replace(/<\/?li>/g, "\n• ").replace(/<\/?ol>/g, "\n").replace(/<\/?p>/g, "\n").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
  }

  function showHelpOverlay(scene, htmlOrText, title) {
    if (scene._helpLayer) {
      scene._helpLayer.destroy(true);
      scene._helpLayer = null;
      return;
    }
    var layer = scene.add.container(0, 0).setDepth(200);
    scene._helpLayer = layer;
    var dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.72).setInteractive();
    var panel = scene.add.rectangle(W / 2, H / 2, 720, 420, 0x0b1220, 0.96).setStrokeStyle(2, 0x22d3ee, 0.5);
    var head = scene.add.text(W / 2, 90, title || "遊戲說明", {
      fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
      fontSize: "22px",
      fontStyle: "bold",
      color: "#67e8f9"
    }).setOrigin(0.5);
    var body = scene.add.text(W / 2, H / 2 + 10, wrapHelpHtml(htmlOrText).slice(0, 1400), {
      fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
      fontSize: "13px",
      color: "#cbd5e1",
      align: "left",
      wordWrap: { width: 640 },
      lineSpacing: 4
    }).setOrigin(0.5);
    var close = scene.add.text(W / 2, H - 70, "✕ 關閉", {
      fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
      fontSize: "16px",
      color: "#a78bfa"
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on("pointerdown", function () {
      SFX.click();
      layer.destroy(true);
      scene._helpLayer = null;
    });
    dim.on("pointerdown", function () {
      layer.destroy(true);
      scene._helpLayer = null;
    });
    layer.add([dim, panel, head, body, close]);
    scene.tweens.add({ targets: panel, scaleX: { from: 0.85, to: 1 }, scaleY: { from: 0.85, to: 1 }, duration: 280, ease: "Back.easeOut" });
  }

  function drawBriefCards(scene, y, briefs) {
    var cards = [];
    var cardW = 280;
    var gap = 16;
    var startX = W / 2 - (cardW * 1.5 + gap);
    for (var i = 0; i < 3; i++) {
      var b = briefs[i] || { title: "—", body: "" };
      var cx = startX + i * (cardW + gap) + cardW / 2;
      var bg = scene.add.rectangle(cx, y, cardW, 96, 0x000000, 0.35).setStrokeStyle(1, 0xa78bfa, 0.35);
      var title = scene.add.text(cx - cardW / 2 + 14, y - 34, b.title, {
        fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#c4b5fd"
      });
      var body = scene.add.text(cx - cardW / 2 + 14, y - 12, b.body, {
        fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
        fontSize: "12px",
        color: "#cbd5e1",
        wordWrap: { width: cardW - 28 },
        lineSpacing: 2
      });
      cards.push({ bg: bg, title: title, body: body });
    }
    return cards;
  }

  function createShellScenes(opts) {
    var meta = opts || {};
    var slug = meta.slug;
    var title = meta.title || slug;
    var subtitle = meta.subtitle || "";
    var badge = meta.badge || "RAINYNIGHTFROG DEMO";
    var accent = meta.accent || 0x22d3ee;
    var helpHtml = meta.helpHtml || "";
    var briefFn = meta.briefFn || function () {
      return [
        { title: "節奏", body: "選擇難度後開始對局。" },
        { title: "經濟", body: "維持連擊與資源循環。" },
        { title: "壓力", body: "DANGER 會隨時間上升。" }
      ];
    };
    var registry = {
      difficulty: "standard",
      bestScore: 0,
      bestGrade: "—",
      progress: null
    };

    class BootScene extends Phaser.Scene {
      constructor() { super("BootScene"); }
      preload() {}
      create() {
        if (meta.makeTextures) meta.makeTextures(this);
        this.cameras.main.fadeIn(350, 4, 6, 12);
        this.add.text(W / 2, H / 2, "RAINYNIGHTFROG", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "28px", fontStyle: "bold", color: "#22d3ee"
        }).setOrigin(0.5);
        this.add.text(W / 2, H / 2 + 36, "Phaser 3 Demo Boot…", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "14px", color: "#64748b"
        }).setOrigin(0.5);
        var self = this;
        this.time.delayedCall(420, function () { self.scene.start("MainMenuScene"); });
      }
    }

    class MainMenuScene extends Phaser.Scene {
      constructor() { super("MainMenuScene"); }
      create() {
        ensureAudio();
        this.cameras.main.setBackgroundColor("#060a14");
        this.cameras.main.fadeIn(200, 4, 6, 12);
        makeStarfield(this, 40, accent);
        this.add.text(W / 2, 70, badge, {
          fontFamily: "Segoe UI, sans-serif", fontSize: "12px", fontStyle: "bold", color: "#22d3ee", letterSpacing: 3
        }).setOrigin(0.5);
        var titleTxt = this.add.text(W / 2, 120, title, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "40px", fontStyle: "bold", color: "#ffffff"
        }).setOrigin(0.5).setScale(0.7).setAlpha(0);
        this.tweens.add({ targets: titleTxt, alpha: 1, scale: 1, duration: 480, ease: "Back.easeOut" });
        this.add.text(W / 2, 170, subtitle, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "14px", color: "#94a3b8", align: "center", wordWrap: { width: 720 }
        }).setOrigin(0.5);

        var stats = this.add.text(W / 2, 210,
          "BEST " + (registry.bestScore || 0).toLocaleString() + "   ·   GRADE " + (registry.bestGrade || "—"),
          { fontFamily: "Segoe UI, sans-serif", fontSize: "14px", color: "#67e8f9" }
        ).setOrigin(0.5);

        this.briefCards = drawBriefCards(this, 300, briefFn(registry.difficulty, getLocaleMode(slug)));

        var self = this;
        makeMenuButton(this, W / 2 - 150, 400, "開始遊戲", accent, function () {
          SFX.confirm();
          self.cameras.main.fadeOut(180, 4, 6, 12);
          self.time.delayedCall(190, function () {
            self.scene.start(meta.startScene || "DifficultyScene");
          });
        }, 200);
        makeMenuButton(this, W / 2 + 150, 400, "遊戲說明", 0xa78bfa, function () {
          showHelpOverlay(self, helpHtml, "遊戲說明");
        }, 200);
        makeMenuButton(this, W / 2 - 150, 460, "排行榜", 0x34d399, function () {
          self.scene.start("LeaderboardScene");
        }, 200);
        makeMenuButton(this, W / 2 + 150, 460, "離開平台", 0xf472b6, function () {
          if (window.PlatformBridge && PlatformBridge.leaveToPlatform) {
            PlatformBridge.leaveToPlatform({ confirm: true });
          }
        }, 200);

        if (window.PlatformBridge) {
          PlatformBridge.onShowMenu(function () {
            var game = window.__RNF_DEMO_GAME__;
            if (!game || !game.scene) return;
            try {
              ["GameOverModal", "LeaderboardScene", "DifficultyScene", "GameScene"].forEach(function (key) {
                try {
                  if (game.scene.getScene(key)) game.scene.stop(key);
                } catch (_e) {}
              });
            } catch (_e2) {}
            game.scene.start("MainMenuScene");
          });
        }
      }
    }

    class DifficultyScene extends Phaser.Scene {
      constructor() { super("DifficultyScene"); }
      create() {
        this.cameras.main.setBackgroundColor("#060a14");
        this.cameras.main.fadeIn(180, 4, 6, 12);
        this.add.text(W / 2, 90, "選擇難度", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "34px", fontStyle: "bold", color: "#e2e8f0"
        }).setOrigin(0.5);
        this.add.text(W / 2, 140, "進入關卡後 DANGER 仍會隨時間提升", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "14px", color: "#64748b"
        }).setOrigin(0.5);

        var self = this;
        ["casual", "standard", "extreme"].forEach(function (key, i) {
          var d = DIFF_PRESETS[key];
          var color = Phaser.Display.Color.HexStringToColor(d.color).color;
          makeMenuButton(self, W / 2, 220 + i * 72, d.label, color, function () {
            registry.difficulty = key;
            SFX.confirm();
            self.cameras.main.fadeOut(180, 4, 6, 12);
            self.time.delayedCall(190, function () {
              self.scene.start("GameScene", { difficulty: key });
            });
          });
        });
        makeMenuButton(this, W / 2, 460, "返回", 0x64748b, function () {
          self.scene.start("MainMenuScene");
        }, 180);
      }
    }

    class LeaderboardScene extends Phaser.Scene {
      constructor() { super("LeaderboardScene"); }
      create() {
        var self = this;
        this.cameras.main.setBackgroundColor("#060a14");
        this.add.text(W / 2, 70, "排行榜", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "30px", fontStyle: "bold", color: "#67e8f9"
        }).setOrigin(0.5);
        var list = this.add.text(W / 2, H / 2, "載入中…", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "16px", color: "#94a3b8", align: "center"
        }).setOrigin(0.5);
        makeMenuButton(this, W / 2, 480, "返回", 0x64748b, function () {
          self.scene.start("MainMenuScene");
        }, 180);

        if (!window.PlatformBridge) {
          list.setText("PlatformBridge 未就緒");
          return;
        }
        var legacy = DIFF_PRESETS[registry.difficulty].legacy;
        this.add.text(W / 2, 108, "本遊戲獨立排行榜 · 與其他作品互不影響", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "13px", color: "#64748b"
        }).setOrigin(0.5);
        PlatformBridge.fetchLeaderboard(12, legacy).then(function (entries) {
          if (!entries || !entries.length) {
            list.setText("尚無紀錄，完成一局即可上榜");
            return;
          }
          list.setText(entries.slice(0, 10).map(function (e, i) {
            var name = e.playerName || e.displayName || e.name || "Player";
            var src = e.local || e.source === "local" ? " ·本機" : "";
            return (i + 1) + ". " + name + "  —  " + (e.score || 0).toLocaleString() + "  [" + (e.grade || "—") + "]" + src;
          }).join("\n"));
        }).catch(function () {
          list.setText("排行榜載入失敗");
        });
      }
    }

    class GameOverModal extends Phaser.Scene {
      constructor() { super("GameOverModal"); }
      init(data) {
        this.payload = data || {};
      }
      create() {
        ensureAudio();
        SFX.over();
        this.cameras.main.setBackgroundColor("#050814");
        this.cameras.main.fadeIn(200, 4, 6, 12);
        neonBurst(this, W / 2, H / 2 - 40, 0xf472b6, 24);

        var win = !!this.payload.win;
        this.add.text(W / 2, 100, win ? "MISSION CLEAR" : "MISSION END", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "18px", color: win ? "#34d399" : "#f472b6", letterSpacing: 4
        }).setOrigin(0.5);
        var score = this.payload.score || 0;
        var grade = this.payload.grade || "D";
        var scoreTxt = this.add.text(W / 2, 170, score.toLocaleString(), {
          fontFamily: "Segoe UI, sans-serif", fontSize: "56px", fontStyle: "bold", color: "#ffffff"
        }).setOrigin(0.5).setScale(0.6).setAlpha(0);
        this.tweens.add({ targets: scoreTxt, alpha: 1, scale: 1, duration: 420, ease: "Back.easeOut" });
        this.add.text(W / 2, 240, "GRADE " + grade + "   ·   DANGER x" + Number(this.payload.danger || 1).toFixed(2), {
          fontFamily: "Segoe UI, sans-serif", fontSize: "16px", color: "#a78bfa"
        }).setOrigin(0.5);
        if (this.payload.message) {
          this.add.text(W / 2, 280, this.payload.message, {
            fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "14px", color: "#94a3b8", align: "center", wordWrap: { width: 640 }
          }).setOrigin(0.5);
        }

        var self = this;
        makeMenuButton(this, W / 2 - 140, 400, "再玩一次", accent, function () {
          SFX.confirm();
          self.scene.start("GameScene", { difficulty: registry.difficulty });
        }, 200);
        makeMenuButton(this, W / 2 + 140, 400, "主選單", 0x64748b, function () {
          self.scene.start("MainMenuScene");
        }, 200);

        persistRun(this.payload);
      }
    }

    function persistRun(payload) {
      if (!window.PlatformBridge) return;
      var score = payload.score || 0;
      var grade = payload.grade || "D";
      var diff = resolveDiffKey(payload.difficulty || registry.difficulty);
      var legacy = DIFF_PRESETS[diff].legacy;
      registry.bestScore = Math.max(registry.bestScore || 0, score);
      registry.bestGrade = PlatformBridge.betterGrade(registry.bestGrade || "—", grade);
      PlatformBridge.saveProgress({
        bestScore: registry.bestScore,
        bestGrade: registry.bestGrade,
        bestWave: Math.max(registry.bestWave || 0, payload.wave || payload.floor || 0),
        difficulty: legacy,
        _incrementGames: 1
      }).then(function () {}).catch(function () {});
      PlatformBridge.submitScore({
        score: score,
        grade: grade,
        meta: Object.assign({ difficulty: legacy, dangerPeak: payload.danger }, payload.meta || {})
      }).then(function () {}).catch(function () {});
      if (PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(false);
    }

    function bootBridge() {
      if (!window.PlatformBridge || !PlatformBridge.init) return;
      PlatformBridge.init().then(function (p) {
        if (!p) return;
        registry.progress = p;
        registry.bestScore = p.bestScore || 0;
        registry.bestGrade = p.bestGrade || "—";
        registry.bestWave = p.bestWave || p.bestFloor || 0;
        if (p.difficulty) registry.difficulty = resolveDiffKey(p.difficulty);
      }).catch(function () {});
    }

    return {
      BootScene: BootScene,
      MainMenuScene: MainMenuScene,
      DifficultyScene: DifficultyScene,
      LeaderboardScene: LeaderboardScene,
      GameOverModal: GameOverModal,
      registry: registry,
      bootBridge: bootBridge
    };
  }

  function launchDemoGame(opts) {
    var shell = createShellScenes(opts);
    shell.bootBridge();
    var scenes = [shell.BootScene, shell.MainMenuScene, shell.DifficultyScene, opts.GameScene, shell.GameOverModal, shell.LeaderboardScene];
    if (opts.extraScenes && opts.extraScenes.length) {
      scenes = [shell.BootScene, shell.MainMenuScene].concat(opts.extraScenes).concat([shell.DifficultyScene, opts.GameScene, shell.GameOverModal, shell.LeaderboardScene]);
    }
    var config = {
      type: Phaser.AUTO,
      parent: opts.parent || "game-host",
      width: W,
      height: H,
      backgroundColor: "#050814",
      physics: { default: "arcade", arcade: { debug: false } },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: scenes
    };
    var game = new Phaser.Game(config);
    // 供平台健康檢查／除錯讀取目前 demo 實例（不影響玩法）
    global.__RNF_DEMO_GAME__ = game;
    if (opts && opts.slug) global["__RNF_DEMO_" + String(opts.slug).toUpperCase().replace(/-/g, "_") + "__"] = game;
    return { game: game, shell: shell, registry: shell.registry };
  }

  global.RNFDemoPhaser = {
    W: W,
    H: H,
    DIFF_PRESETS: DIFF_PRESETS,
    LEGACY_TO_DIFF: LEGACY_TO_DIFF,
    SFX: SFX,
    ensureAudio: ensureAudio,
    neonBurst: neonBurst,
    screenShake: screenShake,
    pulseButton: pulseButton,
    makeMenuButton: makeMenuButton,
    makeStarfield: makeStarfield,
    calcDanger: calcDanger,
    resolveDiffKey: resolveDiffKey,
    tFactory: tFactory,
    getLocaleMode: getLocaleMode,
    showHelpOverlay: showHelpOverlay,
    drawBriefCards: drawBriefCards,
    createShellScenes: createShellScenes,
    launchDemoGame: launchDemoGame
  };
})(window);
