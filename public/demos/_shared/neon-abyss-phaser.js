/**
 * Neon Abyss: Void Runner — Phaser 3 rewrite
 */
(function () {
  "use strict";
  var Kit = window.RNFDemoPhaser;
  var W = Kit.W;
  var H = Kit.H;
  var SFX = Kit.SFX;
  var T = Kit.tFactory("neon-abyss-runner");

  var HELP_ZH =
    "戰場目標：三線無盡疾馳，用換道與衝刺維持連擊倍率。\n\n" +
    "操作：A/D 或方向鍵換線 · 空白鍵衝刺 · ESC/P 暫停\n\n" +
    "威脅：能量障壁優先換線；雷射先看預警；地雷會橫移。\n\n" +
    "資源：能量球維持連擊（最高×5），護盾吸收一次撞擊。";

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x22d3ee, 1);
    g.fillTriangle(24, 4, 44, 48, 4, 48);
    g.fillStyle(0xffffff, 0.35);
    g.fillCircle(24, 22, 6);
    g.generateTexture("na-ship", 48, 52);

    g.clear();
    g.fillStyle(0x67e8f9, 1);
    g.fillRoundedRect(0, 0, 88, 28, 6);
    g.generateTexture("na-barrier", 88, 28);

    g.clear();
    g.fillStyle(0xa78bfa, 1);
    g.fillRect(0, 0, 280, 10);
    g.generateTexture("na-laser", 280, 10);

    g.clear();
    g.fillStyle(0xf472b6, 1);
    g.fillCircle(14, 14, 14);
    g.generateTexture("na-mine", 28, 28);

    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(10, 10, 10);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(7, 7, 3);
    g.generateTexture("na-orb", 20, 20);

    g.clear();
    g.fillStyle(0xc084fc, 1);
    g.fillCircle(12, 12, 12);
    g.generateTexture("na-shield", 24, 24);
  }

  function laneX(lane) {
    return W * 0.28 + lane * W * 0.22;
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }

    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.alive = true;
      this.paused = false;
      this.score = 0;
      this.wave = 1;
      this.distance = 0;
      this.combo = 1;
      this.maxCombo = 1;
      this.hp = 3;
      this.shield = false;
      this.elapsed = 0;
      this.dangerMultiplier = 1;
      this.lane = 1;
      this.targetLane = 1;
      this.laneT = 1;
      this.dashCd = 0;
      this.dashActive = 0;
      this.invuln = 0;
      this.spawnAcc = 0;
      this.waveAcc = 0;
      this.scroll = this.diffKey === "casual" ? 220 : this.diffKey === "extreme" ? 390 : 300;
      this.spawnEvery = this.diffKey === "casual" ? 1.35 : this.diffKey === "extreme" ? 0.72 : 1.0;
      this.orbRate = this.diffKey === "casual" ? 0.55 : this.diffKey === "extreme" ? 0.32 : 0.42;
      this.comboDecay = this.diffKey === "casual" ? 0.18 : this.diffKey === "extreme" ? 0.38 : 0.28;
    }

    create() {
      Kit.ensureAudio();
      if (window.PlatformBridge && PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(true);
      this.cameras.main.setBackgroundColor("#040610");
      this.cameras.main.fadeIn(220, 4, 6, 12);
      makeTextures(this);

      this.bgGfx = this.add.graphics().setAlpha(0.2);
      this.drawLanes();

      this.player = this.add.image(laneX(1), H - 90, "na-ship").setDepth(10);
      this.shieldRing = this.add.circle(this.player.x, this.player.y, 34, 0xa78bfa, 0.0).setStrokeStyle(2, 0xc084fc, 0.9).setDepth(9).setVisible(false);

      this.hazards = this.add.group();
      this.orbs = this.add.group();
      this.pickups = this.add.group();

      var self = this;
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys("A,D,SPACE,ESC,P");
      this.input.keyboard.on("keydown-LEFT", function () { self.moveLane(-1); });
      this.input.keyboard.on("keydown-RIGHT", function () { self.moveLane(1); });
      this.input.keyboard.on("keydown-A", function () { self.moveLane(-1); });
      this.input.keyboard.on("keydown-D", function () { self.moveLane(1); });
      this.input.keyboard.on("keydown-SPACE", this.tryDash, this);
      this.input.keyboard.on("keydown-ESC", this.togglePause, this);
      this.input.keyboard.on("keydown-P", this.togglePause, this);

      this.input.on("pointerup", function (p) {
        if (!self.alive || self.paused) return;
        var dx = p.upX - p.downX;
        var dy = p.upY - p.downY;
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) self.moveLane(dx > 0 ? 1 : -1);
        else if (Math.abs(dx) < 18 && Math.abs(dy) < 18) self.tryDash();
      });

      this.hudScore = this.add.text(16, 12, "SCORE 0", { fontFamily: "Segoe UI", fontSize: "16px", fontStyle: "bold", color: "#67e8f9" }).setDepth(30);
      this.hudDanger = this.add.text(16, 36, "DANGER x1.00", { fontFamily: "Segoe UI", fontSize: "14px", fontStyle: "bold", color: "#f472b6" }).setDepth(30);
      this.hudWave = this.add.text(W - 16, 12, "WAVE 1", { fontFamily: "Segoe UI", fontSize: "14px", color: "#a78bfa" }).setOrigin(1, 0).setDepth(30);
      this.hudHp = this.add.text(W - 16, 36, "HP 3", { fontFamily: "Segoe UI", fontSize: "14px", color: "#34d399" }).setOrigin(1, 0).setDepth(30);
      this.hudCombo = this.add.text(W / 2, 12, "COMBO ×1.0", { fontFamily: "Segoe UI", fontSize: "14px", color: "#fbbf24" }).setOrigin(0.5, 0).setDepth(30);
      this.hudDiff = this.add.text(W / 2, 34, this.diff.label, { fontFamily: "Microsoft JhengHei, Segoe UI", fontSize: "12px", color: this.diff.color }).setOrigin(0.5, 0).setDepth(30);
      this.pauseTxt = this.add.text(W / 2, H / 2, "⏸ PAUSED", {
        fontFamily: "Segoe UI", fontSize: "36px", fontStyle: "bold", color: "#e2e8f0"
      }).setOrigin(0.5).setDepth(50).setVisible(false);

      this.spawnAcc = this.spawnEvery * 0.4;
    }

    drawLanes() {
      this.bgGfx.clear();
      this.bgGfx.lineStyle(2, 0x22d3ee, 0.35);
      for (var i = 0; i < 3; i++) {
        var x = laneX(i);
        this.bgGfx.lineBetween(x, 0, x, H);
      }
    }

    moveLane(dir) {
      this.targetLane = Phaser.Math.Clamp(this.targetLane + dir, 0, 2);
      this.laneT = 0;
      SFX.click();
    }

    tryDash() {
      if (!this.alive || this.paused || this.dashCd > 0 || this.dashActive > 0) return;
      this.dashActive = 0.28;
      this.dashCd = 2.1;
      SFX.dash();
      Kit.screenShake(this, 80, 0.008);
      Kit.neonBurst(this, this.player.x, this.player.y, 0x22d3ee, 18);
    }

    togglePause() {
      if (!this.alive) return;
      this.paused = !this.paused;
      this.pauseTxt.setVisible(this.paused);
    }

    update(_t, delta) {
      if (!this.alive || this.paused) return;
      var dt = delta / 1000;
      this.elapsed += dt;
      this.dangerMultiplier = Kit.calcDanger(this.elapsed);
      var threat = this.dangerMultiplier * this.diff.base;

      this.distance += this.scroll * threat * dt * 0.05;
      this.score += Math.floor(8 * this.combo * this.diff.scoreMult * threat * dt);
      this.combo = Math.max(1, this.combo - this.comboDecay * dt);
      this.dashCd = Math.max(0, this.dashCd - dt);
      this.dashActive = Math.max(0, this.dashActive - dt);
      this.invuln = Math.max(0, this.invuln - dt);

      if (this.laneT < 1) {
        this.laneT = Math.min(1, this.laneT + dt / 0.28);
        var from = laneX(this.lane);
        var to = laneX(this.targetLane);
        this.player.x = Phaser.Math.Linear(from, to, Phaser.Math.Easing.Cubic.Out(this.laneT));
        if (this.laneT >= 1) this.lane = this.targetLane;
      } else {
        this.player.x = laneX(this.lane);
      }
      this.shieldRing.setPosition(this.player.x, this.player.y).setVisible(this.shield);

      this.spawnAcc += dt;
      var every = Math.max(0.35, this.spawnEvery / Math.sqrt(threat));
      if (this.spawnAcc >= every) {
        this.spawnAcc = 0;
        this.spawnHazard(threat);
      }

      this.waveAcc += dt;
      if (this.waveAcc >= Math.max(12, 18 - threat)) {
        this.waveAcc = 0;
        this.wave += 1;
        Kit.neonBurst(this, W / 2, 80, 0xa78bfa, 20);
        SFX.confirm();
        if (this.wave % 5 === 0) this.spawnBoss();
      }

      this.tickHazards(dt, threat);
      this.tickOrbs(dt, threat);
      this.updateHud();
    }

    spawnHazard(threat) {
      var lane = Phaser.Math.Between(0, 2);
      var r = Math.random();
      var y = -40;
      var spd = this.scroll * (0.85 + threat * 0.25);
      if (r < 0.42) {
        var b = this.hazards.create(laneX(lane), y, "na-barrier");
        b.setData({ type: "barrier", lane: lane, spd: spd });
      } else if (r < 0.72) {
        var lanes = Math.random() < 0.45 ? [lane] : [lane, (lane + 1) % 3];
        lanes.forEach(function (l) {
          var laser = this.hazards.create(laneX(l), y, "na-laser");
          laser.setDisplaySize(100, 8).setTint(0xa78bfa).setAlpha(0.35);
          laser.setData({ type: "laser", lane: l, spd: spd, warn: 0.9, active: false });
        }, this);
      } else {
        var m = this.hazards.create(laneX(lane), y, "na-mine");
        m.setData({ type: "mine", lane: lane, spd: spd, vx: (Math.random() > 0.5 ? 1 : -1) * (70 + threat * 20) });
      }
      if (Math.random() < this.orbRate) {
        var o = this.orbs.create(laneX(Phaser.Math.Between(0, 2)), y - 30, "na-orb");
        o.setData({ spd: spd * 0.95 });
        o.setBlendMode(Phaser.BlendModes.ADD);
      }
      if (!this.shield && Math.random() < 0.07) {
        var s = this.pickups.create(laneX(Phaser.Math.Between(0, 2)), y - 50, "na-shield");
        s.setData({ spd: spd * 0.9 });
      }
    }

    spawnBoss() {
      for (var i = 0; i < 6; i++) {
        var l = i % 3;
        var b = this.hazards.create(laneX(l), -80 - i * 70, "na-barrier");
        b.setData({ type: "barrier", lane: l, spd: this.scroll * 1.2 });
      }
      Kit.screenShake(this, 140, 0.015);
      SFX.explode();
    }

    tickHazards(dt, threat) {
      var self = this;
      this.hazards.getChildren().slice().forEach(function (h) {
        if (!h.active) return;
        var d = h.data.values;
        if (d.type === "laser" && !d.active) {
          d.warn -= dt;
          h.setAlpha(0.25 + Math.sin(self.elapsed * 18) * 0.2);
          if (d.warn <= 0) {
            d.active = true;
            h.setAlpha(1);
            h.setTint(0xe879f9);
          }
        }
        h.y += d.spd * dt;
        if (d.type === "mine") {
          h.x += d.vx * dt;
          if (h.x < laneX(0) - 20 || h.x > laneX(2) + 20) d.vx *= -1;
        }
        if (h.y > H + 60) {
          h.destroy();
          return;
        }
        if (self.invuln > 0 || self.dashActive > 0) return;
        var hit = false;
        if (d.type === "barrier" && d.lane === self.lane && Math.abs(h.y - self.player.y) < 36) hit = true;
        if (d.type === "laser" && d.active && d.lane === self.lane && Math.abs(h.y - self.player.y) < 22) hit = true;
        if (d.type === "mine" && Phaser.Math.Distance.Between(h.x, h.y, self.player.x, self.player.y) < 30) hit = true;
        if (hit) {
          h.destroy();
          self.takeHit();
        }
      });
    }

    tickOrbs(dt, threat) {
      var self = this;
      this.orbs.getChildren().slice().forEach(function (o) {
        if (!o.active) return;
        o.y += (o.getData("spd") || self.scroll) * dt;
        o.rotation += dt * 3;
        if (o.y > H + 40) { o.destroy(); return; }
        if (Phaser.Math.Distance.Between(o.x, o.y, self.player.x, self.player.y) < 34) {
          o.destroy();
          self.combo = Math.min(5, self.combo + 0.35);
          self.maxCombo = Math.max(self.maxCombo, self.combo);
          self.score += Math.floor(80 * self.combo * self.diff.scoreMult);
          SFX.score();
          Kit.neonBurst(self, self.player.x, self.player.y, 0xfbbf24, 16);
        }
      });
      this.pickups.getChildren().slice().forEach(function (p) {
        if (!p.active) return;
        p.y += (p.getData("spd") || self.scroll) * dt;
        p.rotation += dt * 2;
        if (p.y > H + 40) { p.destroy(); return; }
        if (Phaser.Math.Distance.Between(p.x, p.y, self.player.x, self.player.y) < 36) {
          p.destroy();
          self.shield = true;
          SFX.confirm();
          Kit.neonBurst(self, self.player.x, self.player.y, 0xc084fc, 18);
        }
      });
    }

    takeHit() {
      if (this.shield) {
        this.shield = false;
        this.invuln = 0.8;
        SFX.hit();
        Kit.screenShake(this, 90, 0.012);
        Kit.neonBurst(this, this.player.x, this.player.y, 0xa78bfa, 20);
        return;
      }
      this.hp -= 1;
      this.combo = 1;
      this.invuln = 1.0;
      SFX.hit();
      Kit.screenShake(this, 120, 0.018);
      Kit.neonBurst(this, this.player.x, this.player.y, 0xf472b6, 24);
      if (this.hp <= 0) this.endRun(false);
    }

    updateHud() {
      this.hudScore.setText("SCORE " + this.score.toLocaleString());
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
      this.hudWave.setText("WAVE " + this.wave);
      this.hudHp.setText(this.shield ? "HP " + this.hp + " +SH" : "HP " + this.hp);
      this.hudCombo.setText("COMBO ×" + this.combo.toFixed(1));
    }

    endRun() {
      if (!this.alive) return;
      this.alive = false;
      SFX.explode();
      Kit.neonBurst(this, this.player.x, this.player.y, 0xf472b6, 28);
      var grade = this.score >= 50000 ? "S" : this.score >= 30000 ? "A" : this.score >= 15000 ? "B" : this.score >= 5000 ? "C" : "D";
      var self = this;
      this.time.delayedCall(450, function () {
        self.scene.start("GameOverModal", {
          score: self.score,
          grade: grade,
          danger: self.dangerMultiplier,
          difficulty: self.diffKey,
          wave: self.wave,
          win: false,
          message: "撐過 " + self.wave + " 波 · 最高連擊 ×" + self.maxCombo.toFixed(1),
          meta: { wave: self.wave, maxCombo: self.maxCombo, distance: Math.floor(self.distance) }
        });
      });
    }
  }

  Kit.launchDemoGame({
    slug: "neon-abyss-runner",
    parent: "game-host",
    title: T("titleZh", "Neon Abyss: Void Runner"),
    subtitle: "三線無盡疾馳 · 維持連擊 · 閃避深淵障壁",
    badge: T("badge", "VOID RUNNER · ENDLESS"),
    accent: 0x22d3ee,
    helpHtml: HELP_ZH,
    makeTextures: makeTextures,
    briefFn: function (diffKey) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diffKey)];
      return [
        { title: "航道節奏", body: "三線疾馳，速度與生成率隨 " + d.label + " 與 DANGER 上升。" },
        { title: "連擊經濟", body: "能量球維持倍率（最高×5），漏球比一次撞擊更傷長期分。" },
        { title: "深淵壓力", body: "衝刺留給躲不掉的牆；每 5 波是分數分水嶺。" }
      ];
    },
    GameScene: GameScene
  });
})();
