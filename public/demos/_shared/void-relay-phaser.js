/**
 * Void Relay: Card Descent — Phaser 3 rewrite (condensed roguelike)
 */
(function () {
  "use strict";
  var Kit = window.RNFDemoPhaser;
  var W = Kit.W, H = Kit.H, SFX = Kit.SFX;
  var CARDS = [
    { id: "strike", name: "虛空打擊", type: "attack", cost: 1, dmg: 7 },
    { id: "heavy", name: "重錘", type: "attack", cost: 2, dmg: 14 },
    { id: "bash", name: "連擊", type: "attack", cost: 1, dmg: 5, draw: 1 },
    { id: "guard", name: "護盾", type: "skill", cost: 1, block: 8 },
    { id: "heal", name: "修復", type: "skill", cost: 1, heal: 6 },
    { id: "focus", name: "專注", type: "skill", cost: 0, draw: 2 },
    { id: "amp", name: "增幅", type: "power", cost: 1, str: 2 },
    { id: "thorn", name: "荊棘", type: "power", cost: 1, thorns: 3 }
  ];
  var ENEMIES = [
    { name: "虛空爬行者", hp: 38, intents: ["atk6", "atk9", "def5"] },
    { name: "毒刺", hp: 45, intents: ["atk7", "atk7", "atk12"] },
    { name: "精英守衛", hp: 70, intents: ["atk10", "def8", "atk14"], elite: true },
    { name: "深淵首領", hp: 120, intents: ["atk12", "atk16", "atk10"], boss: true }
  ];

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x2e1065, 1); g.fillRoundedRect(0, 0, 110, 150, 10);
    g.lineStyle(2, 0xa78bfa, 1); g.strokeRoundedRect(1, 1, 108, 148, 10);
    g.generateTexture("vr-card", 110, 150);
    g.clear(); g.fillStyle(0x7c3aed, 1); g.fillCircle(40, 40, 38); g.generateTexture("vr-enemy", 80, 80);
    g.clear(); g.fillStyle(0x22d3ee, 1); g.fillCircle(36, 36, 34); g.generateTexture("vr-player", 72, 72);
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }
    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.hpMul = this.diffKey === "casual" ? 0.82 : this.diffKey === "extreme" ? 1.28 : 1;
      this.dmgMul = this.diffKey === "casual" ? 0.82 : this.diffKey === "extreme" ? 1.32 : 1;
      this.playerHp = this.diffKey === "casual" ? 75 : this.diffKey === "extreme" ? 65 : 70;
      this.playerMax = this.playerHp;
      this.alive = true;
      this.score = 0;
      this.floor = 1;
      this.elapsed = 0;
      this.dangerMultiplier = 1;
      this.block = 0;
      this.energy = 3;
      this.str = 0;
      this.thorns = 0;
      this.relay = [];
      this.deck = shuffle(CARDS.concat(CARDS).map(function (c) { return Object.assign({}, c); }));
      this.discard = [];
      this.hand = [];
      this.phase = "combat";
    }
    create() {
      Kit.ensureAudio();
      if (window.PlatformBridge && PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(true);
      makeTextures(this);
      this.cameras.main.setBackgroundColor("#0b0618");
      this.cameras.main.fadeIn(200, 4, 6, 12);
      Kit.makeStarfield(this, 30, 0xa78bfa);
      this.playerSpr = this.add.image(180, 220, "vr-player").setDepth(5);
      this.enemySpr = this.add.image(W - 180, 200, "vr-enemy").setDepth(5);
      this.playerTxt = this.add.text(180, 280, "", { fontFamily: "Segoe UI", fontSize: "14px", color: "#67e8f9" }).setOrigin(0.5).setDepth(6);
      this.enemyTxt = this.add.text(W - 180, 270, "", { fontFamily: "Segoe UI", fontSize: "14px", color: "#f472b6", align: "center" }).setOrigin(0.5).setDepth(6);
      this.intentTxt = this.add.text(W - 180, 120, "", { fontFamily: "Microsoft JhengHei", fontSize: "16px", color: "#fbbf24" }).setOrigin(0.5).setDepth(6);
      this.hud = this.add.text(16, 12, "", { fontFamily: "Segoe UI", fontSize: "14px", color: "#c4b5fd" }).setDepth(20);
      this.hudDanger = this.add.text(16, 36, "DANGER x1.00", { fontFamily: "Segoe UI", fontSize: "14px", fontStyle: "bold", color: "#f472b6" }).setDepth(20);
      var self = this;
      Kit.makeMenuButton(this, W - 100, H - 40, "結束回合", 0xa78bfa, function () { self.endTurn(); }, 160);
      this.cardSprites = [];
      this.startFloor();
    }
    startFloor() {
      var isBoss = this.floor % 5 === 0;
      var isElite = this.floor % 4 === 0 && !isBoss;
      var base = isBoss ? ENEMIES[3] : isElite ? ENEMIES[2] : ENEMIES[this.floor % 2];
      this.enemy = {
        name: base.name,
        hp: Math.floor(base.hp * this.hpMul * (1 + this.floor * 0.04) * this.dangerMultiplier),
        intents: base.intents.slice(),
        intentIdx: 0,
        block: 0,
        boss: !!base.boss,
        enraged: false
      };
      this.enemy.max = this.enemy.hp;
      this.block = 0;
      this.energy = 3;
      this.relay = [];
      this.drawHand(5);
      this.refreshUI();
      SFX.confirm();
    }
    drawHand(n) {
      while (this.hand.length < n) {
        if (!this.deck.length) {
          this.deck = shuffle(this.discard);
          this.discard = [];
        }
        if (!this.deck.length) break;
        this.hand.push(this.deck.pop());
      }
      this.renderHand();
    }
    renderHand() {
      var self = this;
      this.cardSprites.forEach(function (s) { s.destroy(true); });
      this.cardSprites = [];
      var start = W / 2 - (this.hand.length * 120) / 2 + 55;
      this.hand.forEach(function (card, i) {
        var c = self.add.container(start + i * 120, H - 120).setDepth(15);
        var bg = self.add.image(0, 0, "vr-card").setInteractive({ useHandCursor: true });
        var title = self.add.text(0, -40, card.name, { fontFamily: "Microsoft JhengHei", fontSize: "13px", color: "#e9d5ff", align: "center", wordWrap: { width: 90 } }).setOrigin(0.5);
        var cost = self.add.text(-40, -60, String(card.cost), { fontFamily: "Segoe UI", fontSize: "16px", fontStyle: "bold", color: "#67e8f9" }).setOrigin(0.5);
        var desc = self.add.text(0, 20, self.cardDesc(card), { fontFamily: "Microsoft JhengHei", fontSize: "11px", color: "#c4b5fd", align: "center", wordWrap: { width: 90 } }).setOrigin(0.5);
        bg.on("pointerdown", function () { self.playCard(i); });
        bg.on("pointerover", function () { self.tweens.add({ targets: c, y: H - 140, duration: 100, ease: "Cubic.easeOut" }); });
        bg.on("pointerout", function () { self.tweens.add({ targets: c, y: H - 120, duration: 100 }); });
        c.add([bg, title, cost, desc]);
        self.cardSprites.push(c);
        self.tweens.add({ targets: c, scale: { from: 0.8, to: 1 }, duration: 180, ease: "Back.easeOut", delay: i * 30 });
      });
    }
    cardDesc(c) {
      var parts = [];
      if (c.dmg) parts.push("傷害 " + (c.dmg + this.str));
      if (c.block) parts.push("護盾 " + c.block);
      if (c.heal) parts.push("治療 " + c.heal);
      if (c.draw) parts.push("抽 " + c.draw);
      if (c.str) parts.push("力量 +" + c.str);
      if (c.thorns) parts.push("荊棘 +" + c.thorns);
      return parts.join("\n") || c.type;
    }
    playCard(idx) {
      if (!this.alive || this.phase !== "combat") return;
      var card = this.hand[idx];
      if (!card || this.energy < card.cost) { SFX.hit(); return; }
      this.energy -= card.cost;
      this.hand.splice(idx, 1);
      this.discard.push(card);
      this.relay.push(card.type);
      if (this.relay.length > 3) this.relay.shift();
      if (card.dmg) this.dealToEnemy(card.dmg + this.str);
      if (card.block) this.block += card.block;
      if (card.heal) this.playerHp = Math.min(this.playerMax, this.playerHp + card.heal);
      if (card.str) this.str += card.str;
      if (card.thorns) this.thorns += card.thorns;
      if (card.draw) this.drawHand(this.hand.length + card.draw);
      SFX.place();
      Kit.neonBurst(this, W - 180, 200, 0xa78bfa, 14);
      if (this.relay.length === 3 && this.relay[0] === this.relay[1] && this.relay[1] === this.relay[2]) {
        this.dealToEnemy(8);
        this.drawHand(this.hand.length + 1);
        SFX.win();
        Kit.screenShake(this, 100, 0.012);
        this.relay = [];
      }
      this.renderHand();
      this.refreshUI();
      if (this.enemy.hp <= 0) this.winFloor();
    }
    dealToEnemy(raw) {
      var dmg = Math.floor(raw * this.diff.scoreMult);
      var blocked = Math.min(this.enemy.block, dmg);
      this.enemy.block -= blocked;
      dmg -= blocked;
      this.enemy.hp -= dmg;
      this.score += Math.floor(dmg * 3 * this.dangerMultiplier);
      Kit.screenShake(this, 60, 0.008);
    }
    endTurn() {
      if (!this.alive) return;
      // discard hand
      this.discard = this.discard.concat(this.hand);
      this.hand = [];
      this.renderHand();
      this.enemyAct();
      this.block = 0;
      this.energy = 3;
      this.drawHand(5);
      this.refreshUI();
    }
    enemyAct() {
      var intent = this.enemy.intents[this.enemy.intentIdx % this.enemy.intents.length];
      this.enemy.intentIdx += 1;
      if (intent.indexOf("atk") === 0) {
        var dmg = Math.floor(parseInt(intent.slice(3), 10) * this.dmgMul * this.dangerMultiplier);
        if (this.enemy.enraged) dmg = Math.floor(dmg * 1.35);
        var blocked = Math.min(this.block, dmg);
        this.block -= blocked;
        dmg -= blocked;
        this.playerHp -= dmg;
        if (this.thorns && dmg > 0) this.dealToEnemy(this.thorns);
        SFX.hit();
        Kit.screenShake(this, 110, 0.014);
        Kit.neonBurst(this, 180, 220, 0xf472b6, 18);
      } else if (intent.indexOf("def") === 0) {
        this.enemy.block += parseInt(intent.slice(3), 10);
        SFX.click();
      }
      if (this.enemy.boss && !this.enemy.enraged && this.enemy.hp < this.enemy.max * 0.5) {
        this.enemy.enraged = true;
        SFX.explode();
      }
      if (this.playerHp <= 0) this.endRun(false);
      if (this.enemy.hp <= 0) this.winFloor();
    }
    winFloor() {
      this.score += Math.floor(200 * this.floor * this.diff.scoreMult);
      Kit.neonBurst(this, W - 180, 200, 0x34d399, 24);
      SFX.score();
      if (this.floor >= 15) { this.endRun(true); return; }
      this.floor += 1;
      // simple camp every 3 floors
      if (this.floor % 3 === 0) {
        this.playerHp = Math.min(this.playerMax, this.playerHp + Math.floor(this.playerMax * 0.25));
        this.score += 100;
      }
      // reward: add a random card
      this.deck.push(Object.assign({}, CARDS[Phaser.Math.Between(0, CARDS.length - 1)]));
      this.startFloor();
    }
    refreshUI() {
      this.playerTxt.setText("HP " + Math.ceil(this.playerHp) + "/" + this.playerMax + "\nBLOCK " + this.block + "\nNRG " + this.energy);
      this.enemyTxt.setText(this.enemy.name + "\nHP " + Math.max(0, Math.ceil(this.enemy.hp)) + (this.enemy.enraged ? "\nENRAGED" : ""));
      var intent = this.enemy.intents[this.enemy.intentIdx % this.enemy.intents.length];
      this.intentTxt.setText("意圖 " + intent);
      this.hud.setText("FLOOR " + this.floor + "/15  ·  SCORE " + this.score + "  ·  " + this.diff.label);
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
    }
    update(_t, delta) {
      if (!this.alive) return;
      this.elapsed += delta / 1000;
      this.dangerMultiplier = Kit.calcDanger(this.elapsed);
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
    }
    endRun(win) {
      if (!this.alive) return;
      this.alive = false;
      if (win) SFX.win(); else SFX.over();
      var grade = this.score >= 15000 ? "S" : this.score >= 9000 ? "A" : this.score >= 5000 ? "B" : this.score >= 2000 ? "C" : "D";
      var self = this;
      this.time.delayedCall(350, function () {
        self.scene.start("GameOverModal", {
          score: self.score, grade: grade, danger: self.dangerMultiplier, difficulty: self.diffKey,
          floor: self.floor, win: win,
          message: (win ? "抵達第 15 層" : "倒在第 " + self.floor + " 層"),
          meta: { floor: self.floor, win: win }
        });
      });
    }
  }

  Kit.launchDemoGame({
    slug: "void-relay",
    parent: "game-host",
    title: "虛空接力：卡牌深淵",
    subtitle: "15 層卡牌 Roguelike · 讀意圖 · 虛空接力",
    badge: "VOID RELAY",
    accent: 0xa78bfa,
    helpHtml: "每回合 3 能量。連續 3 張同類型觸發虛空接力。每 5 層首領，低血狂暴。營地可回血。",
    makeTextures: makeTextures,
    briefFn: function (diff) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diff)];
      return [
        { title: "深淵節奏", body: "打到第 15 層；首領與精英是檢查點。" },
        { title: "牌組經濟", body: d.label + " 改變敵我血量與傷害倍率。" },
        { title: "虛空壓力", body: "讀意圖再出牌；同類型三連觸發接力。" }
      ];
    },
    GameScene: GameScene
  });
})();
