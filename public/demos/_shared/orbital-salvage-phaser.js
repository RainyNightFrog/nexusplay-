/**
 * Orbital Salvage: Ring Defense — Phaser 3 rewrite
 */
(function () {
  "use strict";
  var Kit = window.RNFDemoPhaser;
  var W = Kit.W, H = Kit.H, SFX = Kit.SFX;
  var CX = W / 2, CY = H / 2 + 10;
  var RINGS = [90, 150, 210];
  var TOWERS = [
    { id: "pulse", name: "脈衝", cost: 45, dmg: 8, range: 0.25, range: 110, color: 0x67e8f9 },
    { id: "salvage", name: "回收", cost: 90, dmg: 3, rate: 0.8, range: 90, color: 0xfbbf24, econ: 4 },
    { id: "frost", name: "霜凍", cost: 120, dmg: 5, rate: 0.45, range: 130, color: 0x93c5fd, slow: 0.55 },
    { id: "rail", name: "磁軌", cost: 130, dmg: 28, rate: 1.1, range: 200, color: 0xa78bfa },
    { id: "nova", name: "新星", cost: 175, dmg: 16, rate: 0.9, range: 120, color: 0xf472b6, aoe: 55 }
  ];

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x22d3ee, 1); g.fillCircle(18, 18, 16); g.generateTexture("os-core", 36, 36);
    g.clear(); g.fillStyle(0xf87171, 1); g.fillTriangle(12, 2, 22, 22, 2, 22); g.generateTexture("os-enemy", 24, 24);
    g.clear(); g.fillStyle(0xfbbf24, 1); g.fillCircle(10, 10, 10); g.generateTexture("os-boss", 20, 20);
    g.clear(); g.fillStyle(0xffffff, 1); g.fillCircle(6, 6, 5); g.generateTexture("os-tower", 12, 12);
  }

  function slotPos(ring, i, n) {
    var a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return { x: CX + Math.cos(a) * RINGS[ring], y: CY + Math.sin(a) * RINGS[ring] };
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }
    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.coreHp = this.diffKey === "casual" ? 140 : this.diffKey === "extreme" ? 90 : 110;
      this.scrap = this.diffKey === "casual" ? 180 : this.diffKey === "extreme" ? 110 : 140;
      this.enemyHpMul = this.diffKey === "casual" ? 0.85 : this.diffKey === "extreme" ? 1.35 : 1;
      this.spiralMul = this.diffKey === "casual" ? 0.85 : this.diffKey === "extreme" ? 1.35 : 1;
      this.alive = true;
      this.score = 0;
      this.wave = 0;
      this.kills = 0;
      this.elapsed = 0;
      this.dangerMultiplier = 1;
      this.selectedTower = 0;
      this.slots = [];
      this.waveActive = false;
      this.spawnLeft = 0;
      this.spawnAcc = 0;
    }
    create() {
      Kit.ensureAudio();
      if (window.PlatformBridge && PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(true);
      makeTextures(this);
      this.cameras.main.setBackgroundColor("#050814");
      this.cameras.main.fadeIn(200, 4, 6, 12);
      var gfx = this.add.graphics().setAlpha(0.35);
      for (var r = 0; r < 3; r++) {
        gfx.lineStyle(2, 0x22d3ee, 0.4);
        gfx.strokeCircle(CX, CY, RINGS[r]);
        var n = 6 + r * 2;
        for (var i = 0; i < n; i++) {
          var p = slotPos(r, i, n);
          var slot = this.add.circle(p.x, p.y, 14, 0x0ea5e9, 0.15).setStrokeStyle(1, 0x67e8f9, 0.6).setInteractive({ useHandCursor: true });
          slot.ring = r; slot.idx = i; slot.tower = null;
          var self = this;
          slot.on("pointerdown", function () { self.buildOn(this); });
          this.slots.push(slot);
        }
      }
      this.core = this.add.image(CX, CY, "os-core").setDepth(5);
      this.enemies = this.add.group();
      this.hud = this.add.text(12, 10, "", { fontFamily: "Segoe UI", fontSize: "14px", color: "#67e8f9" }).setDepth(30);
      this.hudDanger = this.add.text(12, 34, "DANGER x1.00", { fontFamily: "Segoe UI", fontSize: "14px", fontStyle: "bold", color: "#f472b6" }).setDepth(30);
      var self = this;
      TOWERS.forEach(function (t, i) {
        Kit.makeMenuButton(self, 90, 90 + i * 52, t.name + " $" + t.cost, t.color, function () {
          self.selectedTower = i;
          SFX.click();
        }, 150);
      });
      Kit.makeMenuButton(this, W - 110, 40, "下一波", 0x34d399, function () { self.startWave(); }, 150);
      this.add.text(W - 16, H - 16, this.diff.label, { fontFamily: "Microsoft JhengHei", fontSize: "12px", color: this.diff.color }).setOrigin(1, 1).setDepth(30);
    }
    buildOn(slot) {
      if (!this.alive || slot.tower) return;
      var def = TOWERS[this.selectedTower];
      if (this.scrap < def.cost) { SFX.hit(); return; }
      this.scrap -= def.cost;
      var tw = this.add.circle(slot.x, slot.y, 10, def.color, 0.95).setDepth(8);
      slot.tower = { def: def, spr: tw, cd: 0, level: 1 };
      SFX.place();
      Kit.neonBurst(this, slot.x, slot.y, def.color, 14);
      this.tweens.add({ targets: tw, scale: { from: 0.5, to: 1 }, duration: 220, ease: "Back.easeOut" });
    }
    startWave() {
      if (!this.alive || this.waveActive) return;
      this.wave += 1;
      this.waveActive = true;
      this.spawnLeft = 8 + this.wave * 2 + (this.wave % 5 === 0 ? 4 : 0);
      this.spawnAcc = 0;
      SFX.confirm();
      if (this.wave % 5 === 0) Kit.screenShake(this, 120, 0.014);
    }
    spawnEnemy() {
      var ang = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var boss = this.wave % 5 === 0 && this.spawnLeft === 1;
      var e = this.add.image(CX + Math.cos(ang) * 280, CY + Math.sin(ang) * 280, boss ? "os-boss" : "os-enemy").setDepth(6);
      e.setData({
        hp: Math.floor((boss ? 180 : 28) * this.enemyHpMul * (1 + this.wave * 0.08) * this.dangerMultiplier),
        max: 1,
        ang: ang,
        rad: 280,
        spd: (boss ? 22 : 38) * this.spiralMul,
        boss: boss,
        slow: 1
      });
      e.data.values.max = e.data.values.hp;
      this.enemies.add(e);
    }
    update(_t, delta) {
      if (!this.alive) return;
      var dt = delta / 1000;
      this.elapsed += dt;
      this.dangerMultiplier = Kit.calcDanger(this.elapsed);
      var threat = this.dangerMultiplier * this.diff.base;

      if (this.waveActive) {
        this.spawnAcc += dt;
        if (this.spawnLeft > 0 && this.spawnAcc >= Math.max(0.35, 0.85 / threat)) {
          this.spawnAcc = 0;
          this.spawnLeft -= 1;
          this.spawnEnemy();
        }
      }

      var self = this;
      this.enemies.getChildren().slice().forEach(function (e) {
        if (!e.active) return;
        var d = e.data.values;
        d.rad -= d.spd * d.slow * threat * dt;
        d.ang += 0.35 * dt;
        e.x = CX + Math.cos(d.ang) * d.rad;
        e.y = CY + Math.sin(d.ang) * d.rad;
        d.slow = 1;
        if (d.rad <= 28) {
          self.coreHp -= d.boss ? 18 : 8;
          Kit.screenShake(self, 90, 0.012);
          SFX.hit();
          e.destroy();
          if (self.coreHp <= 0) self.endRun(false);
        }
      });

      this.slots.forEach(function (slot) {
        if (!slot.tower) return;
        var tw = slot.tower;
        tw.cd -= dt;
        if (tw.def.econ) self.scrap += tw.def.econ * dt;
        if (tw.cd > 0) return;
        var target = null, best = 9999;
        self.enemies.getChildren().forEach(function (e) {
          if (!e.active) return;
          var dist = Phaser.Math.Distance.Between(slot.x, slot.y, e.x, e.y);
          if (dist < tw.def.range && e.data.values.rad < best) { best = e.data.values.rad; target = e; }
        });
        if (!target) return;
        tw.cd = tw.def.rate / Math.sqrt(threat);
        self.shoot(slot, target, tw.def);
      });

      if (this.waveActive && this.spawnLeft <= 0 && this.enemies.countActive(true) === 0) {
        this.waveActive = false;
        this.scrap += 35 + this.wave * 5;
        this.score += Math.floor(400 * this.wave * this.diff.scoreMult);
        SFX.score();
        if (this.wave >= 20) this.endRun(true);
      }

      this.hud.setText("CORE " + Math.max(0, Math.ceil(this.coreHp)) + "  ·  SCRAP " + Math.floor(this.scrap) + "  ·  WAVE " + this.wave + "/20  ·  KILLS " + this.kills);
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
    }
    shoot(slot, enemy, def) {
      SFX.beat();
      var line = this.add.line(0, 0, slot.x, slot.y, enemy.x, enemy.y, def.color, 0.8).setDepth(7);
      this.tweens.add({ targets: line, alpha: 0, duration: 120, onComplete: function () { line.destroy(); } });
      var d = enemy.data.values;
      d.hp -= def.dmg * this.diff.scoreMult;
      if (def.slow) d.slow = Math.min(d.slow, def.slow);
      if (def.aoe) {
        var self = this;
        this.enemies.getChildren().forEach(function (e) {
          if (e !== enemy && e.active && Phaser.Math.Distance.Between(enemy.x, enemy.y, e.x, e.y) < def.aoe) {
            e.data.values.hp -= def.dmg * 0.55;
          }
        });
        Kit.neonBurst(this, enemy.x, enemy.y, def.color, 18);
      }
      if (d.hp <= 0) {
        this.kills += 1;
        this.score += Math.floor((d.boss ? 500 : 60) * this.diff.scoreMult * this.dangerMultiplier);
        this.scrap += d.boss ? 40 : 8;
        Kit.neonBurst(this, enemy.x, enemy.y, 0xf87171, 20);
        SFX.explode();
        enemy.destroy();
      }
    }
    endRun(win) {
      if (!this.alive) return;
      this.alive = false;
      if (win) SFX.win(); else SFX.over();
      var grade = this.score >= 20000 ? "S" : this.score >= 12000 ? "A" : this.score >= 7000 ? "B" : this.score >= 3000 ? "C" : "D";
      var self = this;
      this.time.delayedCall(400, function () {
        self.scene.start("GameOverModal", {
          score: self.score, grade: grade, danger: self.dangerMultiplier, difficulty: self.diffKey, wave: self.wave, win: win,
          message: (win ? "環形防線守住" : "核心過載") + " · 擊殺 " + self.kills,
          meta: { wave: self.wave, kills: self.kills, win: win }
        });
      });
    }
  }

  Kit.launchDemoGame({
    slug: "orbital-salvage",
    parent: "game-host",
    title: "軌道回收：環形防線",
    subtitle: "三環建塔 · 攔截螺旋艦隊 · 守護反應爐",
    badge: "ORBITAL SALVAGE",
    accent: 0x22d3ee,
    helpHtml: "外環遠射、中環控場、內環補刀。回收塔滾經濟，手動開波通常更賺。撐過 20 波。",
    makeTextures: makeTextures,
    briefFn: function (diff) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diff)];
      return [
        { title: "螺旋節奏", body: "外環生成、螺旋逼近；先想哪層槽位要站穩。" },
        { title: "廢料經濟", body: d.label + " 影響核心血量、開局廢料與敵艦強度。" },
        { title: "環位壓力", body: "每 5 波旗艦檢查點，火力分層不穩會被壓進核心。" }
      ];
    },
    GameScene: GameScene
  });
})();
