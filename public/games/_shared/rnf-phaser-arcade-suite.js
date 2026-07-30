(function () {
  "use strict";

  var W = 960;
  var H = 540;
  var DEFAULT_SLUG = "rnf-suite";
  var DIFF_PRESETS = {
    casual: { id: "casual", label: "Casual 輕鬆", base: 0.78, scoreMult: 1.0, color: "#67e8f9" },
    standard: { id: "standard", label: "Standard 電競", base: 1.0, scoreMult: 1.25, color: "#a78bfa" },
    extreme: { id: "extreme", label: "Extreme 狂暴", base: 1.38, scoreMult: 1.65, color: "#f472b6" }
  };

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
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t0 + dur);
    gain.gain.setValueAtTime((vol || 0.09) * master, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  var SFX = {
    click: function () { beep(560, 0.05, "triangle", 0.06); },
    confirm: function () { beep(680, 0.08, "square", 0.08); beep(920, 0.1, "square", 0.06); },
    jump: function () { beep(280, 0.1, "sawtooth", 0.09, 620); },
    score: function () { beep(760, 0.08, "square", 0.1); beep(960, 0.09, "triangle", 0.07); },
    hit: function () { beep(170, 0.12, "sawtooth", 0.12, 70); },
    slash: function () { beep(440, 0.06, "sawtooth", 0.08, 980); },
    dash: function () { beep(200, 0.08, "triangle", 0.08, 700); },
    shoot: function () { beep(620, 0.04, "square", 0.06, 520); },
    pinball: function () { beep(840, 0.05, "square", 0.08); beep(1120, 0.05, "triangle", 0.05); },
    beat: function () { beep(700, 0.05, "triangle", 0.07); },
    explode: function () { beep(120, 0.22, "sawtooth", 0.14, 40); beep(92, 0.25, "triangle", 0.08, 30); },
    over: function () { beep(220, 0.18, "sawtooth", 0.12, 80); beep(140, 0.35, "triangle", 0.09, 50); }
  };

  function makeTextures(scene) {
    var g = scene.make.graphics({ x: 0, y: 0, add: false });

    g.clear();
    g.fillStyle(0x22d3ee, 1);
    g.fillCircle(16, 16, 14);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(11, 11, 5);
    g.generateTexture("player-orb", 32, 32);

    g.clear();
    g.fillStyle(0x06b6d4, 1);
    g.fillRoundedRect(4, 10, 40, 12, 5);
    g.fillStyle(0x67e8f9, 1);
    g.fillRect(8, 13, 32, 6);
    g.generateTexture("paddle", 48, 32);

    g.clear();
    g.fillStyle(0x22d3ee, 1);
    g.fillRoundedRect(0, 4, 120, 16, 7);
    g.fillStyle(0xffffff, 0.4);
    g.fillRoundedRect(10, 7, 36, 6, 3);
    g.generateTexture("flipper", 120, 24);

    g.clear();
    g.fillStyle(0xf472b6, 1);
    g.fillTriangle(16, 2, 30, 28, 2, 28);
    g.fillStyle(0xffffff, 0.32);
    g.fillCircle(16, 16, 4);
    g.generateTexture("drone", 32, 32);

    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(12, 12, 10);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(8, 8, 3);
    g.generateTexture("ball", 24, 24);

    g.clear();
    g.fillStyle(0x818cf8, 1);
    g.fillRoundedRect(0, 0, 64, 20, 8);
    g.fillStyle(0xffffff, 0.15);
    g.fillRoundedRect(4, 4, 56, 6, 4);
    g.generateTexture("bumper-bar", 64, 20);

    g.clear();
    g.fillStyle(0xfb7185, 1);
    g.fillRoundedRect(0, 0, 20, 72, 8);
    g.generateTexture("note", 20, 72);

    g.clear();
    g.fillStyle(0x34d399, 1);
    g.fillRect(0, 0, 68, 28);
    g.fillStyle(0xffffff, 0.18);
    g.fillRect(6, 4, 54, 8);
    g.generateTexture("runner", 68, 28);

    g.clear();
    g.fillStyle(0xe879f9, 1);
    g.fillRect(0, 0, 40, 40);
    g.fillStyle(0xffffff, 0.2);
    g.fillRect(6, 6, 28, 10);
    g.generateTexture("block", 40, 40);

    g.clear();
    g.fillStyle(0x10b981, 1);
    g.fillCircle(10, 10, 10);
    g.generateTexture("xp", 20, 20);

    g.clear();
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 8, 3);
    g.generateTexture("bullet", 8, 3);

    g.clear();
    g.fillStyle(0x67e8f9, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-cyan", 8, 8);

    g.clear();
    g.fillStyle(0xa78bfa, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-violet", 8, 8);

    g.clear();
    g.fillStyle(0xf472b6, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-pink", 8, 8);

    g.clear();
    g.fillStyle(0xfbbf24, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-gold", 8, 8);

    g.clear();
    g.fillStyle(0x34d399, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture("spark-green", 8, 8);

    g.destroy();
  }

  function neonBurst(scene, x, y, key, count) {
    var n = Phaser.Math.Clamp(count || 20, 15, 30);
    var emitter = scene.add.particles(x, y, key, {
      speed: { min: 70, max: 280 },
      angle: { min: 0, max: 360 },
      lifespan: { min: 260, max: 640 },
      scale: { start: 1.1, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 120,
      blendMode: "ADD",
      emitting: false
    });
    emitter.explode(n);
    scene.time.delayedCall(700, function () { emitter.destroy(); });
  }

  function pulseButton(scene, target) {
    scene.tweens.add({
      targets: target,
      scale: 1.08,
      duration: 90,
      yoyo: true,
      ease: "Back.easeOut"
    });
  }

  function makeMenuButton(scene, x, y, label, fill, onClick, width) {
    var bw = width || 300;
    var bh = width && width <= 220 ? 44 : 50;
    var bg = scene.add.rectangle(x, y, bw, bh, fill, 0.2)
      .setStrokeStyle(2, fill, 0.85)
      .setInteractive({ useHandCursor: true });
    var txt = scene.add.text(x, y, label, {
      fontFamily: "Segoe UI, Microsoft JhengHei, sans-serif",
      fontSize: bw <= 220 ? "16px" : "18px",
      fontStyle: "bold",
      color: "#e2e8f0"
    }).setOrigin(0.5);
    bg.on("pointerover", function () {
      scene.tweens.add({ targets: [bg, txt], scale: 1.05, duration: 120, ease: "Cubic.easeOut" });
    });
    bg.on("pointerout", function () {
      scene.tweens.add({ targets: [bg, txt], scale: 1, duration: 120, ease: "Cubic.easeOut" });
    });
    bg.on("pointerdown", function () {
      pulseButton(scene, bg);
      pulseButton(scene, txt);
      SFX.click();
      onClick();
    });
    return { bg: bg, txt: txt };
  }

  function drawBackdrop(scene, accent) {
    scene.cameras.main.setBackgroundColor("#050814");
    scene.add.rectangle(W / 2, H / 2, W, H, 0x050814);
    for (var i = 0; i < 36; i++) {
      var star = scene.add.circle(
        Phaser.Math.Between(0, W),
        Phaser.Math.Between(0, H),
        Phaser.Math.Between(1, 2),
        accent || 0x22d3ee,
        Phaser.Math.FloatBetween(0.12, 0.5)
      );
      scene.tweens.add({
        targets: star,
        alpha: 0.08,
        duration: Phaser.Math.Between(800, 1800),
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
    var grid = scene.add.graphics().setAlpha(0.12);
    grid.lineStyle(1, accent || 0x22d3ee, 1);
    for (var x = 0; x < W; x += 40) grid.lineBetween(x, 0, x, H);
    for (var y = 0; y < H; y += 40) grid.lineBetween(0, y, W, y);
  }

  function uiFloat(scene, x, y, label, color) {
    var floater = scene.add.text(x, y, label, {
      fontFamily: "Segoe UI, sans-serif",
      fontSize: "20px",
      fontStyle: "bold",
      color: color || "#fbbf24"
    }).setOrigin(0.5).setDepth(40);
    scene.tweens.add({
      targets: floater,
      y: y - 50,
      alpha: 0,
      scale: 1.25,
      duration: 500,
      ease: "Cubic.easeOut",
      onComplete: function () { floater.destroy(); }
    });
  }

  var MODES = {
    "cyber-blade-dash": {
      slug: "cyber-blade-dash",
      title: "CYBER BLADE DASH",
      titleZh: "賽博光刃切擊",
      accent: 0x22d3ee,
      help: "WASD / 方向鍵移動，Space 斬擊，Shift 突進，斬破無人機並吸收能量核心。",
      objective: "斬擊無人機 · 吸收核心 · 維持護盾",
      scoreVerb: "CHAIN",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.player = scene.physics.add.sprite(W / 2, H / 2, "player-orb");
        scene.player.setTint(0x22d3ee);
        scene.player.setDrag(1200, 1200);
        scene.player.setMaxVelocity(330, 330);
        scene.player.setCollideWorldBounds(true);
        scene.player.hp = 5;
        scene.player.invuln = 0;
        scene.combo = 0;
        scene.dashCd = 0;
        scene.slashCd = 0;
        scene.spawnAcc = 0;
        scene.energyAcc = 0;
        scene.enemies = scene.physics.add.group();
        scene.pickups = scene.physics.add.group();
        scene.physics.add.overlap(scene.player, scene.enemies, function (_p, enemy) {
          if (scene.player.invuln > 0 || !scene.alive || !enemy.active) return;
          enemy.destroy();
          scene.player.hp -= 1;
          scene.player.invuln = 1.1;
          scene.combo = 0;
          SFX.hit();
          scene.cameras.main.shake(150, 0.018);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-pink", 24);
          if (scene.player.hp <= 0) scene.gameOver();
        });
        scene.physics.add.overlap(scene.player, scene.pickups, function (_p, pickup) {
          if (!pickup.active) return;
          scene.score += Math.floor(110 * scene.diff.scoreMult * (0.75 + scene.dangerMultiplier * 0.25));
          pickup.destroy();
          SFX.score();
          scene.cameras.main.shake(100, 0.01);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-gold", 18);
          uiFloat(scene, scene.player.x, scene.player.y - 18, "+ENERGY", "#fbbf24");
        });
      },
      updateState: function (scene, dt, threat) {
        var left = scene.cursors.left.isDown || scene.keys.A.isDown;
        var right = scene.cursors.right.isDown || scene.keys.D.isDown;
        var up = scene.cursors.up.isDown || scene.keys.W.isDown;
        var down = scene.cursors.down.isDown || scene.keys.S.isDown;
        var dash = scene.shiftKey.isDown;
        var slash = Phaser.Input.Keyboard.JustDown(scene.cursors.space) || Phaser.Input.Keyboard.JustDown(scene.keys.SPACE);
        var vx = 0;
        var vy = 0;
        if (left) vx -= 1;
        if (right) vx += 1;
        if (up) vy -= 1;
        if (down) vy += 1;
        var vec = new Phaser.Math.Vector2(vx, vy);
        if (vec.lengthSq() > 0) vec.normalize();
        scene.player.setAcceleration(vec.x * 1700, vec.y * 1700);
        scene.player.invuln = Math.max(0, scene.player.invuln - dt);
        scene.dashCd = Math.max(0, scene.dashCd - dt);
        scene.slashCd = Math.max(0, scene.slashCd - dt);
        if (scene.player.invuln > 0) {
          scene.player.setAlpha(scene.player.alpha === 1 ? 0.45 : 1);
        } else {
          scene.player.setAlpha(1);
        }
        if (dash && scene.dashCd <= 0 && vec.lengthSq() > 0) {
          scene.player.setVelocity(vec.x * 560, vec.y * 560);
          scene.dashCd = 1.6;
          SFX.dash();
          neonBurst(scene, scene.player.x, scene.player.y, "spark-cyan", 16);
        }
        if (slash && scene.slashCd <= 0) {
          scene.slashCd = 0.42;
          SFX.slash();
          scene.cameras.main.shake(100, 0.01);
          var ring = scene.add.circle(scene.player.x, scene.player.y, 74, 0x22d3ee, 0.16).setStrokeStyle(3, 0x22d3ee, 0.95);
          scene.tweens.add({ targets: ring, scale: 1.3, alpha: 0, duration: 180, ease: "Cubic.easeOut", onComplete: function () { ring.destroy(); } });
          neonBurst(scene, scene.player.x, scene.player.y, "spark-cyan", 22);
          scene.enemies.getChildren().forEach(function (enemy) {
            if (!enemy.active) return;
            if (Phaser.Math.Distance.Between(enemy.x, enemy.y, scene.player.x, scene.player.y) <= 88) {
              enemy.destroy();
              scene.combo += 1;
              var gain = Math.floor((100 + scene.combo * 18) * scene.diff.scoreMult * (0.9 + threat * 0.12));
              scene.score += gain;
              uiFloat(scene, enemy.x, enemy.y, "+" + gain, "#67e8f9");
              neonBurst(scene, enemy.x, enemy.y, "spark-violet", 18);
            }
          });
        }
        scene.spawnAcc += dt;
        scene.energyAcc += dt;
        if (scene.spawnAcc >= Math.max(0.32, 1.05 / threat)) {
          scene.spawnAcc = 0;
          var sx = Phaser.Math.Between(0, 1) ? Phaser.Math.Between(-20, W + 20) : (Phaser.Math.Between(0, 1) ? -20 : W + 20);
          var sy = sx < 0 || sx > W ? Phaser.Math.Between(20, H - 20) : (Phaser.Math.Between(0, 1) ? -20 : H + 20);
          var enemy = scene.enemies.create(sx, sy, "drone").setBlendMode(Phaser.BlendModes.ADD);
          enemy.setData("speed", Phaser.Math.Between(78, 118));
        }
        if (scene.energyAcc >= Math.max(1.35, 3 / threat)) {
          scene.energyAcc = 0;
          var pickup = scene.pickups.create(Phaser.Math.Between(70, W - 70), Phaser.Math.Between(70, H - 70), "xp");
          pickup.setTint(0xfbbf24);
          scene.tweens.add({ targets: pickup, scale: 1.25, alpha: 0.5, duration: 450, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
          scene.time.delayedCall(6000, function () { if (pickup.active) pickup.destroy(); });
        }
        scene.enemies.getChildren().forEach(function (enemy) {
          if (!enemy.active) return;
          var angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
          var speed = enemy.getData("speed") * threat;
          enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          enemy.rotation += dt * 3;
        });
        scene.setExtraHud("HP " + scene.player.hp + " · COMBO " + scene.combo);
      }
    },
    "neon-pinball-frenzy": {
      slug: "neon-pinball-frenzy",
      title: "NEON PINBALL FRENZY",
      titleZh: "霓虹狂暴彈珠台",
      accent: 0xf472b6,
      help: "←／A 左擋板、→／D 右擋板揮擊；Space 震台（連震 3 次 TILT）。撞 Bumper、擊破目標牆、點亮 R·N·F、打遊走核心完成任務；連撞進 Fever，大獎可觸發雙球。",
      objective: "任務連破 · 目標牆 · Fever · 雙球狂潮",
      scoreVerb: "HITS",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.physics.world.gravity.y = 800;

        // 場館氛圍線
        scene.add.rectangle(W / 2, H / 2, W - 48, H - 36, 0x07101c, 0.55).setStrokeStyle(2, 0xf472b6, 0.25);
        scene.add.rectangle(W / 2, 88, 220, 56, 0x0b1220, 0.5).setStrokeStyle(1, 0xfbbf24, 0.55);
        scene.add.text(W / 2, 72, "SKILL SHOT", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "11px", fontStyle: "bold", color: "#fbbf24"
        }).setOrigin(0.5);

        scene.topWall = scene.add.rectangle(W / 2, 10, W - 40, 20, 0x0f172a).setStrokeStyle(2, 0xf472b6, 0.45);
        scene.leftWall = scene.add.rectangle(14, H / 2 - 20, 28, H - 40, 0x0f172a).setStrokeStyle(2, 0x22d3ee, 0.35);
        scene.rightWall = scene.add.rectangle(W - 14, H / 2 - 20, 28, H - 40, 0x0f172a).setStrokeStyle(2, 0xa78bfa, 0.35);
        scene.leftShelf = scene.add.rectangle(150, H - 28, 260, 56, 0x111827).setStrokeStyle(2, 0x334155, 0.8);
        scene.rightShelf = scene.add.rectangle(W - 150, H - 28, 260, 56, 0x111827).setStrokeStyle(2, 0x334155, 0.8);
        scene.leftSling = scene.add.rectangle(210, H - 150, 70, 18, 0x22d3ee, 0.35).setAngle(-28).setStrokeStyle(2, 0x22d3ee, 0.8);
        scene.rightSling = scene.add.rectangle(W - 210, H - 150, 70, 18, 0xa78bfa, 0.35).setAngle(28).setStrokeStyle(2, 0xa78bfa, 0.8);
        [scene.topWall, scene.leftWall, scene.rightWall, scene.leftShelf, scene.rightShelf].forEach(function (wall) {
          scene.physics.add.existing(wall, true);
        });
        scene.physics.add.existing(scene.leftSling, true);
        scene.physics.add.existing(scene.rightSling, true);

        scene.leftFlipper = scene.physics.add.sprite(W / 2 - 78, H - 78, "flipper").setImmovable(true);
        scene.rightFlipper = scene.physics.add.sprite(W / 2 + 78, H - 78, "flipper").setImmovable(true);
        scene.leftFlipper.body.allowGravity = false;
        scene.rightFlipper.body.allowGravity = false;
        scene.leftFlipper.body.setSize(118, 18);
        scene.rightFlipper.body.setSize(118, 18);
        scene.leftFlipper.setTint(0x22d3ee);
        scene.rightFlipper.setTint(0xa78bfa);
        scene.leftFlipper.setAngle(12);
        scene.rightFlipper.setAngle(-12);

        scene.balls = scene.physics.add.group();
        scene.spawnPinball = function (x, y, vx, vy) {
          var ball = scene.balls.create(x, y, "ball");
          ball.setCircle(10);
          ball.setBounce(0.68, 0.68);
          ball.setCollideWorldBounds(false);
          ball.setMaxVelocity(740, 740);
          if (typeof ball.setDamping === "function") ball.setDamping(true);
          ball.setDrag(4, 4);
          ball.setVelocity(vx, vy);
          ball.setTint(0xfde68a);
          ball.setData("serveGrace", 0.55);
          return ball;
        };
        // 從右側發射道送出，避免出生在中央落球縫直接出局
        scene.spawnPinball(W - 70, H - 210, -320, -360);

        scene.ballLives = 3;
        scene.hitCombo = 0;
        scene.feverTimer = 0;
        scene.feverMult = 1;
        scene.playMult = 1;
        scene.tiltCount = 0;
        scene.tiltCool = 0;
        scene.tilted = 0;
        scene.tiltDecay = 0;
        scene.comboIdle = 0;
        scene.leftKickCool = 0;
        scene.rightKickCool = 0;
        scene.prevTouchLeft = false;
        scene.prevTouchRight = false;
        scene.touchLeft = false;
        scene.touchRight = false;
        scene.skillShotOpen = true;
        scene.skillShotTimer = 2.4;
        scene.jackpot = 2500;
        scene.missionIndex = 0;
        scene.missionProgress = 0;
        scene.missions = [
          { id: "bump", label: "撞擊 Bumper", need: 6, reward: "BUMPER" },
          { id: "drops", label: "擊破目標牆", need: 3, unit: "DROP" },
          { id: "letters", label: "點亮 R·N·F", need: 3, unit: "LANE" },
          { id: "orbit", label: "打中遊走核心", need: 3, unit: "CORE" },
          { id: "hold", label: "Fever 續航", need: 4, unit: "SEC" }
        ];
        scene.letterLit = [false, false, false];
        scene.dropCleared = 0;
        scene.orbitHits = 0;
        scene.feverHoldAcc = 0;
        scene.multiballTimer = 0;
        scene.bonusOrbTimer = 0;
        scene.bumperColors = [0x22d3ee, 0xf472b6, 0xa78bfa, 0xfbbf24, 0x34d399];

        function award(base, x, y, tag, color) {
          var gain = Math.floor(base * scene.diff.scoreMult * scene.feverMult * scene.playMult * (0.85 + scene.dangerMultiplier * 0.15));
          scene.score += gain;
          scene.jackpot = Math.min(20000, scene.jackpot + Math.floor(gain * 0.08));
          uiFloat(scene, x, y, (tag ? tag + " " : "") + "+" + gain, color || "#f472b6");
          return gain;
        }

        function advanceMission(amount, sourceId) {
          var m = scene.missions[scene.missionIndex];
          if (!m) return;
          if (m.id === "bump" && sourceId !== "bump") return;
          if (m.id === "drops" && sourceId !== "drops") return;
          if (m.id === "letters" && sourceId !== "letters") return;
          if (m.id === "orbit" && sourceId !== "orbit") return;
          if (m.id === "hold" && sourceId !== "hold") return;
          scene.missionProgress += amount;
          if (scene.missionProgress >= m.need) {
            var bonus = Math.floor((1200 + scene.missionIndex * 350 + scene.jackpot * 0.15) * scene.diff.scoreMult * scene.playMult);
            scene.score += bonus;
            scene.playMult = Math.min(5, scene.playMult + 0.25);
            SFX.score();
            scene.cameras.main.shake(140, 0.018);
            neonBurst(scene, W / 2, 160, "spark-gold", 28);
            uiFloat(scene, W / 2, 150, "任務完成 +" + bonus, "#fbbf24");
            scene.missionIndex = (scene.missionIndex + 1) % scene.missions.length;
            scene.missionProgress = 0;
            scene.feverHoldAcc = 0;
            if (scene.missionIndex % 2 === 0) {
              scene.multiballTimer = 10;
              if (scene.balls.countActive(true) < 2) {
                scene.spawnPinball(W / 2 - 120, 210, -140, -300);
                scene.spawnPinball(W / 2 + 120, 210, 140, -300);
              }
              uiFloat(scene, W / 2, 200, "MULTIBALL!", "#67e8f9");
              SFX.explode();
            }
            refreshMissionHud();
          } else {
            refreshMissionHud();
          }
        }

        function refreshMissionHud() {
          var m = scene.missions[scene.missionIndex];
          scene.missionHud.setText("任務 " + (scene.missionIndex + 1) + "/5  " + m.label + "  " + scene.missionProgress + "/" + m.need);
        }

        scene.awardPin = award;
        scene.advanceMission = advanceMission;

        // Bumper
        scene.bumpers = scene.physics.add.staticGroup();
        [
          [W / 2 - 40, 175],
          [W / 2 + 40, 175],
          [W / 2 - 175, 250],
          [W / 2 + 175, 250],
          [W / 2, 310]
        ].forEach(function (item, idx) {
          var bumper = scene.bumpers.create(item[0], item[1], "ball").setDisplaySize(36, 36).refreshBody();
          bumper.setTint(scene.bumperColors[idx]);
          bumper.setData("baseTint", scene.bumperColors[idx]);
          bumper.setData("hitCool", 0);
        });

        // 目標牆（Drop targets）
        scene.dropTargets = scene.physics.add.staticGroup();
        scene.dropStates = [true, true, true];
        [-54, 0, 54].forEach(function (ox, idx) {
          var drop = scene.dropTargets.create(W / 2 + ox, 118, "bumper-bar");
          drop.setDisplaySize(48, 16).refreshBody();
          drop.setTint(0xf472b6);
          drop.setData("idx", idx);
          drop.setData("alive", true);
        });

        // R N F 滾道燈
        scene.letterZones = [];
        scene.letterLabels = [];
        ["R", "N", "F"].forEach(function (ch, idx) {
          var x = W / 2 - 120 + idx * 120;
          var zone = scene.add.rectangle(x, 52, 56, 22, 0x0f172a, 0.7).setStrokeStyle(2, 0x64748b, 0.9);
          scene.physics.add.existing(zone, true);
          zone.body.setSize(56, 22);
          zone.setData("idx", idx);
          scene.letterZones.push(zone);
          var lab = scene.add.text(x, 52, ch, {
            fontFamily: "Segoe UI, sans-serif", fontSize: "16px", fontStyle: "bold", color: "#64748b"
          }).setOrigin(0.5);
          scene.letterLabels.push(lab);
        });

        // 遊走核心
        scene.orbitCore = scene.physics.add.sprite(W / 2, 240, "xp");
        scene.orbitCore.setDisplaySize(22, 22);
        scene.orbitCore.body.allowGravity = false;
        scene.orbitCore.setImmovable(true);
        scene.orbitCore.setTint(0x34d399);
        scene.orbitAngle = 0;
        scene.orbitHitCool = 0;

        // 旋轉加分器（視覺）
        scene.spinner = scene.add.rectangle(W / 2 - 220, 340, 28, 28, 0xfbbf24, 0.85).setStrokeStyle(2, 0xfde68a, 1);
        scene.physics.add.existing(scene.spinner, true);
        scene.spinnerHitCool = 0;

        scene.bonusOrbs = scene.physics.add.group();

        scene.missionHud = scene.add.text(W / 2, H - 14, "", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#e2e8f0"
        }).setOrigin(0.5, 1).setDepth(25);
        scene.modeHud = scene.add.text(W / 2, 36, "", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "12px", fontStyle: "bold", color: "#94a3b8"
        }).setOrigin(0.5, 0).setDepth(25);
        refreshMissionHud();

        function onBumper(ball, bumper) {
          if (bumper.getData("hitCool") > 0) return;
          bumper.setData("hitCool", 0.08);
          scene.hitCombo += 1;
          scene.comboIdle = 0;
          if (scene.hitCombo >= 8) {
            scene.feverTimer = Math.max(scene.feverTimer, 5);
            scene.feverMult = 2;
          }
          var angle = Phaser.Math.Angle.Between(bumper.x, bumper.y, ball.x, ball.y);
          var threatNow = scene.dangerMultiplier * scene.diff.base;
          var power = (350 + Math.min(scene.hitCombo, 18) * 10) * (0.92 + threatNow * 0.05);
          ball.setVelocity(Math.cos(angle) * power, Math.sin(angle) * power - 50);
          award(80 + scene.hitCombo * 12, bumper.x, bumper.y - 18, scene.feverMult > 1 ? "FEVER" : "", scene.feverMult > 1 ? "#fbbf24" : "#f472b6");
          SFX.pinball();
          scene.cameras.main.shake(90, 0.01);
          neonBurst(scene, bumper.x, bumper.y, scene.feverMult > 1 ? "spark-gold" : "spark-pink", Phaser.Math.Between(16, 24));
          scene.tweens.add({ targets: bumper, scale: 1.22, duration: 70, yoyo: true, ease: "Back.easeOut" });
          advanceMission(1, "bump");
        }

        function onDrop(ball, drop) {
          if (!drop.getData("alive")) return;
          drop.setData("alive", false);
          drop.setActive(false).setVisible(false);
          drop.body.enable = false;
          scene.dropStates[drop.getData("idx")] = false;
          scene.dropCleared += 1;
          award(220, drop.x, drop.y - 16, "DROP", "#fb7185");
          SFX.slash();
          neonBurst(scene, drop.x, drop.y, "spark-pink", 20);
          advanceMission(1, "drops");
          var allDown = scene.dropStates.every(function (v) { return !v; });
          if (allDown) {
            var jp = Math.floor(scene.jackpot * scene.playMult * scene.diff.scoreMult);
            scene.score += jp;
            uiFloat(scene, W / 2, 130, "JACKPOT +" + jp, "#fbbf24");
            neonBurst(scene, W / 2, 130, "spark-gold", 30);
            SFX.explode();
            scene.cameras.main.shake(180, 0.022);
            scene.jackpot = 2500;
            scene.feverTimer = Math.max(scene.feverTimer, 6);
            scene.feverMult = 2;
            scene.time.delayedCall(700, function () {
              scene.dropTargets.getChildren().forEach(function (d, i) {
                d.setData("alive", true);
                d.setActive(true).setVisible(true);
                d.body.enable = true;
                scene.dropStates[i] = true;
              });
            });
          }
        }

        scene.physics.add.collider(scene.balls, scene.topWall);
        scene.physics.add.collider(scene.balls, scene.leftWall);
        scene.physics.add.collider(scene.balls, scene.rightWall);
        scene.physics.add.collider(scene.balls, scene.leftShelf);
        scene.physics.add.collider(scene.balls, scene.rightShelf);
        scene.physics.add.collider(scene.balls, scene.leftSling, function (ball) {
          if (!ball || !ball.body || typeof ball.setVelocity !== "function") return;
          ball.setVelocity(Math.abs(ball.body.velocity.x) + 180, -Math.abs(ball.body.velocity.y) - 160);
          SFX.dash();
          neonBurst(scene, scene.leftSling.x, scene.leftSling.y, "spark-cyan", 15);
        });
        scene.physics.add.collider(scene.balls, scene.rightSling, function (ball) {
          if (!ball || !ball.body || typeof ball.setVelocity !== "function") return;
          ball.setVelocity(-(Math.abs(ball.body.velocity.x) + 180), -Math.abs(ball.body.velocity.y) - 160);
          SFX.dash();
          neonBurst(scene, scene.rightSling.x, scene.rightSling.y, "spark-violet", 15);
        });
        scene.physics.add.collider(scene.balls, scene.bumpers, onBumper);
        scene.physics.add.collider(scene.balls, scene.dropTargets, onDrop);
        scene.physics.add.collider(scene.balls, scene.leftFlipper);
        scene.physics.add.collider(scene.balls, scene.rightFlipper);
        scene.physics.add.overlap(scene.balls, scene.orbitCore, function (ball) {
          if (scene.orbitHitCool > 0) return;
          scene.orbitHitCool = 0.35;
          scene.orbitHits += 1;
          award(160, scene.orbitCore.x, scene.orbitCore.y - 18, "CORE", "#34d399");
          SFX.score();
          neonBurst(scene, scene.orbitCore.x, scene.orbitCore.y, "spark-green", 20);
          ball.setVelocity(ball.body.velocity.x * 0.4 + Phaser.Math.Between(-120, 120), -320);
          advanceMission(1, "orbit");
        });
        scene.physics.add.overlap(scene.balls, scene.spinner, function (ball) {
          if (scene.spinnerHitCool > 0) return;
          scene.spinnerHitCool = 0.25;
          scene.spinner.rotation += 1.2;
          award(70, scene.spinner.x, scene.spinner.y - 16, "SPIN", "#fde68a");
          SFX.pinball();
          ball.setVelocityY(ball.body.velocity.y - 80);
        });
        scene.letterZones.forEach(function (zone) {
          scene.physics.add.overlap(scene.balls, zone, function () {
            var idx = zone.getData("idx");
            if (scene.letterLit[idx]) return;
            scene.letterLit[idx] = true;
            zone.setStrokeStyle(2, 0x67e8f9, 1);
            scene.letterLabels[idx].setColor("#67e8f9");
            award(150, zone.x, zone.y + 18, "LANE", "#67e8f9");
            SFX.confirm();
            advanceMission(1, "letters");
            if (scene.letterLit.every(Boolean)) {
              scene.playMult = Math.min(5, scene.playMult + 0.5);
              award(800, W / 2, 70, "RNF", "#22d3ee");
              neonBurst(scene, W / 2, 60, "spark-cyan", 26);
              scene.time.delayedCall(900, function () {
                scene.letterLit = [false, false, false];
                scene.letterZones.forEach(function (z, i) {
                  z.setStrokeStyle(2, 0x64748b, 0.9);
                  scene.letterLabels[i].setColor("#64748b");
                });
              });
            }
          });
        });
        scene.physics.add.overlap(scene.balls, scene.bonusOrbs, function (ball, orb) {
          if (!orb.active) return;
          orb.destroy();
          award(300, orb.x, orb.y, "ORB", "#a78bfa");
          SFX.score();
          neonBurst(scene, orb.x, orb.y, "spark-violet", 22);
          scene.feverTimer = Math.max(scene.feverTimer, 3.5);
          scene.feverMult = 2;
        });

        scene.input.on("pointerdown", function (pointer) {
          if (pointer.x < W / 2) scene.touchLeft = true;
          else scene.touchRight = true;
        });
        scene.input.on("pointerup", function () {
          if (scene.input.manager.pointers.filter(function (p) { return p.isDown; }).length === 0) {
            scene.touchLeft = false;
            scene.touchRight = false;
          }
        });
      },
      updateState: function (scene, dt, threat) {
        scene.bumpers.getChildren().forEach(function (bumper) {
          var cool = bumper.getData("hitCool") || 0;
          if (cool > 0) bumper.setData("hitCool", cool - dt);
          bumper.setTint(scene.feverMult > 1 ? 0xfbbf24 : bumper.getData("baseTint"));
        });

        if (scene.orbitHitCool > 0) scene.orbitHitCool -= dt;
        if (scene.spinnerHitCool > 0) scene.spinnerHitCool -= dt;
        scene.orbitAngle += dt * (1.1 + threat * 0.25);
        scene.orbitCore.x = W / 2 + Math.cos(scene.orbitAngle) * (150 + Math.sin(scene.orbitAngle * 0.7) * 30);
        scene.orbitCore.y = 245 + Math.sin(scene.orbitAngle * 1.35) * 70;
        scene.orbitCore.body.reset(scene.orbitCore.x, scene.orbitCore.y);
        scene.spinner.rotation += dt * 1.5;

        if (scene.skillShotOpen) {
          scene.skillShotTimer -= dt;
          var skillHit = false;
          scene.balls.getChildren().forEach(function (ball) {
            if (!ball.active) return;
            if (ball.y < 100 && Math.abs(ball.x - W / 2) < 110 && ball.body.velocity.y < 0) skillHit = true;
          });
          if (skillHit) {
            scene.skillShotOpen = false;
            scene.awardPin(600, W / 2, 90, "SKILL", "#fbbf24");
            SFX.confirm();
            neonBurst(scene, W / 2, 88, "spark-gold", 24);
            scene.feverTimer = Math.max(scene.feverTimer, 3);
            scene.feverMult = 2;
          } else if (scene.skillShotTimer <= 0) {
            scene.skillShotOpen = false;
          }
        }

        if (scene.feverTimer > 0) {
          scene.feverTimer -= dt;
          scene.feverHoldAcc += dt;
          if (scene.feverHoldAcc >= 1) {
            scene.feverHoldAcc -= 1;
            scene.advanceMission(1, "hold");
          }
          if (scene.feverTimer <= 0) {
            scene.feverTimer = 0;
            scene.feverMult = 1;
            scene.feverHoldAcc = 0;
          }
        }

        scene.comboIdle += dt;
        if (scene.comboIdle > 1.6) {
          scene.hitCombo = Math.max(0, scene.hitCombo - 1);
          scene.comboIdle = 0.4;
        }

        if (scene.tiltCool > 0) scene.tiltCool -= dt;
        if (scene.tilted > 0) scene.tilted -= dt;
        if (scene.leftKickCool > 0) scene.leftKickCool -= dt;
        if (scene.rightKickCool > 0) scene.rightKickCool -= dt;
        if (scene.multiballTimer > 0) scene.multiballTimer -= dt;

        scene.bonusOrbTimer += dt;
        if (scene.bonusOrbTimer >= Math.max(4.5, 9 / threat)) {
          scene.bonusOrbTimer = 0;
          var orb = scene.bonusOrbs.create(Phaser.Math.Between(120, W - 120), 70, "xp");
          orb.setTint(0xa78bfa);
          orb.setDisplaySize(18, 18);
          orb.body.allowGravity = false;
          orb.setVelocity(Phaser.Math.Between(-40, 40), 55 + threat * 10);
        }
        scene.bonusOrbs.getChildren().forEach(function (orb) {
          if (orb.active && orb.y > H - 40) orb.destroy();
        });

        var leftHeld = !scene.tilted && (scene.cursors.left.isDown || scene.keys.A.isDown || scene.touchLeft);
        var rightHeld = !scene.tilted && (scene.cursors.right.isDown || scene.keys.D.isDown || scene.touchRight);
        var leftJust = !scene.tilted && (
          Phaser.Input.Keyboard.JustDown(scene.cursors.left) ||
          Phaser.Input.Keyboard.JustDown(scene.keys.A) ||
          (leftHeld && !scene.prevTouchLeft)
        );
        var rightJust = !scene.tilted && (
          Phaser.Input.Keyboard.JustDown(scene.cursors.right) ||
          Phaser.Input.Keyboard.JustDown(scene.keys.D) ||
          (rightHeld && !scene.prevTouchRight)
        );
        scene.prevTouchLeft = leftHeld;
        scene.prevTouchRight = rightHeld;
        var nudge = Phaser.Input.Keyboard.JustDown(scene.cursors.space) || Phaser.Input.Keyboard.JustDown(scene.keys.SPACE);

        var leftY = leftHeld ? H - 96 : H - 78;
        var rightY = rightHeld ? H - 96 : H - 78;
        scene.leftFlipper.setAngle(leftHeld ? -26 : 14);
        scene.rightFlipper.setAngle(rightHeld ? 26 : -14);
        scene.leftFlipper.body.reset(scene.leftFlipper.x, leftY);
        scene.rightFlipper.body.reset(scene.rightFlipper.x, rightY);
        scene.leftFlipper.y = leftY;
        scene.rightFlipper.y = rightY;

        function tryKick(flipper, side, justPressed, held, coolKey) {
          if (!held || scene[coolKey] > 0) return;
          var kicked = false;
          scene.balls.getChildren().forEach(function (ball) {
            if (!ball.active || kicked) return;
            var dx = ball.x - flipper.x;
            var dy = ball.y - flipper.y;
            if (Math.abs(dx) > 78 || dy < -28 || dy > 40) return;
            var fallingOnPad = ball.body.velocity.y > 40;
            if (!justPressed && !fallingOnPad) return;
            kicked = true;
            scene[coolKey] = justPressed ? 0.14 : 0.2;
            var power = justPressed ? 540 : 280;
            var outward = side === "left" ? -1 : 1;
            var hitBias = Phaser.Math.Clamp(dx / 70, -1, 1);
            ball.setVelocity(
              ball.body.velocity.x * 0.2 + outward * 100 + hitBias * 150,
              -power
            );
            SFX.pinball();
            neonBurst(scene, flipper.x, flipper.y, side === "left" ? "spark-cyan" : "spark-violet", justPressed ? 22 : 15);
            if (justPressed) {
              scene.cameras.main.shake(80, 0.01);
              scene.tweens.add({ targets: flipper, scaleY: 1.15, duration: 70, yoyo: true, ease: "Cubic.easeOut" });
            }
          });
        }

        scene.physics.world.collide(scene.balls, scene.leftFlipper, function () {
          tryKick(scene.leftFlipper, "left", leftJust, leftHeld, "leftKickCool");
        });
        scene.physics.world.collide(scene.balls, scene.rightFlipper, function () {
          tryKick(scene.rightFlipper, "right", rightJust, rightHeld, "rightKickCool");
        });
        if (leftJust) tryKick(scene.leftFlipper, "left", true, true, "leftKickCool");
        if (rightJust) tryKick(scene.rightFlipper, "right", true, true, "rightKickCool");

        if (nudge && scene.tiltCool <= 0 && scene.tilted <= 0) {
          scene.tiltCool = 0.28;
          scene.tiltCount += 1;
          scene.tiltDecay = 0;
          scene.balls.getChildren().forEach(function (ball) {
            if (!ball.active) return;
            ball.setVelocity(
              ball.body.velocity.x + Phaser.Math.Between(-110, 110),
              ball.body.velocity.y - 90
            );
          });
          SFX.dash();
          scene.cameras.main.shake(120, 0.016);
          if (scene.tiltCount >= 3) {
            scene.tilted = 2.8;
            scene.tiltCount = 0;
            scene.hitCombo = 0;
            scene.feverTimer = 0;
            scene.feverMult = 1;
            SFX.hit();
            uiFloat(scene, W / 2, H / 2, "TILT!", "#fb7185");
          }
        }
        if (scene.tilted <= 0 && scene.tiltCool <= 0) {
          scene.tiltDecay += dt;
          if (scene.tiltDecay > 2.2) {
            scene.tiltCount = Math.max(0, scene.tiltCount - 1);
            scene.tiltDecay = 0;
          }
        }

        var drained = false;
        scene.balls.getChildren().forEach(function (ball) {
          if (!ball.active) return;
          var grace = ball.getData("serveGrace") || 0;
          if (grace > 0) {
            ball.setData("serveGrace", grace - dt);
            // 發球保護：避免一出生就掉進中央縫
            if (ball.y > H - 100 && Math.abs(ball.x - W / 2) < 70) {
              ball.setVelocity(ball.body.velocity.x * 0.4 + (ball.x < W / 2 ? -120 : 120), -420);
              ball.y = H - 160;
              ball.body.reset(ball.x, ball.y);
            }
          }
          if (ball.y > H + 36) {
            ball.destroy();
            drained = true;
          } else {
            var speed = ball.body.velocity.length();
            var maxSpeed = 560 + threat * 40;
            if (speed > maxSpeed) ball.body.velocity.scale(maxSpeed / speed);
          }
        });
        if (drained && scene.balls.countActive(true) === 0) {
          scene.ballLives -= 1;
          scene.hitCombo = 0;
          scene.feverTimer = 0;
          scene.feverMult = 1;
          scene.playMult = Math.max(1, scene.playMult - 0.25);
          scene.skillShotOpen = true;
          scene.skillShotTimer = 2.4;
          SFX.hit();
          scene.cameras.main.shake(180, 0.02);
          neonBurst(scene, W / 2, H - 24, "spark-pink", 24);
          if (scene.ballLives <= 0) {
            scene.gameOver();
            return;
          }
          scene.spawnPinball(W - 70, H - 210, -320, -360);
        }

        var feverLabel = scene.feverMult > 1 ? ("FEVER x2 " + scene.feverTimer.toFixed(1) + "s") : ("COMBO " + scene.hitCombo);
        var multiLabel = scene.balls.countActive(true) > 1 ? " · MULTIBALL" : "";
        var tiltLabel = scene.tilted > 0 ? " · TILT" : (scene.tiltCount > 0 ? " · SHAKE " + scene.tiltCount + "/3" : "");
        scene.setExtraHud("BALLS " + scene.ballLives + " · x" + scene.playMult.toFixed(2) + " · JP " + scene.jackpot + " · " + feverLabel + multiLabel + tiltLabel);
        scene.modeHud.setText(scene.skillShotOpen ? "技能射門時窗 " + Math.max(0, scene.skillShotTimer).toFixed(1) + "s" : "大獎累積中");
      }
    },
    "void-rhythm-beat": {
      slug: "void-rhythm-beat",
      title: "VOID RHYTHM BEAT",
      titleZh: "虛空節奏拍點",
      accent: 0xa78bfa,
      help: "依序按下 D / F / J / K；Perfect 疊高分，漏拍會耗損同步值。",
      objective: "跟拍四軌音浪 · Perfect 連擊 · 維持同步",
      scoreVerb: "COMBO",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.lanes = [W / 2 - 135, W / 2 - 45, W / 2 + 45, W / 2 + 135];
        scene.laneKeys = [
          { name: "D", key: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D) },
          { name: "F", key: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F) },
          { name: "J", key: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J) },
          { name: "K", key: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K) }
        ];
        scene.syncHp = 100;
        scene.combo = 0;
        scene.noteAcc = 0;
        scene.notes = scene.physics.add.group();
        scene.judgementY = H - 92;
        scene.lanes.forEach(function (laneX, idx) {
          scene.add.rectangle(laneX, H / 2, 72, 420, 0x0f172a, 0.65).setStrokeStyle(2, 0x334155, 1);
          scene.add.rectangle(laneX, scene.judgementY, 72, 16, 0x22d3ee, 0.35).setStrokeStyle(2, 0x22d3ee, 1);
          scene.add.text(laneX, H - 48, scene.laneKeys[idx].name, {
            fontFamily: "Segoe UI, sans-serif",
            fontSize: "28px",
            fontStyle: "bold",
            color: "#e2e8f0"
          }).setOrigin(0.5);
        });
      },
      updateState: function (scene, dt, threat) {
        scene.noteAcc += dt;
        if (scene.noteAcc >= Math.max(0.22, 0.78 / threat)) {
          scene.noteAcc = 0;
          var lane = Phaser.Math.Between(0, 3);
          var note = scene.notes.create(scene.lanes[lane], -40, "note");
          note.body.allowGravity = false;
          note.setTint([0x22d3ee, 0x34d399, 0xa78bfa, 0xf472b6][lane]);
          note.setData("lane", lane);
          note.setData("hit", false);
          note.setVelocityY(220 * threat + 40);
        }
        scene.laneKeys.forEach(function (lane, idx) {
          if (!Phaser.Input.Keyboard.JustDown(lane.key)) return;
          var judged = false;
          var candidates = scene.notes.getChildren().filter(function (note) {
            return note.active && note.getData("lane") === idx && !note.getData("hit");
          }).sort(function (a, b) {
            return Math.abs(a.y - scene.judgementY) - Math.abs(b.y - scene.judgementY);
          });
          if (candidates.length > 0) {
            var note = candidates[0];
            var dist = Math.abs(note.y - scene.judgementY);
            if (dist <= 42) {
              judged = true;
              note.setData("hit", true);
              note.destroy();
              scene.combo += 1;
              var perfect = dist <= 16;
              var gain = Math.floor((perfect ? 130 : 80) * scene.diff.scoreMult * (0.85 + scene.dangerMultiplier * 0.15));
              scene.score += gain + scene.combo * 4;
              SFX.beat();
              scene.cameras.main.shake(100, 0.01);
              neonBurst(scene, scene.lanes[idx], scene.judgementY, perfect ? "spark-cyan" : "spark-violet", perfect ? 22 : 16);
              uiFloat(scene, scene.lanes[idx], scene.judgementY - 34, perfect ? "PERFECT" : "GREAT", perfect ? "#67e8f9" : "#c4b5fd");
            }
          }
          if (!judged) {
            scene.combo = 0;
            scene.syncHp -= 8;
            SFX.hit();
            neonBurst(scene, scene.lanes[idx], scene.judgementY, "spark-pink", 16);
            uiFloat(scene, scene.lanes[idx], scene.judgementY - 34, "MISS", "#fb7185");
            if (scene.syncHp <= 0) scene.gameOver();
          }
        });
        scene.notes.getChildren().forEach(function (note) {
          if (!note.active) return;
          if (note.y > H + 40) {
            note.destroy();
            scene.combo = 0;
            scene.syncHp -= 10;
            SFX.hit();
            if (scene.syncHp <= 0) scene.gameOver();
          }
        });
        scene.setExtraHud("SYNC " + Math.max(0, scene.syncHp) + "% · COMBO " + scene.combo);
      }
    },
    "astro-gravity-runner": {
      slug: "astro-gravity-runner",
      title: "ASTRO GRAVITY RUNNER",
      titleZh: "星際重力翻轉者",
      accent: 0x34d399,
      help: "Space / W / ↑ 翻轉重力，在上下跑道切換並閃避障礙陣列。撞到障礙即結束。",
      objective: "翻轉重力 · 閃過障礙 · 收集星核",
      scoreVerb: "DIST",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.physics.world.gravity.y = 0;
        scene.runnerGravity = 1;
        scene.laneDown = H - 110;
        scene.laneUp = 110;
        scene.player = scene.physics.add.sprite(170, scene.laneDown, "runner");
        scene.player.body.allowGravity = false;
        scene.player.setCollideWorldBounds(true);
        scene.player.setSize(52, 22);
        scene.player.setOffset(8, 3);
        scene.player.setTint(0x34d399);
        scene.obstacles = scene.physics.add.group();
        scene.stars = scene.physics.add.group();
        scene.spawnAcc = 0;
        scene.starAcc = 0;
        scene.flipCd = 0;
        scene.floorLines = [
          scene.add.rectangle(W / 2, H - 70, W, 12, 0x0ea5e9, 0.8),
          scene.add.rectangle(W / 2, 70, W, 12, 0x8b5cf6, 0.8)
        ];
        scene.hitObstacle = function (obs) {
          if (!scene.alive || !obs || !obs.active) return;
          try { obs.destroy(); } catch (_e) {}
          SFX.hit();
          SFX.explode();
          scene.cameras.main.shake(220, 0.028);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-pink", 28);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-violet", 18);
          scene.gameOver();
        };
        scene.physics.add.overlap(scene.player, scene.obstacles, function (_p, obs) {
          scene.hitObstacle(obs);
        });
        scene.physics.add.overlap(scene.player, scene.stars, function (_p, star) {
          if (!star.active) return;
          star.destroy();
          scene.score += Math.floor(140 * scene.diff.scoreMult * (0.85 + scene.dangerMultiplier * 0.15));
          SFX.score();
          scene.cameras.main.shake(100, 0.01);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-gold", 18);
        });
      },
      updateState: function (scene, dt, threat) {
        if (!scene.alive) return;
        var flip =
          Phaser.Input.Keyboard.JustDown(scene.cursors.space) ||
          Phaser.Input.Keyboard.JustDown(scene.keys.W) ||
          Phaser.Input.Keyboard.JustDown(scene.cursors.up) ||
          Phaser.Input.Keyboard.JustDown(scene.keys.SPACE);
        scene.flipCd = Math.max(0, scene.flipCd - dt);
        // 立即翻轉，短冷卻避免誤觸連按，不阻塞碰撞判定
        if (flip && scene.flipCd <= 0) {
          scene.runnerGravity *= -1;
          scene.flipCd = 0.14;
          var targetY = scene.runnerGravity > 0 ? scene.laneDown : scene.laneUp;
          scene.player.setVelocity(0, 0);
          scene.player.y = targetY;
          if (scene.player.body) {
            scene.player.body.reset(scene.player.x, targetY);
          }
          scene.player.setAngle(scene.runnerGravity > 0 ? 0 : 180);
          SFX.jump();
          scene.cameras.main.shake(80, 0.008);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-green", 16);
        }

        // 手動 AABB：高速障礙避免物理 overlap 穿透漏判
        var pb = scene.player.body;
        if (pb) {
          var kids = scene.obstacles.getChildren();
          for (var i = 0; i < kids.length; i++) {
            var obs = kids[i];
            if (!obs || !obs.active || !obs.body) continue;
            var ob = obs.body;
            if (
              pb.right > ob.left &&
              pb.left < ob.right &&
              pb.bottom > ob.top &&
              pb.top < ob.bottom
            ) {
              scene.hitObstacle(obs);
              return;
            }
          }
        }

        scene.spawnAcc += dt;
        scene.starAcc += dt;
        scene.score += Math.floor(18 * dt * scene.diff.scoreMult * threat);
        if (scene.spawnAcc >= Math.max(0.28, 0.9 / threat)) {
          scene.spawnAcc = 0;
          var laneY = Phaser.Math.Between(0, 1) ? scene.laneDown : scene.laneUp;
          var obstacle = scene.obstacles.create(W + 40, laneY, "block");
          obstacle.body.allowGravity = false;
          obstacle.setSize(34, 34);
          obstacle.setOffset(3, 3);
          obstacle.setVelocityX(-(260 * threat + Phaser.Math.Between(10, 50)));
          obstacle.setTint(laneY < H / 2 ? 0xa78bfa : 0x22d3ee);
        }
        if (scene.starAcc >= Math.max(0.9, 2.4 / threat)) {
          scene.starAcc = 0;
          var starLane = Phaser.Math.Between(0, 1) ? scene.laneDown : scene.laneUp;
          var star = scene.stars.create(W + 20, starLane, "xp");
          star.body.allowGravity = false;
          star.setTint(0xfbbf24);
          star.setVelocityX(-(240 * threat));
          scene.tweens.add({ targets: star, scale: 1.25, alpha: 0.5, duration: 400, repeat: -1, yoyo: true, ease: "Sine.easeInOut" });
        }
        scene.obstacles.getChildren().forEach(function (obs) { if (obs.active && obs.x < -40) obs.destroy(); });
        scene.stars.getChildren().forEach(function (star) { if (star.active && star.x < -30) star.destroy(); });
        scene.setExtraHud("GRAV " + (scene.runnerGravity > 0 ? "DOWN" : "UP") + " · HIT=OUT");
      }
    },
    "cyber-rogue-dungeon": {
      slug: "cyber-rogue-dungeon",
      title: "CYBER ROGUE DUNGEON",
      titleZh: "賽博地牢倖存者",
      accent: 0xfbbf24,
      help: "WASD / 方向鍵走位，自動索敵開火，吸收 XP 核心升級火力並存活更久。",
      objective: "走位生存 · 自動清怪 · 收集模組升級",
      scoreVerb: "LV",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.player = scene.physics.add.sprite(W / 2, H / 2, "player-orb");
        scene.player.setTint(0xfbbf24);
        scene.player.setDrag(900, 900);
        scene.player.setMaxVelocity(280, 280);
        scene.player.setCollideWorldBounds(true);
        scene.player.hp = 6;
        scene.player.weaponLevel = 1;
        scene.player.invuln = 0;
        scene.killCount = 0;
        scene.xp = 0;
        scene.spawnAcc = 0;
        scene.fireAcc = 0;
        scene.enemies = scene.physics.add.group();
        scene.bullets = scene.physics.add.group();
        scene.xpOrbs = scene.physics.add.group();
        scene.physics.add.overlap(scene.player, scene.enemies, function (_p, enemy) {
          if (scene.player.invuln > 0 || !enemy.active) return;
          enemy.destroy();
          scene.player.hp -= 1;
          scene.player.invuln = 0.8;
          SFX.hit();
          scene.cameras.main.shake(160, 0.018);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-pink", 24);
          if (scene.player.hp <= 0) scene.gameOver();
        });
        scene.physics.add.overlap(scene.bullets, scene.enemies, function (bullet, enemy) {
          if (!bullet.active || !enemy.active) return;
          enemy.setData("hp", enemy.getData("hp") - 1);
          bullet.destroy();
          if (enemy.getData("hp") <= 0) {
            enemy.destroy();
            scene.killCount += 1;
            scene.score += Math.floor(85 * scene.diff.scoreMult * (0.85 + scene.dangerMultiplier * 0.18));
            neonBurst(scene, enemy.x, enemy.y, "spark-violet", 18);
            var xp = scene.xpOrbs.create(enemy.x, enemy.y, "xp");
            xp.body.allowGravity = false;
            xp.setTint(0x34d399);
          }
        });
        scene.physics.add.overlap(scene.player, scene.xpOrbs, function (_p, orb) {
          if (!orb.active) return;
          orb.destroy();
          scene.xp += 1;
          SFX.score();
          if (scene.xp % 8 === 0) {
            scene.player.weaponLevel += 1;
            scene.player.hp = Math.min(scene.player.hp + 1, 8);
            scene.cameras.main.shake(100, 0.01);
            neonBurst(scene, scene.player.x, scene.player.y, "spark-green", 22);
            uiFloat(scene, scene.player.x, scene.player.y - 28, "UPGRADE", "#4ade80");
          }
        });
      },
      updateState: function (scene, dt, threat) {
        var left = scene.cursors.left.isDown || scene.keys.A.isDown;
        var right = scene.cursors.right.isDown || scene.keys.D.isDown;
        var up = scene.cursors.up.isDown || scene.keys.W.isDown;
        var down = scene.cursors.down.isDown || scene.keys.S.isDown;
        var vec = new Phaser.Math.Vector2((right ? 1 : 0) - (left ? 1 : 0), (down ? 1 : 0) - (up ? 1 : 0));
        if (vec.lengthSq() > 0) vec.normalize();
        scene.player.setAcceleration(vec.x * 1500, vec.y * 1500);
        scene.player.invuln = Math.max(0, scene.player.invuln - dt);
        scene.player.setAlpha(scene.player.invuln > 0 ? 0.5 : 1);
        scene.spawnAcc += dt;
        scene.fireAcc += dt;
        if (scene.spawnAcc >= Math.max(0.24, 0.95 / threat)) {
          scene.spawnAcc = 0;
          var edge = Phaser.Math.Between(0, 3);
          var ex = edge === 0 ? -20 : edge === 1 ? W + 20 : Phaser.Math.Between(20, W - 20);
          var ey = edge === 2 ? -20 : edge === 3 ? H + 20 : Phaser.Math.Between(20, H - 20);
          var enemy = scene.enemies.create(ex, ey, "drone");
          enemy.setTint(0xfb7185);
          enemy.setData("speed", Phaser.Math.Between(60, 100));
          enemy.setData("hp", 1 + Math.floor(scene.player.weaponLevel / 3));
        }
        if (scene.fireAcc >= Math.max(0.12, 0.5 - scene.player.weaponLevel * 0.03)) {
          scene.fireAcc = 0;
          var living = scene.enemies.getChildren().filter(function (enemy) { return enemy.active; });
          if (living.length > 0) {
            living.sort(function (a, b) {
              return Phaser.Math.Distance.Between(a.x, a.y, scene.player.x, scene.player.y) -
                Phaser.Math.Distance.Between(b.x, b.y, scene.player.x, scene.player.y);
            });
            var target = living[0];
            var angle = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, target.x, target.y);
            for (var i = 0; i < Math.min(scene.player.weaponLevel, 3); i++) {
              var spread = (i - (Math.min(scene.player.weaponLevel, 3) - 1) / 2) * 0.14;
              var bullet = scene.bullets.create(scene.player.x, scene.player.y, "bullet");
              bullet.body.allowGravity = false;
              bullet.setTint(0xfbbf24);
              bullet.setRotation(angle + spread);
              bullet.setVelocity(Math.cos(angle + spread) * 480, Math.sin(angle + spread) * 480);
              scene.time.delayedCall(1000, function (b) { if (b.active) b.destroy(); }, [bullet]);
            }
            SFX.shoot();
          }
        }
        scene.enemies.getChildren().forEach(function (enemy) {
          if (!enemy.active) return;
          var angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, scene.player.x, scene.player.y);
          var speed = enemy.getData("speed") * threat;
          enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          enemy.rotation += dt * 3;
        });
        scene.xpOrbs.getChildren().forEach(function (orb) {
          if (!orb.active) return;
          var dist = Phaser.Math.Distance.Between(orb.x, orb.y, scene.player.x, scene.player.y);
          if (dist < 120) {
            var angle = Phaser.Math.Angle.Between(orb.x, orb.y, scene.player.x, scene.player.y);
            orb.setVelocity(Math.cos(angle) * 180, Math.sin(angle) * 180);
          }
        });
        scene.setExtraHud("HP " + scene.player.hp + " · LV " + scene.player.weaponLevel + " · XP " + scene.xp);
      }
    }
  };

  function createGame(configInput) {
    var cfg = MODES[(configInput && configInput.slug) || DEFAULT_SLUG] || MODES["cyber-blade-dash"];
    var selectedDiff = "standard";

    class BootScene extends Phaser.Scene {
      constructor() { super("BootScene"); }
      create() {
        makeTextures(this);
        this.cameras.main.fadeIn(400, 4, 6, 12);
        this.add.text(W / 2, H / 2, cfg.titleZh, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "30px",
          fontStyle: "bold",
          color: "#e2e8f0"
        }).setOrigin(0.5);
        this.add.text(W / 2, H / 2 + 40, "RainyNightFrog · Phaser 3 Esports Suite", {
          fontFamily: "Segoe UI, sans-serif",
          fontSize: "14px",
          color: "#64748b"
        }).setOrigin(0.5);
        this.time.delayedCall(350, function () {
          this.scene.start("MainMenuScene");
        }, [], this);
      }
    }

    class MainMenuScene extends Phaser.Scene {
      constructor() { super("MainMenuScene"); }
      create() {
        ensureAudio();
        drawBackdrop(this, cfg.accent);
        var badge = this.add.text(W / 2, 90, "RNF PHASER 3 ESPORTS", {
          fontFamily: "Segoe UI, sans-serif",
          fontSize: "12px",
          fontStyle: "bold",
          color: "#22d3ee",
          letterSpacing: 4
        }).setOrigin(0.5).setAlpha(0);
        var title = this.add.text(W / 2, 150, cfg.title, {
          fontFamily: "Segoe UI, Microsoft JhengHei, sans-serif",
          fontSize: "46px",
          fontStyle: "bold",
          color: "#ffffff"
        }).setOrigin(0.5).setScale(0.6).setAlpha(0);
        var sub = this.add.text(W / 2, 208, cfg.titleZh + " · " + cfg.objective, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "16px",
          color: "#94a3b8"
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: badge, alpha: 1, y: 100, duration: 420, ease: "Cubic.easeOut" });
        this.tweens.add({ targets: title, alpha: 1, scale: 1, duration: 520, ease: "Back.easeOut", delay: 80 });
        this.tweens.add({ targets: sub, alpha: 1, duration: 400, ease: "Cubic.easeOut", delay: 160 });
        var self = this;
        makeMenuButton(this, W / 2, 318, "開始遊戲 START", cfg.accent, function () {
          SFX.confirm();
          self.cameras.main.fadeOut(220, 4, 6, 12);
          self.time.delayedCall(230, function () { self.scene.start("DifficultyScene"); });
        });
        makeMenuButton(this, W / 2, 378, "排行榜", 0x34d399, function () {
          SFX.click();
          self.scene.start("LeaderboardScene", { difficulty: selectedDiff || "standard" });
        });
        makeMenuButton(this, W / 2, 438, "操作說明", 0xa78bfa, function () {
          if (window.RNFPhaserHelp && RNFPhaserHelp.showHelpOverlay) {
            RNFPhaserHelp.showHelpOverlay(self, cfg.help, { W: W, H: H, accent: cfg.accent });
          }
        });
      }
    }

    class DifficultyScene extends Phaser.Scene {
      constructor() { super("DifficultyScene"); }
      create() {
        drawBackdrop(this, cfg.accent);
        this.cameras.main.fadeIn(200, 4, 6, 12);
        var head = this.add.text(W / 2, 100, "選擇難度", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "36px",
          fontStyle: "bold",
          color: "#e2e8f0"
        }).setOrigin(0.5).setScale(0.7).setAlpha(0);
        this.tweens.add({ targets: head, alpha: 1, scale: 1, duration: 400, ease: "Back.easeOut" });
        this.add.text(W / 2, 150, "Casual / Standard / Extreme + 動態危險倍率", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "14px",
          color: "#64748b"
        }).setOrigin(0.5);
        var self = this;
        ["casual", "standard", "extreme"].forEach(function (key, i) {
          var d = DIFF_PRESETS[key];
          var color = Phaser.Display.Color.HexStringToColor(d.color).color;
          makeMenuButton(self, W / 2, 230 + i * 70, d.label, color, function () {
            selectedDiff = key;
            SFX.confirm();
            self.cameras.main.fadeOut(200, 4, 6, 12);
            self.time.delayedCall(210, function () {
              self.scene.start("GameScene", { difficulty: key });
            });
          });
        });
      }
    }

    class GameScene extends Phaser.Scene {
      constructor() { super("GameScene"); }
      init(data) {
        this.diffKey = (data && data.difficulty) || selectedDiff || "standard";
        this.diff = DIFF_PRESETS[this.diffKey] || DIFF_PRESETS.standard;
        this.score = 0;
        this.elapsedTime = 0;
        this.dangerMultiplier = 1;
        this.alive = true;
        this.extraHudValue = "";
      }
      setExtraHud(value) {
        this.extraHudValue = value;
        if (this.hudExtra) this.hudExtra.setText(value);
      }
      create() {
        ensureAudio();
        drawBackdrop(this, cfg.accent);
        this.cameras.main.fadeIn(250, 4, 6, 12);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = this.input.keyboard.addKeys("W,A,S,D,SPACE,SHIFT");
        this.shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        this.hudScore = this.add.text(24, 18, "SCORE 0", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "18px", fontStyle: "bold", color: "#67e8f9"
        }).setScrollFactor(0).setDepth(20);
        this.hudDanger = this.add.text(24, 46, "DANGER x1.00", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "16px", fontStyle: "bold", color: "#f472b6"
        }).setScrollFactor(0).setDepth(20);
        this.hudDiff = this.add.text(W - 24, 18, this.diff.label, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "14px", color: this.diff.color
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
        this.hudHint = this.add.text(W / 2, 18, cfg.objective, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "13px", color: "#64748b"
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(20);
        this.hudExtra = this.add.text(W - 24, 44, "", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "14px", fontStyle: "bold", color: "#f8fafc"
        }).setOrigin(1, 0).setScrollFactor(0).setDepth(20);
        cfg.startState(this);
      }
      update(_time, delta) {
        if (!this.alive) return;
        var dt = delta / 1000;
        this.elapsedTime += dt;
        this.dangerMultiplier = 1 + Math.log(1 + this.elapsedTime / 30) * 0.8;
        var threat = this.dangerMultiplier * this.diff.base;
        this.hudDanger.setText("DANGER x" + this.dangerMultiplier.toFixed(2));
        this.hudScore.setText("SCORE " + this.score.toLocaleString());
        cfg.updateState(this, dt, threat);
      }
      gameOver() {
        if (!this.alive) return;
        this.alive = false;
        this.physics.pause();
        SFX.over();
        var raw = this.score;
        var finalScore = Math.floor(raw * (this.diff.scoreMult || 1));
        var meta = {
          slug: cfg.slug,
          difficulty: this.diff.id,
          rawScore: raw,
          dangerPeak: Number(this.dangerMultiplier.toFixed(2)),
          elapsed: Math.floor(this.elapsedTime)
        };
        try {
          if (window.RNFPhaserLeaderboard && RNFPhaserLeaderboard.submitRun) {
            RNFPhaserLeaderboard.submitRun(finalScore, meta);
          } else if (typeof RNF !== "undefined" && RNF.submitScore) {
            RNF.submitScore(finalScore, meta);
          }
        } catch (_e) {}
        this.scene.launch("GameOverModal", {
          score: finalScore,
          rawScore: raw,
          diff: this.diff,
          danger: this.dangerMultiplier,
          elapsed: this.elapsedTime,
          title: cfg.titleZh,
          scoreVerb: cfg.scoreVerb
        });
      }
    }

    class GameOverModal extends Phaser.Scene {
      constructor() { super("GameOverModal"); }
      init(data) { this.payload = data || {}; }
      create() {
        var score = this.payload.score || 0;
        var raw = this.payload.rawScore || score;
        var diff = this.payload.diff || DIFF_PRESETS.standard;
        var danger = this.payload.danger || 1;
        var elapsed = this.payload.elapsed || 0;
        this.add.rectangle(W / 2, H / 2, W, H, 0x02040a, 0.72).setInteractive();
        var panel = this.add.rectangle(W / 2, H / 2, 480, 500, 0x0b1220, 0.96)
          .setStrokeStyle(2, cfg.accent, 0.9)
          .setScale(0.7)
          .setAlpha(0);
        var badge = this.add.text(W / 2, H / 2 - 168, "GAME OVER", {
          fontFamily: "Segoe UI, sans-serif", fontSize: "14px", fontStyle: "bold", color: "#22d3ee", letterSpacing: 3
        }).setOrigin(0.5).setAlpha(0);
        var title = this.add.text(W / 2, H / 2 - 128, this.payload.title || cfg.titleZh, {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif", fontSize: "26px", fontStyle: "bold", color: "#ffffff"
        }).setOrigin(0.5).setAlpha(0);
        var scoreTxt = this.add.text(W / 2, H / 2 - 48, score.toLocaleString(), {
          fontFamily: "Segoe UI, sans-serif", fontSize: "52px", fontStyle: "bold", color: "#67e8f9"
        }).setOrigin(0.5).setScale(0.4).setAlpha(0);
        var meta = this.add.text(
          W / 2,
          H / 2 + 20,
          diff.label + " · DANGER x" + Number(danger).toFixed(2) + " · " + Math.floor(elapsed) + "s" +
          (raw !== score ? " · RAW " + raw.toLocaleString() : ""),
          {
            fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
            fontSize: "13px",
            color: "#94a3b8",
            align: "center",
            wordWrap: { width: 400 }
          }
        ).setOrigin(0.5).setAlpha(0);
        var uploaded = this.add.text(W / 2, H / 2 + 52, "分數已送交本遊戲獨立排行榜", {
          fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
          fontSize: "12px",
          color: "#a78bfa"
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: panel, alpha: 1, scale: 1, duration: 380, ease: "Back.easeOut" });
        this.tweens.add({ targets: [badge, title, meta, uploaded], alpha: 1, duration: 320, ease: "Cubic.easeOut", delay: 80 });
        this.tweens.add({ targets: scoreTxt, alpha: 1, scale: 1, duration: 480, ease: "Back.easeOut", delay: 120 });
        neonBurst(this, W / 2, H / 2 - 48, "spark-cyan", 24);
        neonBurst(this, W / 2, H / 2 - 48, "spark-violet", 18);
        var self = this;
        // 兩排按鈕：落在面板內（半高 250）
        makeMenuButton(this, W / 2 - 110, H / 2 + 95, "再來一次", cfg.accent, function () {
          SFX.confirm();
          self.scene.stop("GameOverModal");
          self.scene.stop("GameScene");
          self.scene.start("GameScene", { difficulty: selectedDiff });
        }, 180);
        makeMenuButton(this, W / 2 + 110, H / 2 + 95, "排行榜", 0x34d399, function () {
          SFX.click();
          self.scene.stop("GameOverModal");
          self.scene.stop("GameScene");
          self.scene.start("LeaderboardScene", { difficulty: selectedDiff || "standard" });
        }, 180);
        makeMenuButton(this, W / 2, H / 2 + 155, "主選單", 0xa78bfa, function () {
          SFX.click();
          self.scene.stop("GameOverModal");
          self.scene.stop("GameScene");
          self.scene.start("MainMenuScene");
        }, 200);
      }
    }

    var LeaderboardScene = null;
    if (window.RNFPhaserLeaderboard && RNFPhaserLeaderboard.createLeaderboardScene) {
      LeaderboardScene = RNFPhaserLeaderboard.createLeaderboardScene({
        Phaser: Phaser,
        makeButton: makeMenuButton,
        W: W,
        H: H,
        accent: cfg.accent,
        returnScene: "MainMenuScene",
        getDefaultDiff: function () { return selectedDiff || "standard"; }
      });
    } else {
      LeaderboardScene = class LeaderboardSceneFallback extends Phaser.Scene {
        constructor() { super("LeaderboardScene"); }
        create() {
          this.add.text(W / 2, H / 2, "排行榜模組未載入", {
            fontFamily: "Microsoft JhengHei, Segoe UI", fontSize: "18px", color: "#f472b6"
          }).setOrigin(0.5);
          var self = this;
          makeMenuButton(this, W / 2, H - 60, "返回", 0x64748b, function () {
            self.scene.start("MainMenuScene");
          }, 180);
        }
      };
    }

    if (typeof RNF !== "undefined" && RNF.init) RNF.init();
    var game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: "game-host",
      width: W,
      height: H,
      backgroundColor: "#04060c",
      physics: {
        default: "arcade",
        arcade: { gravity: { y: 0 }, debug: false }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      scene: [BootScene, MainMenuScene, DifficultyScene, GameScene, GameOverModal, LeaderboardScene]
    });
    if (typeof RNF !== "undefined" && RNF.setShowMenuHandler) {
      RNF.setShowMenuHandler(function () {
        try {
          ["GameOverModal", "LeaderboardScene", "DifficultyScene", "GameScene", "SettingsScene"].forEach(function (key) {
            try {
              if (game.scene.getScene(key)) game.scene.stop(key);
            } catch (_e) {}
          });
          game.scene.start("MainMenuScene");
        } catch (_e2) {}
      });
    }
    return game;
  }

  window.RNFArcadeSuite = {
    createGame: createGame
  };
})();
