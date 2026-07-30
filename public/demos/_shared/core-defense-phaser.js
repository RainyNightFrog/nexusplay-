/**
 * CoreDefense: Mindustry X — Phaser 3
 * 工業造型砲塔／異形敵機／彈道與爆炸特效
 */
(function () {
  "use strict";
  var Kit = window.RNFDemoPhaser;
  var W = Kit.W, H = Kit.H, SFX = Kit.SFX;
  var COLS = 12, ROWS = 8, TILE = 48;
  var OX, OY;

  var TOWERS = [
    { id: "gun", name: "機槍塔", cost: 40, dmg: 6, rate: 0.18, range: 130, color: 0xff8c5a, tex: "cd-tw-gun" },
    { id: "laser", name: "雷射塔", cost: 85, dmg: 14, rate: 0.5, range: 170, color: 0x67e8f9, tex: "cd-tw-laser" },
    { id: "frost", name: "冰凍塔", cost: 95, dmg: 5, rate: 0.38, range: 145, color: 0x93c5fd, tex: "cd-tw-frost", slow: 0.45 },
    { id: "splash", name: "爆破塔", cost: 120, dmg: 20, rate: 0.8, range: 125, color: 0xf472b6, tex: "cd-tw-splash", aoe: 58 }
  ];

  var ENEMY_KINDS = [
    { id: "scout", tex: "cd-en-scout", hp: 20, spd: 1.75, dmg: 7, ore: 5, score: 40, tint: 0xf87171 },
    { id: "swarm", tex: "cd-en-swarm", hp: 14, spd: 2.15, dmg: 5, ore: 4, score: 30, tint: 0xfb923c },
    { id: "armor", tex: "cd-en-armor", hp: 48, spd: 1.15, dmg: 10, ore: 10, score: 70, tint: 0xa78bfa },
    { id: "elite", tex: "cd-en-elite", hp: 110, spd: 1.05, dmg: 18, ore: 22, score: 160, tint: 0xfbbf24 },
    { id: "titan", tex: "cd-en-titan", hp: 220, spd: 0.85, dmg: 28, ore: 40, score: 320, tint: 0xff6b6b }
  ];

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });

    // 地磚
    g.clear();
    g.fillStyle(0x1c1410, 1);
    g.fillRoundedRect(0, 0, TILE - 2, TILE - 2, 4);
    g.lineStyle(1, 0x3f2a20, 1);
    g.strokeRoundedRect(1, 1, TILE - 4, TILE - 4, 4);
    g.fillStyle(0xff8c5a, 0.08);
    g.fillRect(8, 8, TILE - 18, TILE - 18);
    g.generateTexture("cd-tile", TILE - 2, TILE - 2);

    // 路徑磚
    g.clear();
    g.fillStyle(0x2a1810, 1);
    g.fillRoundedRect(0, 0, TILE - 8, TILE - 8, 3);
    g.lineStyle(1, 0xff8c5a, 0.45);
    g.strokeRoundedRect(1, 1, TILE - 10, TILE - 10, 3);
    g.fillStyle(0xff8c5a, 0.2);
    g.fillCircle((TILE - 8) / 2, (TILE - 8) / 2, 4);
    g.generateTexture("cd-path", TILE - 8, TILE - 8);

    // 核心反應爐
    g.clear();
    g.fillStyle(0x3f1d0f, 1);
    g.fillRoundedRect(4, 4, 40, 40, 6);
    g.lineStyle(2, 0xff8c5a, 1);
    g.strokeRoundedRect(4, 4, 40, 40, 6);
    g.fillStyle(0xff8c5a, 1);
    g.fillCircle(24, 24, 12);
    g.fillStyle(0xfde68a, 0.9);
    g.fillCircle(24, 24, 6);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(20, 20, 2);
    g.generateTexture("cd-core", 48, 48);

    // —— 砲塔 ——
    // 機槍：底座 + 雙管
    g.clear();
    g.fillStyle(0x292524, 1); g.fillCircle(20, 20, 16);
    g.lineStyle(2, 0xff8c5a, 1); g.strokeCircle(20, 20, 16);
    g.fillStyle(0xff8c5a, 1); g.fillRoundedRect(18, 4, 5, 18, 2); g.fillRoundedRect(25, 6, 4, 16, 2);
    g.fillStyle(0xfed7aa, 1); g.fillCircle(20, 22, 6);
    g.generateTexture("cd-tw-gun", 40, 40);

    // 雷射：晶片塔
    g.clear();
    g.fillStyle(0x164e63, 1); g.fillRoundedRect(6, 10, 28, 22, 4);
    g.lineStyle(2, 0x67e8f9, 1); g.strokeRoundedRect(6, 10, 28, 22, 4);
    g.fillStyle(0x67e8f9, 1); g.fillTriangle(20, 2, 28, 14, 12, 14);
    g.fillStyle(0xecfeff, 0.9); g.fillCircle(20, 20, 5);
    g.generateTexture("cd-tw-laser", 40, 40);

    // 冰凍：六角晶體
    g.clear();
    g.fillStyle(0x1e3a5f, 1); g.fillCircle(20, 20, 15);
    g.lineStyle(2, 0x93c5fd, 1); g.strokeCircle(20, 20, 15);
    g.fillStyle(0xbfdbfe, 1);
    g.fillTriangle(20, 4, 28, 18, 12, 18);
    g.fillTriangle(20, 36, 28, 22, 12, 22);
    g.fillStyle(0xffffff, 0.85); g.fillCircle(20, 20, 4);
    g.generateTexture("cd-tw-frost", 40, 40);

    // 爆破：榴彈砲
    g.clear();
    g.fillStyle(0x4a044e, 1); g.fillRoundedRect(4, 12, 32, 20, 5);
    g.lineStyle(2, 0xf472b6, 1); g.strokeRoundedRect(4, 12, 32, 20, 5);
    g.fillStyle(0xf472b6, 1); g.fillCircle(20, 14, 10);
    g.fillStyle(0xfce7f3, 1); g.fillCircle(20, 14, 4);
    g.fillStyle(0xfb7185, 1); g.fillRect(28, 8, 10, 6);
    g.generateTexture("cd-tw-splash", 40, 40);

    // —— 敵人 ——
    // 斥候：尖三角艦
    g.clear();
    g.fillStyle(0xf87171, 1); g.fillTriangle(16, 2, 30, 28, 2, 28);
    g.fillStyle(0xfecaca, 0.8); g.fillCircle(16, 16, 4);
    g.lineStyle(1, 0x7f1d1d, 1); g.strokeTriangle(16, 2, 30, 28, 2, 28);
    g.generateTexture("cd-en-scout", 32, 32);

    // 蟲群：小菱形
    g.clear();
    g.fillStyle(0xfb923c, 1); g.fillTriangle(14, 0, 28, 14, 14, 28); g.fillTriangle(14, 0, 0, 14, 14, 28);
    g.fillStyle(0xffedd5, 1); g.fillCircle(14, 14, 3);
    g.generateTexture("cd-en-swarm", 28, 28);

    // 重甲：方塊裝甲
    g.clear();
    g.fillStyle(0x5b21b6, 1); g.fillRoundedRect(2, 6, 32, 24, 4);
    g.lineStyle(2, 0xc4b5fd, 1); g.strokeRoundedRect(2, 6, 32, 24, 4);
    g.fillStyle(0xa78bfa, 1); g.fillRect(8, 10, 8, 16); g.fillRect(20, 10, 8, 16);
    g.fillStyle(0xede9fe, 1); g.fillCircle(18, 18, 4);
    g.generateTexture("cd-en-armor", 36, 36);

    // 精英：帶翼
    g.clear();
    g.fillStyle(0xb45309, 1); g.fillTriangle(20, 2, 36, 30, 4, 30);
    g.fillStyle(0xfbbf24, 1); g.fillTriangle(6, 14, 20, 8, 8, 28); g.fillTriangle(34, 14, 20, 8, 32, 28);
    g.fillStyle(0xfef3c7, 1); g.fillCircle(20, 18, 5);
    g.lineStyle(2, 0xf59e0b, 1); g.strokeTriangle(20, 2, 36, 30, 4, 30);
    g.generateTexture("cd-en-elite", 40, 40);

    // 泰坦：大型多角
    g.clear();
    g.fillStyle(0x7f1d1d, 1); g.fillRoundedRect(4, 8, 44, 36, 6);
    g.lineStyle(3, 0xff6b6b, 1); g.strokeRoundedRect(4, 8, 44, 36, 6);
    g.fillStyle(0xff6b6b, 1); g.fillCircle(26, 26, 12);
    g.fillStyle(0xfef2f2, 1); g.fillCircle(26, 26, 5);
    g.fillStyle(0xfb7185, 1); g.fillTriangle(26, 0, 34, 12, 18, 12);
    g.generateTexture("cd-en-titan", 52, 52);

    // 子彈／特效粒子
    g.clear(); g.fillStyle(0xffedd5, 1); g.fillCircle(4, 4, 4); g.generateTexture("cd-spark", 8, 8);
    g.clear(); g.fillStyle(0xff8c5a, 1); g.fillCircle(3, 3, 3); g.generateTexture("cd-bullet", 6, 6);
    g.clear(); g.fillStyle(0x67e8f9, 1); g.fillRect(0, 0, 10, 4); g.generateTexture("cd-beam", 10, 4);
    g.clear(); g.fillStyle(0x93c5fd, 1); g.fillTriangle(6, 0, 12, 12, 0, 12); g.generateTexture("cd-ice", 12, 12);
    g.clear(); g.fillStyle(0xf472b6, 1); g.fillCircle(8, 8, 8); g.generateTexture("cd-boom", 16, 16);

    g.destroy();
  }

  function floatText(scene, x, y, msg, color) {
    var t = scene.add.text(x, y, msg, {
      fontFamily: "Segoe UI", fontSize: "13px", fontStyle: "bold", color: color || "#fff7ed"
    }).setOrigin(0.5).setDepth(50);
    scene.tweens.add({
      targets: t, y: y - 34, alpha: 0, scale: 1.2, duration: 480, ease: "Cubic.easeOut",
      onComplete: function () { t.destroy(); }
    });
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }
    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.coreHp = this.diffKey === "casual" ? 160 : this.diffKey === "extreme" ? 100 : 130;
      this.coreMax = this.coreHp;
      this.ore = this.diffKey === "casual" ? 160 : this.diffKey === "extreme" ? 100 : 130;
      this.hpMul = this.diffKey === "casual" ? 0.85 : this.diffKey === "extreme" ? 1.4 : 1;
      this.alive = true;
      this.score = 0;
      this.wave = 0;
      this.kills = 0;
      this.mult = 1;
      this.elapsed = 0;
      this.dangerMultiplier = 1;
      this.selected = 0;
      this.grid = [];
      this.waveActive = false;
      this.spawnLeft = 0;
      this.spawnAcc = 0;
      this.path = [];
      this.selectBtns = [];
      this.autoWave = false;
      this.speedMul = 1;
      this.gameStarted = false;
    }
    create() {
      Kit.ensureAudio();
      if (window.PlatformBridge && PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(true);
      makeTextures(this);
      this.time.timeScale = 1;
      this.speedMul = 1;
      OX = (W - COLS * TILE) / 2 + 40;
      OY = (H - ROWS * TILE) / 2 + 20;
      this.cameras.main.setBackgroundColor("#0c0706");
      this.cameras.main.fadeIn(200, 4, 6, 12);

      // 背景工業氛圍
      for (var i = 0; i < 40; i++) {
        var star = this.add.circle(
          Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
          Phaser.Math.Between(1, 2), 0xff8c5a, Phaser.Math.FloatBetween(0.08, 0.28)
        ).setDepth(0);
        this.tweens.add({
          targets: star, alpha: 0.05, duration: Phaser.Math.Between(800, 1800),
          yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });
      }

      this.buildPath();
      var self = this;
      for (var x = 0; x < COLS; x++) {
        this.grid[x] = [];
        for (var y = 0; y < ROWS; y++) {
          var img = this.add.image(OX + x * TILE + TILE / 2, OY + y * TILE + TILE / 2, "cd-tile")
            .setInteractive({ useHandCursor: true }).setAlpha(0.92).setDepth(1);
          img.gx = x; img.gy = y; img.tower = null;
          img.on("pointerdown", function () { self.tryBuild(this); });
          img.on("pointerover", function () {
            if (!this.tower) this.setTint(0xffccaa);
          });
          img.on("pointerout", function () { this.clearTint(); });
          this.grid[x][y] = img;
        }
      }
      this.path.forEach(function (p) {
        self.add.image(OX + p.x * TILE + TILE / 2, OY + p.y * TILE + TILE / 2, "cd-path").setDepth(2).setAlpha(0.95);
      });

      var coreCell = this.path[this.path.length - 1];
      this.core = this.add.image(
        OX + coreCell.x * TILE + TILE / 2,
        OY + coreCell.y * TILE + TILE / 2,
        "cd-core"
      ).setDepth(8);
      this.coreGlow = this.add.circle(this.core.x, this.core.y, 28, 0xff8c5a, 0.22).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [this.core, this.coreGlow], scale: 1.08, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
      });

      this.enemies = this.add.group();
      this.fxLayer = this.add.container(0, 0).setDepth(25);

      this.hud = this.add.text(12, 8, "", {
        fontFamily: "Segoe UI", fontSize: "14px", fontStyle: "bold", color: "#ff8c5a"
      }).setDepth(30);
      this.hudDanger = this.add.text(12, 30, "DANGER x1.00", {
        fontFamily: "Segoe UI", fontSize: "13px", fontStyle: "bold", color: "#f472b6"
      }).setDepth(30);
      this.hudTip = this.add.text(W / 2, H - 14, "點左側選塔 → 點空地建造 · 路徑不能蓋 · 開波後才會產礦", {
        fontFamily: "Microsoft JhengHei", fontSize: "12px", color: "#a8a29e"
      }).setOrigin(0.5, 1).setDepth(30);

      TOWERS.forEach(function (t, i) {
        var btn = Kit.makeMenuButton(self, 78, 78 + i * 58, t.name + " $" + t.cost, t.color, function () {
          self.selected = i;
          self.refreshSelect();
          SFX.click();
        }, 148);
        self.selectBtns.push(btn);
      });
      this.refreshSelect();

      Kit.makeMenuButton(this, W - 100, 36, "開波 ▶", 0xff8c5a, function () { self.startWave(); }, 150);
      this.btnAuto = Kit.makeMenuButton(this, W - 100, 92, "自動開波：關", 0xfbbf24, function () {
        self.autoWave = !self.autoWave;
        self.btnAuto.txt.setText(self.autoWave ? "自動開波：開" : "自動開波：關");
        self.btnAuto.bg.setFillStyle(0xfbbf24, self.autoWave ? 0.45 : 0.22);
        SFX.click();
        if (self.autoWave && self.gameStarted && !self.waveActive && self.wave < 20) {
          self.startWave();
        }
      }, 150);
      this.btnSpeed = Kit.makeMenuButton(this, W - 100, 148, "加速 ×1", 0x67e8f9, function () {
        self.speedMul = self.speedMul >= 3 ? 1 : self.speedMul + 1;
        self.btnSpeed.txt.setText("加速 ×" + self.speedMul);
        self.btnSpeed.bg.setFillStyle(0x67e8f9, self.speedMul > 1 ? 0.45 : 0.22);
        self.time.timeScale = self.speedMul;
        SFX.click();
      }, 150);
    }

    refreshSelect() {
      var self = this;
      this.selectBtns.forEach(function (btn, i) {
        var on = i === self.selected;
        btn.bg.setFillStyle(TOWERS[i].color, on ? 0.45 : 0.18);
        btn.bg.setStrokeStyle(2, TOWERS[i].color, on ? 1 : 0.55);
        btn.txt.setScale(on ? 1.05 : 1);
      });
    }

    buildPath() {
      this.path = [];
      for (var x = 0; x < COLS; x++) this.path.push({ x: x, y: 1 });
      for (var y = 2; y < ROWS - 1; y++) this.path.push({ x: COLS - 1, y: y });
      for (var x2 = COLS - 2; x2 >= 5; x2--) this.path.push({ x: x2, y: ROWS - 2 });
    }

    tryBuild(tile) {
      if (!this.alive || tile.tower) return;
      for (var i = 0; i < this.path.length; i++) {
        if (this.path[i].x === tile.gx && this.path[i].y === tile.gy) {
          floatText(this, tile.x, tile.y, "路徑禁建", "#f87171");
          return;
        }
      }
      var def = TOWERS[this.selected];
      if (this.ore < def.cost) {
        floatText(this, tile.x, tile.y, "礦石不足", "#fbbf24");
        return;
      }
      this.ore -= def.cost;
      var spr = this.add.image(tile.x, tile.y, def.tex).setDepth(10);
      var ring = this.add.circle(tile.x, tile.y, 18, def.color, 0.15).setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
      tile.tower = { def: def, spr: spr, ring: ring, cd: 0, angle: -Math.PI / 2 };
      floatText(this, tile.x, tile.y - 18, def.name, "#fde68a");
    }

    startWave() {
      if (!this.alive || this.waveActive) return;
      if (this.wave >= 20) return;
      this.gameStarted = true;
      this.wave += 1;
      this.waveActive = true;
      this.spawnLeft = 10 + this.wave * 2 + (this.wave >= 10 ? 4 : 0);
      this.spawnAcc = 0;
      floatText(this, W / 2, 70, "WAVE " + this.wave, "#ff8c5a");
      this.hudTip.setText(this.wave % 5 === 0 ? "⚠ 精英／泰坦混編波次" : "敵軍壓線中 — 守住核心");
    }

    pickEnemyKind() {
      var w = this.wave;
      if (w >= 15 && this.spawnLeft <= 1) return ENEMY_KINDS[4]; // titan
      if (w % 4 === 0 && this.spawnLeft <= 2) return ENEMY_KINDS[3]; // elite
      if (w >= 6 && Math.random() < 0.28) return ENEMY_KINDS[2]; // armor
      if (w >= 3 && Math.random() < 0.35) return ENEMY_KINDS[1]; // swarm
      return ENEMY_KINDS[0];
    }

    spawnEnemy() {
      var kind = this.pickEnemyKind();
      var start = this.path[0];
      var e = this.add.image(
        OX + start.x * TILE + TILE / 2,
        OY + start.y * TILE + TILE / 2,
        kind.tex
      ).setDepth(12);
      var hp = Math.floor(kind.hp * this.hpMul * (1 + this.wave * 0.1) * this.dangerMultiplier);
      e.setData({
        hp: hp,
        maxHp: hp,
        idx: 0,
        t: 0,
        spd: kind.spd,
        slow: 1,
        kind: kind,
        hitFlash: 0
      });
      // HP 條
      var barBg = this.add.rectangle(e.x, e.y - 18, 28, 4, 0x000000, 0.55).setDepth(13);
      var bar = this.add.rectangle(e.x - 14, e.y - 18, 28, 4, kind.tint, 1).setOrigin(0, 0.5).setDepth(14);
      e.setData("barBg", barBg);
      e.setData("bar", bar);
      this.enemies.add(e);
    }

    updateEnemyBars(e) {
      var d = e.data.values;
      var bar = d.bar;
      var barBg = d.barBg;
      if (barBg && barBg.active) { barBg.x = e.x; barBg.y = e.y - 18; }
      if (bar && bar.active) {
        bar.x = e.x - 14;
        bar.y = e.y - 18;
        bar.width = Math.max(0, 28 * (d.hp / d.maxHp));
      }
    }

    destroyEnemyFx(e) {
      var d = e.data.values;
      if (d.bar) d.bar.destroy();
      if (d.barBg) d.barBg.destroy();
    }

    update(_t, delta) {
      if (!this.alive) return;
      var dt = Math.min(0.05, delta / 1000) * (this.speedMul || 1);
      this.elapsed += dt;
      this.dangerMultiplier = Kit.calcDanger(this.elapsed);
      var threat = this.dangerMultiplier * this.diff.base;
      // 未開第一波前不產礦，避免開局掛機刷錢
      if (this.gameStarted) {
        this.ore += 1.2 * dt;
      }

      // 核心血量脈動顏色
      var hpRatio = this.coreHp / this.coreMax;
      this.coreGlow.setAlpha(0.15 + (1 - hpRatio) * 0.35);
      if (hpRatio < 0.35) this.core.setTint(0xff6b6b);
      else this.core.clearTint();

      if (this.waveActive) {
        this.spawnAcc += dt;
        if (this.spawnLeft > 0 && this.spawnAcc >= Math.max(0.22, 0.65 / threat)) {
          this.spawnAcc = 0;
          this.spawnLeft -= 1;
          this.spawnEnemy();
          if (Math.random() < 0.25 && this.spawnLeft > 0) {
            this.spawnLeft -= 1;
            this.spawnEnemy();
          }
        }
      }

      var self = this;
      this.enemies.getChildren().slice().forEach(function (e) {
        if (!e.active) return;
        var d = e.data.values;
        d.t += d.spd * d.slow * threat * dt;
        while (d.t >= 1 && d.idx < self.path.length - 1) { d.t -= 1; d.idx += 1; }
        var a = self.path[d.idx];
        var b = self.path[Math.min(d.idx + 1, self.path.length - 1)];
        var ax = OX + a.x * TILE + TILE / 2;
        var ay = OY + a.y * TILE + TILE / 2;
        var bx = OX + b.x * TILE + TILE / 2;
        var by = OY + b.y * TILE + TILE / 2;
        e.x = Phaser.Math.Linear(ax, bx, d.t);
        e.y = Phaser.Math.Linear(ay, by, d.t);
        e.rotation = Phaser.Math.Angle.Between(ax, ay, bx, by) + Math.PI / 2;
        if (d.hitFlash > 0) {
          d.hitFlash -= dt;
          e.setTint(0xffffff);
        } else {
          e.clearTint();
        }
        d.slow = Math.min(1, d.slow + dt * 0.35);
        self.updateEnemyBars(e);

        if (d.idx >= self.path.length - 1 && d.t >= 1) {
          self.coreHp -= d.kind.dmg;
          floatText(self, self.core.x, self.core.y - 24, "-" + d.kind.dmg, "#fb7185");
          self.destroyEnemyFx(e);
          e.destroy();
          self.mult = 1;
          if (self.coreHp <= 0) self.endRun(false);
        }
      });

      for (var x = 0; x < COLS; x++) {
        for (var y = 0; y < ROWS; y++) {
          var tile = this.grid[x][y];
          if (!tile.tower) continue;
          var tw = tile.tower;
          tw.cd -= dt;
          var target = null;
          this.enemies.getChildren().forEach(function (e) {
            if (!e.active) return;
            var dist = Phaser.Math.Distance.Between(tile.x, tile.y, e.x, e.y);
            if (dist <= tw.def.range) {
              if (!target || e.data.values.idx >= target.data.values.idx) target = e;
            }
          });
          if (target) {
            var ang = Phaser.Math.Angle.Between(tile.x, tile.y, target.x, target.y);
            tw.angle = ang;
            tw.spr.setRotation(ang + Math.PI / 2);
            if (tw.cd <= 0) {
              tw.cd = tw.def.rate / Math.sqrt(threat);
              this.fire(tile, target, tw.def, ang);
            }
          }
        }
      }

      if (this.waveActive && this.spawnLeft <= 0 && this.enemies.countActive(true) === 0) {
        this.waveActive = false;
        this.ore += 30 + this.wave * 4;
        this.score += Math.floor(350 * this.wave * this.mult * this.diff.scoreMult);
        floatText(this, W / 2, 90, "波次清除 +" + (30 + this.wave * 4) + " 礦", "#fde68a");
        this.hudTip.setText("波次結束 — 補強火力後再開下一波");
        if (this.wave >= 20) {
          this.endRun(true);
        } else if (this.autoWave) {
          var selfAuto = this;
          this.time.delayedCall(900, function () {
            if (selfAuto.alive && selfAuto.autoWave && !selfAuto.waveActive) selfAuto.startWave();
          });
        }
      }

      this.hud.setText(
        "CORE " + Math.ceil(this.coreHp) + "/" + this.coreMax +
        "  ·  ORE " + Math.floor(this.ore) +
        "  ·  WAVE " + this.wave + "/20" +
        "  ·  x" + this.mult.toFixed(1) +
        "  ·  ×" + this.speedMul +
        "  ·  KILL " + this.kills
      );
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
    }

    fire(tile, enemy, def, ang) {
      var mx = tile.x + Math.cos(ang) * 16;
      var my = tile.y + Math.sin(ang) * 16;

      if (def.id === "gun") this.fireGun(tile, enemy, def, ang, mx, my);
      else if (def.id === "laser") this.fireLaser(tile, enemy, def, mx, my);
      else if (def.id === "frost") this.fireFrost(tile, enemy, def, ang, mx, my);
      else this.fireSplash(tile, enemy, def, ang, mx, my);
    }

    applyHit(enemy, def, dmg, showNum) {
      if (!enemy.active) return;
      var d = enemy.data.values;
      d.hp -= dmg;
      d.hitFlash = 0.08;
      if (def.slow) d.slow = Math.min(d.slow, def.slow);
      if (showNum) floatText(this, enemy.x + Phaser.Math.Between(-8, 8), enemy.y - 10, "-" + Math.ceil(dmg), "#fff7ed");
      this.updateEnemyBars(enemy);
      if (d.hp <= 0) this.killEnemy(enemy);
    }

    killEnemy(enemy) {
      if (!enemy.active) return;
      var d = enemy.data.values;
      var kind = d.kind;
      this.kills += 1;
      this.mult = Math.min(3, this.mult + 0.08);
      this.score += Math.floor(kind.score * this.mult * this.diff.scoreMult * this.dangerMultiplier);
      this.ore += kind.ore;
      floatText(this, enemy.x, enemy.y, "+" + kind.ore + "礦", "#fbbf24");
      this.destroyEnemyFx(enemy);
      enemy.destroy();
    }

    fireGun(tile, enemy, def, ang, mx, my) {
      var bullet = this.add.image(mx, my, "cd-bullet").setDepth(18).setTint(def.color);
      var tx = enemy.x, ty = enemy.y;
      var self = this;
      this.tweens.add({
        targets: bullet,
        x: tx,
        y: ty,
        duration: 90,
        ease: "Cubic.easeIn",
        onComplete: function () {
          bullet.destroy();
          if (enemy.active) self.applyHit(enemy, def, def.dmg, true);
        }
      });
    }

    fireLaser(tile, enemy, def, mx, my) {
      var tx = enemy.x, ty = enemy.y;
      var beam = this.add.line(0, 0, mx, my, tx, ty, def.color, 1).setDepth(19);
      this.tweens.add({
        targets: beam, alpha: 0, duration: 120, ease: "Cubic.easeOut",
        onComplete: function () { beam.destroy(); }
      });
      if (enemy.active) this.applyHit(enemy, def, def.dmg, true);
    }

    fireFrost(tile, enemy, def, ang, mx, my) {
      var flake = this.add.image(mx, my, "cd-ice").setDepth(18).setTint(def.color);
      var tx = enemy.x, ty = enemy.y;
      var self = this;
      this.tweens.add({
        targets: flake, x: tx, y: ty, duration: 140, ease: "Cubic.easeIn",
        onComplete: function () {
          flake.destroy();
          if (enemy.active) {
            self.applyHit(enemy, def, def.dmg, true);
            enemy.setTint(0x93c5fd);
          }
        }
      });
    }

    fireSplash(tile, enemy, def, ang, mx, my) {
      var shell = this.add.image(mx, my, "cd-boom").setDepth(18).setTint(def.color).setScale(0.55);
      var tx = enemy.x, ty = enemy.y;
      var self = this;
      this.tweens.add({
        targets: shell, x: tx, y: ty, duration: 180, ease: "Cubic.easeIn",
        onComplete: function () {
          shell.destroy();
          var blast = self.add.circle(tx, ty, def.aoe, def.color, 0.25).setDepth(20);
          self.tweens.add({
            targets: blast, alpha: 0, duration: 200, ease: "Cubic.easeOut",
            onComplete: function () { blast.destroy(); }
          });
          self.enemies.getChildren().forEach(function (e) {
            if (!e.active) return;
            var dist = Phaser.Math.Distance.Between(tx, ty, e.x, e.y);
            if (dist <= def.aoe) {
              var falloff = dist < 16 ? 1 : 0.55;
              self.applyHit(e, def, def.dmg * falloff, dist < 20);
            }
          });
        }
      });
    }

    endRun(win) {
      if (!this.alive) return;
      this.alive = false;
      var grade = this.score >= 18000 ? "S" : this.score >= 10000 ? "A" : this.score >= 6000 ? "B" : this.score >= 2500 ? "C" : "D";
      var self = this;
      this.time.delayedCall(300, function () {
        self.scene.start("GameOverModal", {
          score: self.score,
          grade: grade,
          danger: self.dangerMultiplier,
          difficulty: self.diffKey,
          wave: self.wave,
          win: win,
          message: (win ? "防線穩固" : "核心失守") + " · 擊殺 " + self.kills,
          meta: { wave: self.wave, kills: self.kills, win: win }
        });
      });
    }
  }

  Kit.launchDemoGame({
    slug: "core-defense",
    parent: "game-host",
    title: "CoreDefense: Mindustry X",
    subtitle: "工業砲塔 · 異形壓線 · 守住核心裂變爐",
    badge: "CORE DEFENSE",
    accent: 0xff8c5a,
    helpHtml:
      "【目標】用礦石建造砲塔，守住路徑終點的核心反應爐，撐過 20 波。\n\n" +
      "【操作】左側選塔 → 點空地建造（橙色路徑不能蓋）。按「開波」開始後才會持續產礦。\n\n" +
      "【自動開波／加速】可開啟自動開下一波；加速在 ×1／×2／×3 間切換。\n\n" +
      "【砲塔】機槍連射、雷射貫穿、冰凍減速、爆破範圍。各有造型與專屬彈道特效。\n\n" +
      "【敵軍】斥候／蟲群／重甲／精英／泰坦，波次越高越兇。連殺可抬倍率滾經濟。",
    makeTextures: makeTextures,
    briefFn: function (diff) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diff)];
      return [
        { title: "部署節奏", body: "先想交叉火力與核心保護區，再決定開波。" },
        { title: "礦石經濟", body: d.label + " 影響核心血量與敵方強度。" },
        { title: "壓線壓力", body: "連殺抬倍率；爆破清群、冰凍拖慢重甲。" }
      ];
    },
    GameScene: GameScene
  });
})();
