/**
 * CoreDefense: Mindustry X — Phaser 3 rewrite
 */
(function () {
  "use strict";
  var Kit = window.RNFDemoPhaser;
  var W = Kit.W, H = Kit.H, SFX = Kit.SFX;
  var COLS = 12, ROWS = 8, TILE = 48;
  var OX, OY;
  var TOWERS = [
    { id: "gun", name: "機槍", cost: 40, dmg: 6, rate: 0.22, range: 130, color: 0xff8c5a },
    { id: "laser", name: "雷射", cost: 85, dmg: 14, rate: 0.55, range: 160, color: 0x67e8f9 },
    { id: "frost", name: "冰凍", cost: 95, dmg: 4, rate: 0.4, range: 140, color: 0x93c5fd, slow: 0.5 },
    { id: "splash", name: "爆破", cost: 120, dmg: 18, rate: 0.85, range: 120, color: 0xf472b6, aoe: 50 }
  ];

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1c1917, 1); g.fillRect(0, 0, TILE - 2, TILE - 2); g.generateTexture("cd-tile", TILE - 2, TILE - 2);
    g.clear(); g.fillStyle(0xff8c5a, 1); g.fillCircle(16, 16, 14); g.generateTexture("cd-core", 32, 32);
    g.clear(); g.fillStyle(0xf87171, 1); g.fillCircle(10, 10, 10); g.generateTexture("cd-enemy", 20, 20);
    g.clear(); g.fillStyle(0xfbbf24, 1); g.fillCircle(14, 14, 14); g.generateTexture("cd-elite", 28, 28);
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }
    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.coreHp = this.diffKey === "casual" ? 160 : this.diffKey === "extreme" ? 100 : 130;
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
    }
    create() {
      Kit.ensureAudio();
      if (window.PlatformBridge && PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(true);
      makeTextures(this);
      OX = (W - COLS * TILE) / 2;
      OY = (H - ROWS * TILE) / 2 + 16;
      this.cameras.main.setBackgroundColor("#120a08");
      this.cameras.main.fadeIn(200, 4, 6, 12);
      this.buildPath();
      var self = this;
      for (var x = 0; x < COLS; x++) {
        this.grid[x] = [];
        for (var y = 0; y < ROWS; y++) {
          var img = this.add.image(OX + x * TILE + TILE / 2, OY + y * TILE + TILE / 2, "cd-tile").setInteractive({ useHandCursor: true }).setAlpha(0.85);
          img.gx = x; img.gy = y; img.tower = null;
          img.on("pointerdown", function () { self.tryBuild(this); });
          this.grid[x][y] = img;
        }
      }
      this.path.forEach(function (p, i) {
        self.add.rectangle(OX + p.x * TILE + TILE / 2, OY + p.y * TILE + TILE / 2, TILE - 8, TILE - 8, 0xff8c5a, 0.12);
      });
      var coreCell = this.path[this.path.length - 1];
      this.core = this.add.image(OX + coreCell.x * TILE + TILE / 2, OY + coreCell.y * TILE + TILE / 2, "cd-core").setDepth(8);
      this.enemies = this.add.group();
      this.hud = this.add.text(12, 8, "", { fontFamily: "Segoe UI", fontSize: "14px", color: "#ff8c5a" }).setDepth(30);
      this.hudDanger = this.add.text(12, 32, "DANGER x1.00", { fontFamily: "Segoe UI", fontSize: "14px", fontStyle: "bold", color: "#f472b6" }).setDepth(30);
      TOWERS.forEach(function (t, i) {
        Kit.makeMenuButton(self, 86, 80 + i * 54, t.name + " $" + t.cost, t.color, function () { self.selected = i; SFX.click(); }, 150);
      });
      Kit.makeMenuButton(this, W - 110, 36, "開波", 0xff8c5a, function () { self.startWave(); }, 140);
    }
    buildPath() {
      // L-shaped approach into center-ish core
      this.path = [];
      for (var x = 0; x < COLS; x++) this.path.push({ x: x, y: 1 });
      for (var y = 2; y < ROWS - 1; y++) this.path.push({ x: COLS - 1, y: y });
      for (var x2 = COLS - 2; x2 >= 5; x2--) this.path.push({ x: x2, y: ROWS - 2 });
    }
    tryBuild(tile) {
      if (!this.alive || tile.tower) return;
      for (var i = 0; i < this.path.length; i++) {
        if (this.path[i].x === tile.gx && this.path[i].y === tile.gy) return;
      }
      var def = TOWERS[this.selected];
      if (this.ore < def.cost) { SFX.hit(); return; }
      this.ore -= def.cost;
      var spr = this.add.circle(tile.x, tile.y, 12, def.color, 0.95).setDepth(7);
      tile.tower = { def: def, spr: spr, cd: 0 };
      SFX.place();
      Kit.neonBurst(this, tile.x, tile.y, def.color, 14);
      this.tweens.add({ targets: spr, scale: { from: 0.4, to: 1 }, duration: 200, ease: "Back.easeOut" });
    }
    startWave() {
      if (!this.alive || this.waveActive) return;
      this.wave += 1;
      this.waveActive = true;
      this.spawnLeft = 10 + this.wave * 2;
      this.spawnAcc = 0;
      SFX.confirm();
    }
    spawnEnemy() {
      var elite = this.wave % 4 === 0 && this.spawnLeft <= 2;
      var start = this.path[0];
      var e = this.add.image(OX + start.x * TILE + TILE / 2, OY + start.y * TILE + TILE / 2, elite ? "cd-elite" : "cd-enemy").setDepth(6);
      e.setData({
        hp: Math.floor((elite ? 90 : 24) * this.hpMul * (1 + this.wave * 0.1) * this.dangerMultiplier),
        idx: 0,
        t: 0,
        spd: elite ? 1.1 : 1.6,
        slow: 1,
        elite: elite
      });
      this.enemies.add(e);
    }
    update(_t, delta) {
      if (!this.alive) return;
      var dt = delta / 1000;
      this.elapsed += dt;
      this.dangerMultiplier = Kit.calcDanger(this.elapsed);
      var threat = this.dangerMultiplier * this.diff.base;
      this.ore += 1.2 * dt;

      if (this.waveActive) {
        this.spawnAcc += dt;
        if (this.spawnLeft > 0 && this.spawnAcc >= Math.max(0.28, 0.7 / threat)) {
          this.spawnAcc = 0; this.spawnLeft -= 1; this.spawnEnemy();
        }
      }

      var self = this;
      this.enemies.getChildren().slice().forEach(function (e) {
        if (!e.active) return;
        var d = e.getData();
        d.t += d.spd * d.slow * threat * dt;
        while (d.t >= 1 && d.idx < self.path.length - 1) { d.t -= 1; d.idx += 1; }
        var a = self.path[d.idx];
        var b = self.path[Math.min(d.idx + 1, self.path.length - 1)];
        e.x = Phaser.Math.Linear(OX + a.x * TILE + TILE / 2, OX + b.x * TILE + TILE / 2, d.t);
        e.y = Phaser.Math.Linear(OY + a.y * TILE + TILE / 2, OY + b.y * TILE + TILE / 2, d.t);
        d.slow = 1;
        if (d.idx >= self.path.length - 1 && d.t >= 1) {
          self.coreHp -= d.elite ? 16 : 8;
          Kit.screenShake(self, 100, 0.013);
          SFX.hit();
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
          if (tw.cd > 0) continue;
          var target = null, best = 999;
          this.enemies.getChildren().forEach(function (e) {
            if (!e.active) return;
            var dist = Phaser.Math.Distance.Between(tile.x, tile.y, e.x, e.y);
            if (dist <= tw.def.range && e.getData().idx > (best === 999 ? -1 : target.getData().idx)) {
              // prefer closest to core
            }
            if (dist <= tw.def.range) {
              if (!target || e.getData().idx >= target.getData().idx) target = e;
            }
          });
          if (!target) continue;
          tw.cd = tw.def.rate / Math.sqrt(threat);
          this.fire(tile, target, tw.def);
        }
      }

      if (this.waveActive && this.spawnLeft <= 0 && this.enemies.countActive(true) === 0) {
        this.waveActive = false;
        this.ore += 30 + this.wave * 4;
        this.score += Math.floor(350 * this.wave * this.mult * this.diff.scoreMult);
        SFX.score();
        if (this.wave >= 20) this.endRun(true);
      }

      this.hud.setText("CORE " + Math.ceil(this.coreHp) + "  ·  ORE " + Math.floor(this.ore) + "  ·  WAVE " + this.wave + "/20  ·  x" + this.mult.toFixed(1));
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
    }
    fire(tile, enemy, def) {
      SFX.beat();
      var line = this.add.line(0, 0, tile.x, tile.y, enemy.x, enemy.y, def.color, 0.85).setDepth(9);
      this.tweens.add({ targets: line, alpha: 0, duration: 100, onComplete: function () { line.destroy(); } });
      var d = enemy.getData();
      d.hp -= def.dmg;
      if (def.slow) d.slow = Math.min(d.slow, def.slow);
      if (def.aoe) {
        var self = this;
        this.enemies.getChildren().forEach(function (e) {
          if (e.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, e.x, e.y) < def.aoe) e.getData().hp -= def.dmg * 0.5;
        });
        Kit.neonBurst(this, enemy.x, enemy.y, def.color, 16);
      }
      if (d.hp <= 0) {
        this.kills += 1;
        this.mult = Math.min(3, this.mult + 0.08);
        this.score += Math.floor(50 * this.mult * this.diff.scoreMult * this.dangerMultiplier);
        this.ore += d.elite ? 18 : 6;
        Kit.neonBurst(this, enemy.x, enemy.y, 0xf87171, 18);
        SFX.explode();
        enemy.destroy();
      }
    }
    endRun(win) {
      if (!this.alive) return;
      this.alive = false;
      if (win) SFX.win(); else SFX.over();
      var grade = this.score >= 18000 ? "S" : this.score >= 10000 ? "A" : this.score >= 6000 ? "B" : this.score >= 2500 ? "C" : "D";
      var self = this;
      this.time.delayedCall(400, function () {
        self.scene.start("GameOverModal", {
          score: self.score, grade: grade, danger: self.dangerMultiplier, difficulty: self.diffKey, wave: self.wave, win: win,
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
    subtitle: "工業防線 · 礦石轉火力 · 守住核心裂變爐",
    badge: "CORE DEFENSE",
    accent: 0xff8c5a,
    helpHtml: "把礦石轉成穩定火力區。連殺抬倍率，手動開波通常更賺。扛住精英與後期壓線。",
    makeTextures: makeTextures,
    briefFn: function (diff) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diff)];
      return [
        { title: "部署節奏", body: "先想首塔與交叉火力，再決定開波時機。" },
        { title: "礦石經濟", body: d.label + " 影響核心血量與敵方血量倍率。" },
        { title: "壓線壓力", body: "連殺倍率越穩，經濟滾得越快。" }
      ];
    },
    GameScene: GameScene
  });
})();
