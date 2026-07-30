/**
 * CyberFortune 012 — Phaser 3 rewrite (3-lane matrix duel)
 */
(function () {
  "use strict";
  var Kit = window.RNFDemoPhaser;
  var W = Kit.W, H = Kit.H, SFX = Kit.SFX;
  var HAND = [
    { id: "0", name: "0 共振", v: 0, color: 0x67e8f9 },
    { id: "1", name: "1 壓制", v: 1, color: 0xa78bfa },
    { id: "2", name: "2 破擊", v: 2, color: 0xfbbf24 },
    { id: "0b", name: "0 補線", v: 0, color: 0x22d3ee },
    { id: "1b", name: "1 誘敵", v: 1, color: 0xc084fc },
    { id: "2b", name: "2 決勝", v: 2, color: 0xf59e0b }
  ];

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1a1205, 1); g.fillRoundedRect(0, 0, 100, 130, 10);
    g.lineStyle(2, 0xd4af37, 1); g.strokeRoundedRect(1, 1, 98, 128, 10);
    g.generateTexture("cf-card", 100, 130);
    g.clear(); g.fillStyle(0xd4af37, 0.2); g.fillRoundedRect(0, 0, 200, 70, 8); g.generateTexture("cf-lane", 200, 70);
  }

  function beats(a, b) {
    // 012 cycle: 0 beats 2, 1 beats 0, 2 beats 1; tie if equal
    if (a === b) return 0;
    if ((a === 0 && b === 2) || (a === 1 && b === 0) || (a === 2 && b === 1)) return 1;
    return -1;
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }
    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.aiSkill = this.diffKey === "casual" ? 0.35 : this.diffKey === "extreme" ? 0.85 : 0.6;
      this.timerMax = this.diffKey === "casual" ? 14 : this.diffKey === "extreme" ? 8 : 11;
      this.alive = true;
      this.score = 0;
      this.round = 1;
      this.playerHp = 20;
      this.aiHp = 20;
      this.elapsed = 0;
      this.dangerMultiplier = 1;
      this.hand = HAND.map(function (c) { return Object.assign({}, c); });
      this.lanes = [null, null, null];
      this.aiLanes = [null, null, null];
      this.selectedCard = null;
      this.selectedLane = null;
      this.timeLeft = this.timerMax;
      this.fullMeal = false;
    }
    create() {
      Kit.ensureAudio();
      if (window.PlatformBridge && PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(true);
      makeTextures(this);
      this.cameras.main.setBackgroundColor("#100c06");
      this.cameras.main.fadeIn(200, 4, 6, 12);
      this.add.text(W / 2, 40, "012 三線矩陣對決", {
        fontFamily: "Microsoft JhengHei", fontSize: "22px", fontStyle: "bold", color: "#d4af37"
      }).setOrigin(0.5);
      this.hud = this.add.text(16, 16, "", { fontFamily: "Segoe UI", fontSize: "14px", color: "#fbbf24" }).setDepth(20);
      this.hudDanger = this.add.text(16, 40, "DANGER x1.00", { fontFamily: "Segoe UI", fontSize: "14px", fontStyle: "bold", color: "#f472b6" }).setDepth(20);
      this.timerTxt = this.add.text(W / 2, 70, "", { fontFamily: "Segoe UI", fontSize: "18px", color: "#f87171" }).setOrigin(0.5).setDepth(20);

      this.laneSprites = [];
      this.pLabels = [];
      this.aLabels = [];
      this.laneLabels = ["左線", "中線", "右線"];
      var self = this;
      for (var i = 0; i < 3; i++) {
        var y = 150 + i * 85;
        var lane = this.add.image(W / 2, y, "cf-lane").setInteractive({ useHandCursor: true }).setDepth(3);
        lane.idx = i;
        lane.on("pointerdown", function () { self.pickLane(this.idx); });
        this.add.text(W / 2 - 160, y, this.laneLabels[i], { fontFamily: "Microsoft JhengHei", fontSize: "14px", color: "#d4af37" }).setOrigin(0.5);
        this.laneSprites.push(lane);
        this.pLabels[i] = this.add.text(W / 2 - 40, y, "你: —", { fontFamily: "Segoe UI", fontSize: "14px", color: "#67e8f9" }).setOrigin(0.5);
        this.aLabels[i] = this.add.text(W / 2 + 60, y, "AI: ?", { fontFamily: "Segoe UI", fontSize: "14px", color: "#f472b6" }).setOrigin(0.5);
      }

      Kit.makeMenuButton(this, W / 2 - 140, H - 40, "確認部署", 0xd4af37, function () { self.confirm(); }, 180);
      Kit.makeMenuButton(this, W / 2 + 140, H - 40, "全餐 Full Meal", 0xfbbf24, function () { self.toggleMeal(); }, 200);
      this.renderHand();
      this.refreshHud();
    }
    renderHand() {
      var self = this;
      if (this.handSprites) this.handSprites.forEach(function (s) { s.destroy(true); });
      this.handSprites = [];
      var start = W / 2 - (this.hand.length * 110) / 2 + 50;
      this.hand.forEach(function (card, i) {
        var c = self.add.container(start + i * 110, H - 130).setDepth(12);
        var bg = self.add.image(0, 0, "cf-card").setTint(card.color).setInteractive({ useHandCursor: true });
        var t = self.add.text(0, -20, card.name, { fontFamily: "Microsoft JhengHei", fontSize: "13px", color: "#fff7ed", align: "center", wordWrap: { width: 80 } }).setOrigin(0.5);
        var v = self.add.text(0, 30, String(card.v), { fontFamily: "Segoe UI", fontSize: "28px", fontStyle: "bold", color: "#fde68a" }).setOrigin(0.5);
        bg.on("pointerdown", function () { self.pickCard(i); });
        c.add([bg, t, v]);
        self.handSprites.push(c);
        self.tweens.add({ targets: c, y: { from: H - 90, to: H - 130 }, duration: 200, ease: "Back.easeOut", delay: i * 25 });
      });
    }
    pickCard(i) {
      this.selectedCard = i;
      SFX.click();
      this.handSprites.forEach(function (s, idx) { s.setScale(idx === i ? 1.08 : 1); });
      if (this.selectedLane != null) this.deploy();
    }
    pickLane(i) {
      this.selectedLane = i;
      SFX.click();
      if (this.selectedCard != null) this.deploy();
    }
    deploy() {
      if (this.selectedCard == null || this.selectedLane == null) return;
      var laneIdx = this.selectedLane;
      if (this.lanes[laneIdx]) {
        this.hand.push(this.lanes[laneIdx]);
      }
      var card = this.hand.splice(this.selectedCard, 1)[0];
      this.lanes[laneIdx] = card;
      this.selectedCard = null;
      this.selectedLane = null;
      this.renderHand();
      this.refreshLanes();
      Kit.neonBurst(this, W / 2, 150 + laneIdx * 85, 0xd4af37, 12);
      SFX.place();
    }
    toggleMeal() {
      this.fullMeal = !this.fullMeal;
      SFX.confirm();
      this.refreshHud();
    }
    refreshLanes() {
      for (var i = 0; i < 3; i++) {
        if (this.pLabels[i]) this.pLabels[i].setText("你: " + (this.lanes[i] ? this.lanes[i].v : "—"));
      }
    }
    refreshHud() {
      this.hud.setText("ROUND " + this.round + "  ·  YOU " + this.playerHp + "  ·  AI " + this.aiHp + "  ·  SCORE " + this.score + (this.fullMeal ? "  ·  FULL MEAL" : ""));
      this.timerTxt.setText("部署剩餘 " + Math.ceil(this.timeLeft) + "s · " + this.diff.label);
    }
    confirm() {
      if (!this.alive) return;
      // AI fills empty / counters
      for (var i = 0; i < 3; i++) {
        var pv = this.lanes[i] ? this.lanes[i].v : Phaser.Math.Between(0, 2);
        var av;
        if (Math.random() < this.aiSkill) {
          // counter
          av = (pv + 1) % 3;
        } else {
          av = Phaser.Math.Between(0, 2);
        }
        this.aiLanes[i] = { v: av };
        if (this.aLabels[i]) this.aLabels[i].setText("AI: " + av);
      }
      var pDmg = 0, aDmg = 0;
      for (var j = 0; j < 3; j++) {
        var pv2 = this.lanes[j] ? this.lanes[j].v : -1;
        var av2 = this.aiLanes[j].v;
        if (pv2 < 0) { aDmg += 2; continue; }
        var r = beats(pv2, av2);
        if (r > 0) pDmg += 3 + (this.fullMeal ? 2 : 0);
        else if (r < 0) aDmg += 3;
        else { pDmg += 1; aDmg += 1; }
      }
      pDmg = Math.floor(pDmg * this.diff.scoreMult * (0.9 + this.dangerMultiplier * 0.1));
      aDmg = Math.floor(aDmg * (0.9 + this.dangerMultiplier * 0.15));
      this.aiHp -= pDmg;
      this.playerHp -= aDmg;
      this.score += pDmg * 40;
      if (pDmg > aDmg) { SFX.score(); Kit.neonBurst(this, W / 2, H / 2, 0x34d399, 20); }
      else { SFX.hit(); Kit.screenShake(this, 100, 0.012); Kit.neonBurst(this, W / 2, H / 2, 0xf472b6, 18); }

      this.lanes = [null, null, null];
      this.aiLanes = [null, null, null];
      this.fullMeal = false;
      this.round += 1;
      this.timeLeft = this.timerMax;
      // refill hand if empty
      if (this.hand.length < 3) {
        this.hand = HAND.map(function (c) { return Object.assign({}, c); });
      }
      this.renderHand();
      this.refreshLanes();
      for (var k = 0; k < 3; k++) {
        if (this.aLabels[k]) this.aLabels[k].setText("AI: ?");
      }
      this.refreshHud();
      if (this.aiHp <= 0) this.endDuel(true);
      else if (this.playerHp <= 0) this.endDuel(false);
    }
    update(_t, delta) {
      if (!this.alive) return;
      var dt = delta / 1000;
      this.elapsed += dt;
      this.timeLeft -= dt;
      this.dangerMultiplier = Kit.calcDanger(this.elapsed);
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
      this.timerTxt.setText("部署剩餘 " + Math.max(0, this.timeLeft).toFixed(1) + "s · " + this.diff.label);
      if (this.timeLeft <= 0) {
        this.timeLeft = this.timerMax;
        this.confirm();
      }
    }
    endDuel(win) {
      if (!this.alive) return;
      this.alive = false;
      if (win) { this.score += 1000; SFX.win(); } else SFX.over();
      var grade = this.score >= 6000 ? "S" : this.score >= 4000 ? "A" : this.score >= 2500 ? "B" : this.score >= 1200 ? "C" : "D";
      var self = this;
      this.time.delayedCall(400, function () {
        self.scene.start("GameOverModal", {
          score: self.score, grade: grade, danger: self.dangerMultiplier, difficulty: self.diffKey, win: win,
          message: (win ? "矩陣勝出" : "結構崩潰") + " · 回合 " + self.round,
          meta: { rounds: self.round, win: win }
        });
      });
    }
  }

  Kit.launchDemoGame({
    slug: "cyber-fortune",
    parent: "game-host",
    title: "CyberFortune 012",
    subtitle: "三線矩陣博弈 · 012 克制 · Full Meal 壓力",
    badge: "CYBER FORTUNE",
    accent: 0xd4af37,
    helpHtml: "選擇卡牌與線路部署。0 克 2、1 克 0、2 克 1。限時確認。Full Meal 強化勝線傷害。先清空對方 HP。",
    makeTextures: makeTextures,
    briefFn: function (diff) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diff)];
      return [
        { title: "對局節奏", body: "讀手牌、鎖線、必要時召回重布，再確認。" },
        { title: "矩陣經濟", body: d.label + " 改變 AI 精準度與部署時限。" },
        { title: "博弈壓力", body: "Full Meal 是壓力開關，不是無腦加倍。" }
      ];
    },
    GameScene: GameScene
  });
})();
