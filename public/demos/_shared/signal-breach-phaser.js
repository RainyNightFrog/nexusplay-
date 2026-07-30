/**
 * Signal Breach: ICE Protocol — Phaser 3 rewrite
 */
(function () {
  "use strict";
  var Kit = window.RNFDemoPhaser;
  var W = Kit.W, H = Kit.H, SFX = Kit.SFX;
  var GRID = 8, CELL = 48;

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1a2e28, 1); g.fillRoundedRect(0, 0, CELL - 4, CELL - 4, 6); g.generateTexture("sb-cell", CELL - 4, CELL - 4);
    g.clear(); g.fillStyle(0x34d399, 1); g.fillCircle(14, 14, 12); g.generateTexture("sb-entry", 28, 28);
    g.clear(); g.fillStyle(0x22d3ee, 1); g.fillTriangle(14, 2, 26, 26, 2, 26); g.generateTexture("sb-core", 28, 28);
    g.clear(); g.fillStyle(0xef4444, 1); g.fillTriangle(14, 2, 26, 26, 2, 26); g.generateTexture("sb-ice", 28, 28);
    g.clear(); g.fillStyle(0x6b7280, 1); g.fillRect(0, 0, CELL - 4, CELL - 4); g.generateTexture("sb-lock", CELL - 4, CELL - 4);
    g.clear(); g.fillStyle(0xf97316, 1); g.fillRoundedRect(0, 0, CELL - 4, CELL - 4, 4); g.generateTexture("sb-fw", CELL - 4, CELL - 4);
    g.clear(); g.fillStyle(0xa7f3d0, 1); g.fillCircle(12, 12, 10); g.generateTexture("sb-player", 24, 24);
  }

  var LEVELS = [
    { name: "初始接入", time: 75, hp: 3, entry: [0, 0], core: [7, 7], locked: [], firewalls: [], ice: [[[3, 0], [3, 7]]] },
    { name: "側信道", time: 70, hp: 3, entry: [0, 3], core: [7, 4], locked: [[2, 2], [2, 3], [2, 4]], firewalls: [], ice: [[[5, 0], [5, 7]], [[0, 5], [7, 5]]] },
    { name: "雙層掃描", time: 65, hp: 3, entry: [0, 0], core: [7, 7], locked: [[1, 1], [6, 6]], firewalls: [[4, 4]], ice: [[[0, 7], [7, 7], [7, 0]]] },
    { name: "交叉巡邏", time: 58, hp: 2, entry: [0, 0], core: [7, 7], locked: [], firewalls: [[2, 5], [5, 2]], ice: [[[0, 3], [7, 3]], [[3, 0], [3, 7]], [[0, 6], [7, 6]]] }
  ];

  class LevelSelectScene extends Phaser.Scene {
    constructor() { super("LevelSelectScene"); }
    create() {
      var self = this;
      this.cameras.main.setBackgroundColor("#061410");
      this.add.text(W / 2, 60, "關卡選擇", { fontFamily: "Microsoft JhengHei", fontSize: "30px", fontStyle: "bold", color: "#34d399" }).setOrigin(0.5);
      LEVELS.forEach(function (lv, i) {
        Kit.makeMenuButton(self, W / 2, 140 + i * 70, (i + 1) + ". " + lv.name, 0x34d399, function () {
          self.registry.set("sbLevel", i);
          SFX.confirm();
          self.scene.start("DifficultyScene");
        }, 340);
      });
      Kit.makeMenuButton(this, W / 2, 460, "返回", 0x64748b, function () { self.scene.start("MainMenuScene"); }, 180);
    }
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }
    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.levelIdx = this.registry.get("sbLevel") || 0;
      this.ld = LEVELS[this.levelIdx];
      this.iceMult = this.diffKey === "casual" ? 0.5 : this.diffKey === "extreme" ? 1.8 : 1;
      this.timeMult = this.diffKey === "casual" ? 1.45 : this.diffKey === "extreme" ? 0.72 : 1;
      this.alive = true;
      this.score = 0;
      this.combo = 0;
      this.maxCombo = 0;
      this.moves = 0;
      this.hp = this.ld.hp;
      this.timeLeft = this.ld.time * this.timeMult;
      this.elapsed = 0;
      this.dangerMultiplier = 1;
      this.px = this.ld.entry[0];
      this.py = this.ld.entry[1];
      this.undos = 2;
      this.history = [];
      this.iceUnits = this.ld.ice.map(function (path) { return { path: path, idx: 0, dir: 1 }; });
    }
    create() {
      Kit.ensureAudio();
      if (window.PlatformBridge && PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(true);
      makeTextures(this);
      this.cameras.main.setBackgroundColor("#040c0a");
      this.cameras.main.fadeIn(200, 4, 6, 12);
      this.originX = (W - GRID * CELL) / 2;
      this.originY = (H - GRID * CELL) / 2 + 20;
      this.cells = [];
      this.lockedSet = {};
      this.fwSet = {};
      var self = this;
      (this.ld.locked || []).forEach(function (p) { self.lockedSet[p[0] + "," + p[1]] = true; });
      (this.ld.firewalls || []).forEach(function (p) { self.fwSet[p[0] + "," + p[1]] = true; });

      for (var x = 0; x < GRID; x++) {
        for (var y = 0; y < GRID; y++) {
          var key = x + "," + y;
          var tex = this.lockedSet[key] ? "sb-lock" : this.fwSet[key] ? "sb-fw" : "sb-cell";
          var img = this.add.image(this.originX + x * CELL + CELL / 2, this.originY + y * CELL + CELL / 2, tex).setInteractive({ useHandCursor: true });
          img.gx = x; img.gy = y;
          img.on("pointerdown", function () { self.tryMove(this.gx, this.gy); });
          this.cells.push(img);
        }
      }
      this.add.image(this.cellPos(this.ld.entry[0], this.ld.entry[1]).x, this.cellPos(this.ld.entry[0], this.ld.entry[1]).y, "sb-entry").setDepth(4);
      this.add.image(this.cellPos(this.ld.core[0], this.ld.core[1]).x, this.cellPos(this.ld.core[0], this.ld.core[1]).y, "sb-core").setDepth(4);
      this.player = this.add.image(this.cellPos(this.px, this.py).x, this.cellPos(this.px, this.py).y, "sb-player").setDepth(10);
      this.iceSprites = this.iceUnits.map(function (u) {
        var p = u.path[0];
        return self.add.image(self.cellPos(p[0], p[1]).x, self.cellPos(p[0], p[1]).y, "sb-ice").setDepth(8);
      });

      this.hud = this.add.text(16, 12, "", { fontFamily: "Segoe UI", fontSize: "14px", color: "#34d399" }).setDepth(20);
      this.hudDanger = this.add.text(16, 36, "DANGER x1.00", { fontFamily: "Segoe UI", fontSize: "14px", fontStyle: "bold", color: "#f472b6" }).setDepth(20);
      this.add.text(W - 16, 12, this.ld.name + " · " + this.diff.label, { fontFamily: "Microsoft JhengHei", fontSize: "13px", color: "#94a3b8" }).setOrigin(1, 0).setDepth(20);
      Kit.makeMenuButton(this, W - 90, H - 36, "撤銷", 0xf97316, function () { self.undo(); }, 120);
    }
    cellPos(x, y) {
      return { x: this.originX + x * CELL + CELL / 2, y: this.originY + y * CELL + CELL / 2 };
    }
    iceOccupied() {
      var set = {};
      this.iceUnits.forEach(function (u) {
        var p = u.path[u.idx];
        set[p[0] + "," + p[1]] = true;
      });
      return set;
    }
    tryMove(nx, ny) {
      if (!this.alive) return;
      var dx = Math.abs(nx - this.px), dy = Math.abs(ny - this.py);
      if (dx + dy !== 1) return;
      var key = nx + "," + ny;
      if (this.lockedSet[key]) return;
      var cost = this.fwSet[key] ? 2 : 1;
      this.history.push({ px: this.px, py: this.py, score: this.score, combo: this.combo, hp: this.hp, ice: this.iceUnits.map(function (u) { return { idx: u.idx, dir: u.dir }; }) });
      this.px = nx; this.py = ny;
      this.moves += cost;
      var pos = this.cellPos(nx, ny);
      this.tweens.add({ targets: this.player, x: pos.x, y: pos.y, duration: 120, ease: "Cubic.easeOut" });
      SFX.place();
      this.stepIce();
      var ice = this.iceOccupied();
      if (ice[this.px + "," + this.py]) this.damage();
      else {
        this.combo += 1;
        this.maxCombo = Math.max(this.maxCombo, this.combo);
        this.score += Math.floor(40 * this.combo * this.diff.scoreMult * this.dangerMultiplier);
        Kit.neonBurst(this, pos.x, pos.y, 0x34d399, 12);
      }
      if (this.px === this.ld.core[0] && this.py === this.ld.core[1]) this.endLevel(true);
    }
    stepIce() {
      var self = this;
      this.iceUnits.forEach(function (u, i) {
        var next = u.idx + u.dir;
        if (next < 0 || next >= u.path.length) { u.dir *= -1; next = u.idx + u.dir; }
        u.idx = Phaser.Math.Clamp(next, 0, u.path.length - 1);
        var p = u.path[u.idx];
        var pos = self.cellPos(p[0], p[1]);
        self.tweens.add({ targets: self.iceSprites[i], x: pos.x, y: pos.y, duration: 140 / self.iceMult, ease: "Cubic.easeOut" });
      });
    }
    damage() {
      this.hp -= 1;
      this.combo = 0;
      SFX.hit();
      Kit.screenShake(this, 110, 0.015);
      Kit.neonBurst(this, this.player.x, this.player.y, 0xef4444, 20);
      if (this.hp <= 0) this.endLevel(false);
    }
    undo() {
      if (!this.alive || this.undos <= 0 || !this.history.length) return;
      var h = this.history.pop();
      this.undos -= 1;
      this.px = h.px; this.py = h.py;
      this.score = h.score; this.combo = h.combo; this.hp = h.hp;
      this.iceUnits.forEach(function (u, i) { u.idx = h.ice[i].idx; u.dir = h.ice[i].dir; });
      var pos = this.cellPos(this.px, this.py);
      this.player.setPosition(pos.x, pos.y);
      var self = this;
      this.iceUnits.forEach(function (u, i) {
        var p = u.path[u.idx];
        var ip = self.cellPos(p[0], p[1]);
        self.iceSprites[i].setPosition(ip.x, ip.y);
      });
      SFX.click();
    }
    update(_t, delta) {
      if (!this.alive) return;
      var dt = delta / 1000;
      this.elapsed += dt;
      this.timeLeft -= dt;
      this.dangerMultiplier = Kit.calcDanger(this.elapsed) * this.diff.base;
      this.hud.setText("SCORE " + this.score + "  ·  HP " + this.hp + "  ·  COMBO " + this.combo + "  ·  TIME " + Math.max(0, this.timeLeft).toFixed(1) + "s  ·  UNDO " + this.undos);
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
      if (this.timeLeft <= 0) this.endLevel(false);
    }
    endLevel(win) {
      if (!this.alive) return;
      this.alive = false;
      if (win) { SFX.win(); Kit.neonBurst(this, this.player.x, this.player.y, 0x22d3ee, 26); }
      else SFX.explode();
      var bonus = win ? Math.floor(this.timeLeft * 20 * this.combo) : 0;
      this.score += bonus;
      var grade = this.score >= 8000 ? "S" : this.score >= 5000 ? "A" : this.score >= 3000 ? "B" : this.score >= 1500 ? "C" : "D";
      var self = this;
      this.time.delayedCall(400, function () {
        self.scene.start("GameOverModal", {
          score: self.score, grade: grade, danger: self.dangerMultiplier, difficulty: self.diffKey, win: win,
          message: (win ? "突破成功" : "訊號遺失") + " · 步數 " + self.moves + " · 連擊 " + self.maxCombo,
          meta: { level: self.levelIdx + 1, moves: self.moves, combo: self.maxCombo, win: win }
        });
      });
    }
  }

  Kit.launchDemoGame({
    slug: "signal-breach",
    parent: "game-host",
    title: "訊號突破",
    subtitle: "8×8 節點滲透 · 避開 ICE · 奪取資料核心",
    badge: "ICE PROTOCOL",
    accent: 0x34d399,
    startScene: "LevelSelectScene",
    helpHtml: "從接入點走到資料核心。每步 ICE 巡邏。防火牆耗兩步。保持連擊與完整性。",
    makeTextures: makeTextures,
    briefFn: function (diff) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diff)];
      return [
        { title: "滲透節奏", body: "先讀巡邏線再出手，安全連擊比抄近路更值錢。" },
        { title: "時間窗口", body: d.label + " 同時改 ICE 速度與時間倍率。" },
        { title: "協議壓力", body: "防火牆算兩步；別硬撞巡邏線。" }
      ];
    },
    GameScene: GameScene,
    extraScenes: [LevelSelectScene]
  });
})();
