/**
 * Pulse Protocol: Neon Beat — Phaser 3 rewrite
 */
(function () {
  "use strict";
  var Kit = window.RNFDemoPhaser;
  var W = Kit.W, H = Kit.H, SFX = Kit.SFX;
  var T = Kit.tFactory("pulse-protocol");
  var KEYS = ["D", "F", "J", "K"];
  var KEY_CODES = ["D", "F", "J", "K"];

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xff6ec7, 1);
    g.fillRoundedRect(0, 0, 56, 18, 6);
    g.generateTexture("pp-note", 56, 18);
    g.clear();
    g.lineStyle(3, 0x00e5ff, 1);
    g.strokeRoundedRect(1, 1, 70, 22, 6);
    g.generateTexture("pp-judge", 72, 24);
  }

  function laneX(i) { return W * 0.22 + i * W * 0.18; }

  class SongSelectScene extends Phaser.Scene {
    constructor() { super("SongSelectScene"); }
    create() {
      var self = this;
      this.cameras.main.setBackgroundColor("#0a0614");
      this.add.text(W / 2, 70, "選擇樂曲", {
        fontFamily: "Microsoft JhengHei, Segoe UI", fontSize: "32px", fontStyle: "bold", color: "#ff6ec7"
      }).setOrigin(0.5);
      var songs = [
        { id: "neon", name: "霓虹脈衝", bpm: 128 },
        { id: "cyber", name: "賽博長征", bpm: 140 },
        { id: "quantum", name: "量子崩壞", bpm: 160 }
      ];
      songs.forEach(function (s, i) {
        Kit.makeMenuButton(self, W / 2, 170 + i * 70, s.name + "  ·  " + s.bpm + " BPM", 0xff2d95, function () {
          self.registry.set("pulseSong", s);
          SFX.confirm();
          self.scene.start("DifficultyScene");
        }, 360);
      });
      Kit.makeMenuButton(this, W / 2, 430, "返回", 0x64748b, function () {
        self.scene.start("MainMenuScene");
      }, 180);
    }
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }
    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.song = this.registry.get("pulseSong") || { id: "neon", name: "霓虹脈衝", bpm: 128 };
      var dens = this.diffKey === "casual" ? 0.55 : this.diffKey === "extreme" ? 1.0 : 0.75;
      this.speed = (this.diffKey === "casual" ? 0.82 : this.diffKey === "extreme" ? 1.18 : 1) * 280;
      this.density = dens;
      this.alive = true;
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.perfects = 0;
      this.greats = 0;
      this.misses = 0;
      this.elapsed = 0;
      this.dangerMultiplier = 1;
      this.fever = false;
      this.songDur = 42;
      this.spawnAcc = 0;
      this.notes = [];
    }
    create() {
      Kit.ensureAudio();
      if (window.PlatformBridge && PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(true);
      makeTextures(this);
      this.cameras.main.setBackgroundColor("#080612");
      this.cameras.main.fadeIn(200, 4, 6, 12);
      this.judgeY = H - 110;
      for (var i = 0; i < 4; i++) {
        this.add.rectangle(laneX(i), H / 2, 64, H, 0xff6ec7, 0.05).setStrokeStyle(1, 0xff6ec7, 0.2);
        this.add.image(laneX(i), this.judgeY, "pp-judge").setDepth(5);
        this.add.text(laneX(i), H - 48, KEYS[i], {
          fontFamily: "Segoe UI", fontSize: "22px", fontStyle: "bold", color: "#00e5ff"
        }).setOrigin(0.5).setDepth(6);
      }
      var self = this;
      KEY_CODES.forEach(function (k, idx) {
        self.input.keyboard.on("keydown-" + k, function () { self.hitLane(idx); });
      });
      this.input.on("pointerdown", function (p) {
        var best = 0, bd = 9999;
        for (var i = 0; i < 4; i++) {
          var d = Math.abs(p.x - laneX(i));
          if (d < bd) { bd = d; best = i; }
        }
        if (bd < 70) self.hitLane(best);
      });

      this.hudScore = this.add.text(16, 12, "SCORE 0", { fontFamily: "Segoe UI", fontSize: "16px", fontStyle: "bold", color: "#ff6ec7" }).setDepth(20);
      this.hudDanger = this.add.text(16, 36, "DANGER x1.00", { fontFamily: "Segoe UI", fontSize: "14px", fontStyle: "bold", color: "#f472b6" }).setDepth(20);
      this.hudCombo = this.add.text(W / 2, 16, "COMBO 0", { fontFamily: "Segoe UI", fontSize: "18px", color: "#00e5ff" }).setOrigin(0.5, 0).setDepth(20);
      this.hudAcc = this.add.text(W - 16, 12, "ACC 100%", { fontFamily: "Segoe UI", fontSize: "14px", color: "#94a3b8" }).setOrigin(1, 0).setDepth(20);
      this.hudSong = this.add.text(W - 16, 36, this.song.name + " · " + this.diff.label, { fontFamily: "Microsoft JhengHei", fontSize: "12px", color: "#a78bfa" }).setOrigin(1, 0).setDepth(20);
      this.judgeFlash = this.add.text(W / 2, this.judgeY - 50, "", { fontFamily: "Segoe UI", fontSize: "28px", fontStyle: "bold", color: "#ffd700" }).setOrigin(0.5).setDepth(25).setAlpha(0);
    }
    update(_t, delta) {
      if (!this.alive) return;
      var dt = delta / 1000;
      this.elapsed += dt;
      this.dangerMultiplier = Kit.calcDanger(this.elapsed);
      var threat = this.dangerMultiplier * this.diff.base;

      this.spawnAcc += dt;
      var beat = 60 / this.song.bpm;
      var every = Math.max(0.18, (beat / this.density) / Math.sqrt(threat));
      if (this.spawnAcc >= every && this.elapsed < this.songDur - 2) {
        this.spawnAcc = 0;
        this.spawnNote();
        if (Math.random() < 0.22 * threat) this.spawnNote();
      }

      var self = this;
      this.notes.slice().forEach(function (n) {
        if (!n.active) return;
        n.y += self.speed * threat * dt;
        if (n.y > self.judgeY + 90 && !n.hit) {
          n.hit = true;
          n.destroy();
          self.registerMiss();
        }
      });
      this.notes = this.notes.filter(function (n) { return n.active; });

      if (this.elapsed >= this.songDur) this.endSong();
      this.updateHud();
    }
    spawnNote() {
      var lane = Phaser.Math.Between(0, 3);
      var n = this.add.image(laneX(lane), -20, "pp-note").setDepth(8).setTint(lane % 2 ? 0xff6ec7 : 0x00e5ff);
      n.lane = lane;
      n.hit = false;
      this.notes.push(n);
    }
    hitLane(lane) {
      if (!this.alive) return;
      var best = null, bestAbs = 9999;
      for (var i = 0; i < this.notes.length; i++) {
        var n = this.notes[i];
        if (!n.active || n.hit || n.lane !== lane) continue;
        var a = Math.abs(n.y - this.judgeY);
        if (a < bestAbs) { bestAbs = a; best = n; }
      }
      if (!best || bestAbs > 150) {
        this.registerMiss();
        return;
      }
      best.hit = true;
      var perfect = bestAbs <= 55;
      best.destroy();
      if (perfect) {
        this.perfects += 1;
        this.combo += 1;
        this.score += Math.floor(300 * this.mult());
        this.flashJudge("PERFECT", "#ffd700");
        SFX.beat();
        Kit.neonBurst(this, laneX(lane), this.judgeY, 0xffd700, 16);
      } else {
        this.greats += 1;
        this.combo += 1;
        this.score += Math.floor(150 * this.mult());
        this.flashJudge("GREAT", "#00e5ff");
        SFX.score();
        Kit.neonBurst(this, laneX(lane), this.judgeY, 0x00e5ff, 14);
      }
      this.maxCombo = Math.max(this.maxCombo, this.combo);
      if (this.combo >= 50 && !this.fever) {
        this.fever = true;
        Kit.screenShake(this, 100, 0.012);
        SFX.confirm();
      }
    }
    mult() {
      var c = 1 + Math.min(2, this.combo * 0.04);
      return c * this.diff.scoreMult * (this.fever ? 2 : 1);
    }
    registerMiss() {
      this.misses += 1;
      this.combo = 0;
      this.fever = false;
      this.flashJudge("MISS", "#ff4466");
      SFX.hit();
      Kit.screenShake(this, 70, 0.01);
    }
    flashJudge(text, color) {
      this.judgeFlash.setText(text).setColor(color).setAlpha(1).setScale(0.7);
      this.tweens.add({ targets: this.judgeFlash, alpha: 0, scale: 1.2, duration: 320, ease: "Cubic.easeOut" });
    }
    updateHud() {
      var total = this.perfects + this.greats + this.misses;
      var acc = total ? ((this.perfects + this.greats * 0.6) / total) * 100 : 100;
      this.hudScore.setText("SCORE " + this.score.toLocaleString());
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
      this.hudCombo.setText((this.fever ? "FEVER " : "COMBO ") + this.combo);
      this.hudAcc.setText("ACC " + acc.toFixed(1) + "%");
    }
    endSong() {
      if (!this.alive) return;
      this.alive = false;
      var total = this.perfects + this.greats + this.misses;
      var acc = total ? ((this.perfects + this.greats * 0.6) / total) * 100 : 100;
      var grade = acc >= 95 ? "S" : acc >= 85 ? "A" : acc >= 70 ? "B" : acc >= 55 ? "C" : "D";
      var self = this;
      this.time.delayedCall(300, function () {
        self.scene.start("GameOverModal", {
          score: self.score, grade: grade, danger: self.dangerMultiplier, difficulty: self.diffKey, win: acc >= 70,
          message: self.song.name + " · ACC " + acc.toFixed(1) + "% · MaxCombo " + self.maxCombo,
          meta: { song: self.song.id, perfects: self.perfects, greats: self.greats, misses: self.misses, acc: acc }
        });
      });
    }
  }

  Kit.launchDemoGame({
    slug: "pulse-protocol",
    parent: "game-host",
    title: T("titleZh", "Pulse Protocol: Neon Beat"),
    subtitle: "四軌節拍協議 · Perfect 連擊 · Fever 狂熱",
    badge: "PULSE PROTOCOL",
    accent: 0xff6ec7,
    startScene: "SongSelectScene",
    helpHtml: "四軌 D/F/J/K 打擊。Perfect ±55ms、Great ±150ms。連擊達 50 進入 Fever。守住準確率換高評級。",
    makeTextures: makeTextures,
    briefFn: function (diff) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diff)];
      return [
        { title: "節拍節奏", body: "先把判定線站穩，再追連擊與 Fever。" },
        { title: "譜面密度", body: d.label + " 會拉高速度與密度，準確率是評級核心。" },
        { title: "狂熱壓力", body: "Miss 會斷連擊並重置 Fever。" }
      ];
    },
    GameScene: GameScene,
    extraScenes: [SongSelectScene]
  });
})();
