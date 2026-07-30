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
    var bg = scene.add.rectangle(x, y, bw, 54, fill, 0.2)
      .setStrokeStyle(2, fill, 0.85)
      .setInteractive({ useHandCursor: true });
    var txt = scene.add.text(x, y, label, {
      fontFamily: "Segoe UI, Microsoft JhengHei, sans-serif",
      fontSize: "20px",
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
      help: "← → / A D 控制雙擋板，Space 震台，讓高能鋼珠連續撞擊目標板。",
      objective: "守住鋼珠 · 連撞 Bumper · 追求 Fever",
      scoreVerb: "HITS",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.topWall = scene.add.rectangle(W / 2, 8, W, 16, 0x0f172a);
        scene.leftWall = scene.add.rectangle(8, H / 2, 16, H, 0x0f172a);
        scene.rightWall = scene.add.rectangle(W - 8, H / 2, 16, H, 0x0f172a);
        scene.physics.add.existing(scene.topWall, true);
        scene.physics.add.existing(scene.leftWall, true);
        scene.physics.add.existing(scene.rightWall, true);
        scene.leftFlipper = scene.physics.add.sprite(W / 2 - 120, H - 74, "paddle").setImmovable(true);
        scene.rightFlipper = scene.physics.add.sprite(W / 2 + 120, H - 74, "paddle").setImmovable(true);
        scene.leftFlipper.body.allowGravity = false;
        scene.rightFlipper.body.allowGravity = false;
        scene.leftFlipper.setTint(0x22d3ee);
        scene.rightFlipper.setTint(0xa78bfa);
        scene.ball = scene.physics.add.sprite(W / 2, H - 130, "ball");
        scene.ball.setBounce(1, 1);
        scene.ball.setCollideWorldBounds(false);
        scene.ball.body.allowGravity = false;
        scene.ball.setVelocity(240, -280);
        scene.ball.setMaxVelocity(520, 520);
        scene.ballLives = 3;
        scene.hitCombo = 0;
        scene.spawnTimer = 0;
        scene.bumpers = scene.physics.add.staticGroup();
        [
          [W / 2, 150, 0x22d3ee],
          [W / 2 - 160, 220, 0xf472b6],
          [W / 2 + 160, 220, 0xa78bfa],
          [W / 2 - 80, 320, 0xfbbf24],
          [W / 2 + 80, 320, 0x34d399]
        ].forEach(function (item) {
          var bumper = scene.bumpers.create(item[0], item[1], "ball").setDisplaySize(34, 34).refreshBody();
          bumper.setTint(item[2]);
        });
        scene.physics.add.collider(scene.ball, scene.topWall);
        scene.physics.add.collider(scene.ball, scene.leftWall);
        scene.physics.add.collider(scene.ball, scene.rightWall);
        scene.physics.add.collider(scene.ball, scene.bumpers, function (ball, bumper) {
          scene.hitCombo += 1;
          var gain = Math.floor((75 + scene.hitCombo * 12) * scene.diff.scoreMult * (0.85 + scene.dangerMultiplier * 0.15));
          scene.score += gain;
          SFX.pinball();
          scene.cameras.main.shake(100, 0.01);
          neonBurst(scene, bumper.x, bumper.y, "spark-pink", Phaser.Math.Between(16, 24));
          uiFloat(scene, bumper.x, bumper.y - 18, "+" + gain, "#f472b6");
          var vx = ball.body.velocity.x;
          var vy = ball.body.velocity.y;
          ball.setVelocity(vx * 1.02, vy * 1.02);
        });
      },
      updateState: function (scene, dt, threat) {
        var left = scene.cursors.left.isDown || scene.keys.A.isDown;
        var right = scene.cursors.right.isDown || scene.keys.D.isDown;
        var nudge = Phaser.Input.Keyboard.JustDown(scene.cursors.space) || Phaser.Input.Keyboard.JustDown(scene.keys.SPACE);
        scene.leftFlipper.y = left ? H - 92 : H - 74;
        scene.rightFlipper.y = right ? H - 92 : H - 74;
        scene.leftFlipper.setAngle(left ? -24 : 18);
        scene.rightFlipper.setAngle(right ? 24 : -18);
        scene.physics.world.collide(scene.ball, scene.leftFlipper, function () {
          scene.ball.setVelocityY(-Math.abs(scene.ball.body.velocity.y) - 90);
          scene.ball.setVelocityX(scene.ball.body.velocity.x - 30);
          SFX.pinball();
          neonBurst(scene, scene.leftFlipper.x, scene.leftFlipper.y, "spark-cyan", 16);
        });
        scene.physics.world.collide(scene.ball, scene.rightFlipper, function () {
          scene.ball.setVelocityY(-Math.abs(scene.ball.body.velocity.y) - 90);
          scene.ball.setVelocityX(scene.ball.body.velocity.x + 30);
          SFX.pinball();
          neonBurst(scene, scene.rightFlipper.x, scene.rightFlipper.y, "spark-violet", 16);
        });
        if (nudge) {
          scene.ball.setVelocity(scene.ball.body.velocity.x + Phaser.Math.Between(-70, 70), scene.ball.body.velocity.y - 60);
          SFX.dash();
          scene.cameras.main.shake(100, 0.01);
        }
        scene.spawnTimer += dt;
        if (scene.spawnTimer >= Math.max(1.25, 3.2 / threat)) {
          scene.spawnTimer = 0;
          scene.bumpers.getChildren().forEach(function (bumper) {
            bumper.setTint(Phaser.Display.Color.RandomRGB().color);
          });
        }
        if (scene.ball.y > H + 30) {
          scene.ballLives -= 1;
          scene.hitCombo = 0;
          SFX.hit();
          scene.cameras.main.shake(160, 0.018);
          neonBurst(scene, scene.ball.x, H - 20, "spark-pink", 22);
          if (scene.ballLives <= 0) {
            scene.gameOver();
            return;
          }
          scene.ball.setPosition(W / 2, H - 130);
          scene.ball.setVelocity(Phaser.Math.Between(-240, 240), -300);
        }
        var speed = scene.ball.body.velocity.length();
        if (speed < 260) scene.ball.body.velocity.scale(1.02);
        if (speed > 560) scene.ball.body.velocity.scale(0.98);
        scene.setExtraHud("BALLS " + scene.ballLives + " · FEVER " + scene.hitCombo);
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
      help: "Space / W / ↑ 翻轉重力，在上下跑道切換並閃避障礙陣列。",
      objective: "翻轉重力 · 閃過障礙 · 收集星核",
      scoreVerb: "DIST",
      startState: function (scene) {
        scene.physics.world.setBounds(0, 0, W, H);
        scene.physics.world.gravity.y = 0;
        scene.runnerGravity = 1;
        scene.player = scene.physics.add.sprite(170, H - 110, "runner");
        scene.player.body.allowGravity = false;
        scene.player.setImmovable(true);
        scene.player.setTint(0x34d399);
        scene.obstacles = scene.physics.add.group();
        scene.stars = scene.physics.add.group();
        scene.spawnAcc = 0;
        scene.starAcc = 0;
        scene.flipCd = 0;
        scene.hp = 4;
        scene.floorLines = [
          scene.add.rectangle(W / 2, H - 70, W, 12, 0x0ea5e9, 0.8),
          scene.add.rectangle(W / 2, 70, W, 12, 0x8b5cf6, 0.8)
        ];
        scene.physics.add.overlap(scene.player, scene.obstacles, function (_p, obs) {
          if (!obs.active || scene.flipCd > 0.3) return;
          obs.destroy();
          scene.hp -= 1;
          SFX.hit();
          scene.cameras.main.shake(150, 0.018);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-pink", 24);
          scene.flipCd = 0.7;
          if (scene.hp <= 0) scene.gameOver();
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
        var flip = Phaser.Input.Keyboard.JustDown(scene.cursors.space) || Phaser.Input.Keyboard.JustDown(scene.keys.W) || Phaser.Input.Keyboard.JustDown(scene.cursors.up) || Phaser.Input.Keyboard.JustDown(scene.keys.SPACE);
        scene.flipCd = Math.max(0, scene.flipCd - dt);
        if (flip && scene.flipCd <= 0) {
          scene.runnerGravity *= -1;
          scene.flipCd = 0.35;
          scene.player.y = scene.runnerGravity > 0 ? H - 110 : 110;
          scene.player.setAngle(scene.runnerGravity > 0 ? 0 : 180);
          SFX.jump();
          scene.cameras.main.shake(100, 0.01);
          neonBurst(scene, scene.player.x, scene.player.y, "spark-green", 18);
        }
        scene.spawnAcc += dt;
        scene.starAcc += dt;
        scene.score += Math.floor(18 * dt * scene.diff.scoreMult * threat);
        if (scene.spawnAcc >= Math.max(0.28, 0.9 / threat)) {
          scene.spawnAcc = 0;
          var laneY = Phaser.Math.Between(0, 1) ? H - 110 : 110;
          var obstacle = scene.obstacles.create(W + 40, laneY, "block");
          obstacle.body.allowGravity = false;
          obstacle.setVelocityX(-(300 * threat + Phaser.Math.Between(20, 70)));
          obstacle.setTint(laneY < H / 2 ? 0xa78bfa : 0x22d3ee);
        }
        if (scene.starAcc >= Math.max(0.9, 2.4 / threat)) {
          scene.starAcc = 0;
          var starLane = Phaser.Math.Between(0, 1) ? H - 110 : 110;
          var star = scene.stars.create(W + 20, starLane, "xp");
          star.body.allowGravity = false;
          star.setTint(0xfbbf24);
          star.setVelocityX(-(280 * threat));
          scene.tweens.add({ targets: star, scale: 1.25, alpha: 0.5, duration: 400, repeat: -1, yoyo: true, ease: "Sine.easeInOut" });
        }
        scene.obstacles.getChildren().forEach(function (obs) { if (obs.active && obs.x < -40) obs.destroy(); });
        scene.stars.getChildren().forEach(function (star) { if (star.active && star.x < -30) star.destroy(); });
        scene.setExtraHud("HP " + scene.hp + " · GRAV " + (scene.runnerGravity > 0 ? "DOWN" : "UP"));
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
        var panel = this.add.rectangle(W / 2, H / 2, 480, 460, 0x0b1220, 0.96)
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
        // 兩排按鈕：全部落在面板內（面板半高 230，最底按鈕中心 +170）
        makeMenuButton(this, W / 2 - 110, H / 2 + 110, "再來一次", cfg.accent, function () {
          SFX.confirm();
          self.scene.stop("GameOverModal");
          self.scene.stop("GameScene");
          self.scene.start("GameScene", { difficulty: selectedDiff });
        }, 180);
        makeMenuButton(this, W / 2 + 110, H / 2 + 110, "排行榜", 0x34d399, function () {
          SFX.click();
          self.scene.stop("GameOverModal");
          self.scene.stop("GameScene");
          self.scene.start("LeaderboardScene", { difficulty: selectedDiff || "standard" });
        }, 180);
        makeMenuButton(this, W / 2, H / 2 + 172, "主選單", 0xa78bfa, function () {
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
