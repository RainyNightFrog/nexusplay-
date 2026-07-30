/**
 * CyberFortune 012 — Phaser 3（三線矩陣對決）
 * 規則對齊 demo packs：線路 0/1/2、同號共振、三線齊出=全餐、012 克制
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

  var HELP_ZH =
    "【目標】三線同時對決，先打空對方 HP。\n\n" +
    "【操作】①點手牌 ②點線路 0／1／2 部署（可先點線再點牌）。再點已部署線路可收回。三線排好後按「確認布陣」。\n\n" +
    "【克制】0 克 2、1 克 0、2 克 1；同值平手各傷 1。空線被電 2 傷。\n\n" +
    "【共振】卡牌數字＝線路編號 → 該線傷害 +45%。\n\n" +
    "【全餐】三線都部署完成即自動啟動，本回合總傷 ×1.8（不必另點按鈕）。\n\n" +
    "【時間】倒數結束會自動確認。難度越高 AI 越準、時限越短。";

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1a1205, 1);
    g.fillRoundedRect(0, 0, 88, 112, 10);
    g.lineStyle(2, 0xd4af37, 1);
    g.strokeRoundedRect(1, 1, 86, 110, 10);
    g.generateTexture("cf-card", 88, 112);
    g.clear();
    g.fillStyle(0xd4af37, 0.18);
    g.fillRoundedRect(0, 0, 520, 58, 8);
    g.lineStyle(1, 0xd4af37, 0.55);
    g.strokeRoundedRect(1, 1, 518, 56, 8);
    g.generateTexture("cf-lane", 520, 58);
    g.destroy();
  }

  function beats(a, b) {
    if (a === b) return 0;
    if ((a === 0 && b === 2) || (a === 1 && b === 0) || (a === 2 && b === 1)) return 1;
    return -1;
  }

  function resolveHelpHtml() {
    try {
      var pack = window.RNF_DEMO_I18N && RNF_DEMO_I18N.apply && RNF_DEMO_I18N.apply("cyber-fortune");
      if (pack && pack.helpHtml) return pack.helpHtml;
    } catch (_e) {}
    return HELP_ZH;
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }
    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.aiSkill = this.diffKey === "casual" ? 0.35 : this.diffKey === "extreme" ? 0.85 : 0.6;
      this.timerMax = this.diffKey === "casual" ? 16 : this.diffKey === "extreme" ? 9 : 12;
      this.alive = true;
      this.resolving = false;
      this.score = 0;
      this.round = 1;
      this.playerHp = 24;
      this.aiHp = 24;
      this.elapsed = 0;
      this.dangerMultiplier = 1;
      this.hand = HAND.map(function (c) { return Object.assign({}, c); });
      this.lanes = [null, null, null];
      this.aiLanes = [null, null, null];
      this.selectedCard = null;
      this.selectedLane = null;
      this.timeLeft = this.timerMax;
      this.laneWinStreak = 0;
    }
    create() {
      Kit.ensureAudio();
      if (window.PlatformBridge && PlatformBridge.setGameSessionActive) PlatformBridge.setGameSessionActive(true);
      makeTextures(this);
      this.cameras.main.setBackgroundColor("#100c06");
      this.cameras.main.fadeIn(200, 4, 6, 12);

      this.add.text(W / 2, 22, "CyberFortune 012 · 三線矩陣", {
        fontFamily: "Microsoft JhengHei, Segoe UI", fontSize: "18px", fontStyle: "bold", color: "#d4af37"
      }).setOrigin(0.5).setDepth(20);

      this.hud = this.add.text(16, 10, "", {
        fontFamily: "Segoe UI", fontSize: "13px", color: "#fbbf24"
      }).setDepth(20);
      this.hudDanger = this.add.text(16, 30, "DANGER x1.00", {
        fontFamily: "Segoe UI", fontSize: "12px", fontStyle: "bold", color: "#f472b6"
      }).setDepth(20);
      this.ruleTxt = this.add.text(W / 2, 48, "克制 0>2 · 1>0 · 2>1　｜　同號上線＝共振+45%　｜　三線齊出＝全餐×1.8", {
        fontFamily: "Microsoft JhengHei", fontSize: "12px", color: "#a8a29e"
      }).setOrigin(0.5).setDepth(20);
      this.timerTxt = this.add.text(W / 2, 70, "", {
        fontFamily: "Segoe UI", fontSize: "16px", color: "#f87171"
      }).setOrigin(0.5).setDepth(20);
      this.hintTxt = this.add.text(W / 2, 300, "先點手牌，再點線路 0／1／2 部署", {
        fontFamily: "Microsoft JhengHei", fontSize: "14px", color: "#fde68a"
      }).setOrigin(0.5).setDepth(20);
      this.mealTxt = this.add.text(W / 2, 322, "", {
        fontFamily: "Microsoft JhengHei", fontSize: "13px", fontStyle: "bold", color: "#fbbf24"
      }).setOrigin(0.5).setDepth(20);

      this.laneSprites = [];
      this.pLabels = [];
      this.aLabels = [];
      this.resLabels = [];
      var self = this;
      for (var i = 0; i < 3; i++) {
        var y = 108 + i * 62;
        var lane = this.add.image(W / 2, y, "cf-lane").setInteractive({ useHandCursor: true }).setDepth(3);
        lane.idx = i;
        lane.on("pointerdown", function () { self.pickLane(this.idx); });
        this.add.text(W / 2 - 250, y, "線路 " + i, {
          fontFamily: "Microsoft JhengHei", fontSize: "15px", fontStyle: "bold", color: "#d4af37"
        }).setOrigin(0.5).setDepth(4);
        this.laneSprites.push(lane);
        this.pLabels[i] = this.add.text(W / 2 - 70, y, "你: —", {
          fontFamily: "Segoe UI", fontSize: "15px", color: "#67e8f9"
        }).setOrigin(0.5).setDepth(4);
        this.aLabels[i] = this.add.text(W / 2 + 70, y, "AI: ?", {
          fontFamily: "Segoe UI", fontSize: "15px", color: "#f472b6"
        }).setOrigin(0.5).setDepth(4);
        this.resLabels[i] = this.add.text(W / 2 + 200, y, "", {
          fontFamily: "Microsoft JhengHei", fontSize: "12px", color: "#86efac"
        }).setOrigin(0.5).setDepth(4);
      }

      // 按鈕區在線路與手牌之間，避免擋牌
      this.btnClear = Kit.makeMenuButton(this, W / 2 - 200, 355, "重排", 0x78716c, function () {
        self.clearDeploy();
      }, 140);
      this.btnConfirm = Kit.makeMenuButton(this, W / 2, 355, "確認布陣", 0xd4af37, function () {
        self.confirm();
      }, 180);
      this.btnHelp = Kit.makeMenuButton(this, W / 2 + 200, 355, "局內說明", 0xa78bfa, function () {
        Kit.showHelpOverlay(self, resolveHelpHtml(), "CyberFortune 說明");
      }, 140);

      this.renderHand();
      this.refreshLanes();
      this.refreshHud();
      this.setHint("先點下方手牌，再點上方線路 0／1／2");
    }

    setHint(msg) {
      if (this.hintTxt) this.hintTxt.setText(msg);
    }

    isFullMeal() {
      return !!(this.lanes[0] && this.lanes[1] && this.lanes[2]);
    }

    lanePower(card, laneIdx) {
      if (!card) return 0;
      var base = 3;
      if (card.v === laneIdx) base *= 1.45;
      return base;
    }

    renderHand() {
      var self = this;
      if (this.handSprites) this.handSprites.forEach(function (s) { s.destroy(true); });
      this.handSprites = [];
      var n = this.hand.length;
      if (n === 0) {
        this.setHint("手牌已出完 — 可重排或直接確認布陣");
        return;
      }
      var gap = 96;
      var start = W / 2 - ((n - 1) * gap) / 2;
      this.hand.forEach(function (card, i) {
        var c = self.add.container(start + i * gap, 455).setDepth(12).setScale(0.92);
        var bg = self.add.image(0, 0, "cf-card").setTint(card.color).setInteractive({ useHandCursor: true });
        var t = self.add.text(0, -22, card.name, {
          fontFamily: "Microsoft JhengHei", fontSize: "12px", color: "#fff7ed", align: "center", wordWrap: { width: 72 }
        }).setOrigin(0.5);
        var v = self.add.text(0, 28, String(card.v), {
          fontFamily: "Segoe UI", fontSize: "26px", fontStyle: "bold", color: "#fde68a"
        }).setOrigin(0.5);
        bg.on("pointerdown", function () { self.pickCard(i); });
        c.add([bg, t, v]);
        self.handSprites.push(c);
        self.tweens.add({
          targets: c, y: { from: 490, to: 455 }, duration: 180, ease: "Back.easeOut", delay: i * 20
        });
      });
    }

    pickCard(i) {
      if (!this.alive || this.resolving) return;
      this.selectedCard = i;
      SFX.click();
      this.handSprites.forEach(function (s, idx) { s.setScale(idx === i ? 1.05 : 0.92); });
      this.setHint("已選「" + this.hand[i].name + "」— 點線路 " + this.hand[i].v + " 可觸發共振，或其他線路部署");
      if (this.selectedLane != null) this.deploy();
    }

    pickLane(i) {
      if (!this.alive || this.resolving) return;
      // 再點已部署線路 → 收回
      if (this.selectedCard == null && this.lanes[i]) {
        this.hand.push(this.lanes[i]);
        this.lanes[i] = null;
        this.renderHand();
        this.refreshLanes();
        this.setHint("已從線路 " + i + " 收回卡牌");
        SFX.click();
        return;
      }
      this.selectedLane = i;
      SFX.click();
      if (this.selectedCard != null) this.deploy();
      else this.setHint("線路 " + i + " 已選 — 點下方手牌完成部署");
    }

    deploy() {
      if (this.selectedCard == null || this.selectedLane == null) return;
      if (this.selectedCard < 0 || this.selectedCard >= this.hand.length) {
        this.selectedCard = null;
        this.selectedLane = null;
        return;
      }
      var laneIdx = this.selectedLane;
      if (this.lanes[laneIdx]) this.hand.push(this.lanes[laneIdx]);
      var card = this.hand.splice(this.selectedCard, 1)[0];
      this.lanes[laneIdx] = card;
      this.selectedCard = null;
      this.selectedLane = null;
      this.renderHand();
      this.refreshLanes();
      Kit.neonBurst(this, W / 2, 108 + laneIdx * 62, 0xd4af37, 12);
      SFX.place();
      var tip = "已部署到線路 " + laneIdx;
      if (card.v === laneIdx) tip += " · 共振啟動！";
      if (this.isFullMeal()) tip += " · 全餐就緒，可確認布陣";
      else tip += " · 可繼續部署或確認";
      this.setHint(tip);
    }

    clearDeploy() {
      if (!this.alive || this.resolving) return;
      for (var i = 0; i < 3; i++) {
        if (this.lanes[i]) {
          this.hand.push(this.lanes[i]);
          this.lanes[i] = null;
        }
      }
      this.selectedCard = null;
      this.selectedLane = null;
      this.renderHand();
      this.refreshLanes();
      this.setHint("已重排 — 重新選擇手牌與線路");
      SFX.click();
    }

    refreshLanes() {
      for (var i = 0; i < 3; i++) {
        var card = this.lanes[i];
        if (this.pLabels[i]) {
          this.pLabels[i].setText(card ? ("你: " + card.v) : "你: —");
        }
        if (this.resLabels[i]) {
          if (card && card.v === i) this.resLabels[i].setText("共振");
          else this.resLabels[i].setText("");
        }
      }
      if (this.mealTxt) {
        this.mealTxt.setText(this.isFullMeal() ? "🍱 全餐開陣就緒（確認後總傷 ×1.8）" : "");
      }
    }

    refreshHud() {
      this.hud.setText("R" + this.round + "  YOU " + Math.max(0, this.playerHp) + "  AI " + Math.max(0, this.aiHp) + "  SCORE " + this.score);
      this.timerTxt.setText("部署 " + Math.max(0, this.timeLeft).toFixed(1) + "s · " + this.diff.label);
    }

    confirm() {
      if (!this.alive || this.resolving) return;
      this.resolving = true;
      this.selectedCard = null;
      this.selectedLane = null;

      // 若完全沒部署：自動把第一張牌放到線路 0，避免「空按確認」莫名掉血卻不懂
      var deployed = this.lanes.filter(Boolean).length;
      if (deployed === 0 && this.hand.length > 0) {
        this.lanes[0] = this.hand.shift();
        this.renderHand();
        this.refreshLanes();
        this.setHint("未部署 — 已自動將首牌放到線路 0");
      }

      for (var i = 0; i < 3; i++) {
        var pv = this.lanes[i] ? this.lanes[i].v : Phaser.Math.Between(0, 2);
        var av;
        if (Math.random() < this.aiSkill) av = (pv + 1) % 3;
        else av = Phaser.Math.Between(0, 2);
        this.aiLanes[i] = { v: av };
        if (this.aLabels[i]) this.aLabels[i].setText("AI: " + av);
      }

      var meal = this.isFullMeal() ? 1.8 : 1;
      var pDmg = 0, aDmg = 0, wins = 0;
      var results = [];
      for (var j = 0; j < 3; j++) {
        var card = this.lanes[j];
        if (!card) {
          aDmg += 2;
          results.push("線" + j + " 空線-2");
          if (this.resLabels[j]) this.resLabels[j].setText("空線");
          continue;
        }
        var av2 = this.aiLanes[j].v;
        var r = beats(card.v, av2);
        var pow = this.lanePower(card, j);
        if (r > 0) {
          var deal = Math.floor(pow * meal);
          pDmg += deal;
          wins += 1;
          results.push("線" + j + " 勝+" + deal);
          if (this.resLabels[j]) this.resLabels[j].setText("勝 +" + deal);
        } else if (r < 0) {
          aDmg += 3;
          results.push("線" + j + " 負");
          if (this.resLabels[j]) this.resLabels[j].setText("負");
        } else {
          pDmg += 1;
          aDmg += 1;
          results.push("線" + j + " 平");
          if (this.resLabels[j]) this.resLabels[j].setText("平");
        }
      }

      pDmg = Math.floor(pDmg * this.diff.scoreMult * (0.9 + this.dangerMultiplier * 0.1));
      aDmg = Math.floor(aDmg * (0.9 + this.dangerMultiplier * 0.12));
      this.aiHp -= pDmg;
      this.playerHp -= aDmg;
      var roundScore = pDmg * 40 + wins * 30;
      if (wins >= 2) {
        this.laneWinStreak += 1;
        roundScore += this.laneWinStreak * 50;
      } else {
        this.laneWinStreak = 0;
      }
      this.score += roundScore;

      if (pDmg > aDmg) {
        SFX.score();
        Kit.neonBurst(this, W / 2, H / 2, 0x34d399, 20);
      } else {
        SFX.hit();
        Kit.screenShake(this, 100, 0.012);
        Kit.neonBurst(this, W / 2, H / 2, 0xf472b6, 18);
      }

      this.setHint((meal > 1 ? "全餐 ×1.8 · " : "") + results.join("／") + " → 你造成 " + pDmg + "　挨打 " + aDmg);

      var self = this;
      this.time.delayedCall(1100, function () {
        if (!self.alive) return;
        self.lanes = [null, null, null];
        self.aiLanes = [null, null, null];
        self.round += 1;
        self.timeLeft = self.timerMax;
        self.resolving = false;
        if (self.hand.length < 3) {
          self.hand = HAND.map(function (c) { return Object.assign({}, c); });
        }
        self.renderHand();
        self.refreshLanes();
        for (var k = 0; k < 3; k++) {
          if (self.aLabels[k]) self.aLabels[k].setText("AI: ?");
        }
        self.refreshHud();
        self.setHint("新回合 — 部署卡牌後確認布陣");
        if (self.aiHp <= 0) self.endDuel(true);
        else if (self.playerHp <= 0) self.endDuel(false);
      });
    }

    update(_t, delta) {
      if (!this.alive) return;
      var dt = delta / 1000;
      this.elapsed += dt;
      this.dangerMultiplier = Kit.calcDanger(this.elapsed);
      this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
      if (!this.resolving) {
        this.timeLeft -= dt;
        this.refreshHud();
        if (this.timeLeft <= 0) {
          this.timeLeft = this.timerMax;
          this.confirm();
        }
      } else {
        this.refreshHud();
      }
    }

    endDuel(win) {
      if (!this.alive) return;
      this.alive = false;
      if (win) { this.score += 1000; SFX.win(); } else SFX.over();
      var grade = this.score >= 6000 ? "S" : this.score >= 4000 ? "A" : this.score >= 2500 ? "B" : this.score >= 1200 ? "C" : "D";
      var self = this;
      this.time.delayedCall(450, function () {
        self.scene.start("GameOverModal", {
          score: self.score,
          grade: grade,
          danger: self.dangerMultiplier,
          difficulty: self.diffKey,
          win: win,
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
    subtitle: "三線矩陣 · 012 克制 · 同號共振 · 全餐自動開陣",
    badge: "CYBER FORTUNE",
    accent: 0xd4af37,
    helpHtml: resolveHelpHtml(),
    makeTextures: makeTextures,
    briefFn: function (diff) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diff)];
      return [
        { title: "怎麼玩", body: "點手牌→點線路 0/1/2。可收回重布，再按確認布陣開戰。" },
        { title: "怎麼贏", body: "0克2、1克0、2克1。同號上線有共振；三線齊出觸發全餐。" },
        { title: "難度", body: d.label + " 會改變 AI 精準度與部署時限。" }
      ];
    },
    GameScene: GameScene
  });
})();
