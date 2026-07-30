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

  /**
   * 砲塔定位（DPS/$ 約落在 0.35～0.50，特效用於破甲／控場／群傷）：
   * 機槍＝清雜　雷射＝遠距破甲　冰凍＝控場　爆破＝群傷　特斯拉＝彈跳　軌道＝斬殺重甲
   * pierce：無視防禦比例（0～1）
   */
  var TOWERS = [
    { id: "gun", name: "機槍塔", cost: 50, dmg: 5, rate: 0.22, range: 125, color: 0xff8c5a, tex: "cd-tw-gun", pierce: 0 },
    { id: "laser", name: "雷射塔", cost: 90, dmg: 24, rate: 0.55, range: 195, color: 0x67e8f9, tex: "cd-tw-laser", pierce: 0.7 },
    { id: "frost", name: "冰凍塔", cost: 70, dmg: 4, rate: 0.42, range: 140, color: 0x93c5fd, tex: "cd-tw-frost", slow: 0.38, pierce: 0 },
    { id: "splash", name: "爆破塔", cost: 115, dmg: 18, rate: 0.85, range: 120, color: 0xf472b6, tex: "cd-tw-splash", aoe: 62, pierce: 0.1 },
    { id: "tesla", name: "特斯拉", cost: 135, dmg: 13, rate: 0.7, range: 150, color: 0xa3e635, tex: "cd-tw-tesla", chain: 3, chainRange: 90, chainFalloff: 0.62, pierce: 0.35 },
    { id: "rail", name: "軌道砲", cost: 160, dmg: 58, rate: 1.4, range: 215, color: 0xe2e8f0, tex: "cd-tw-rail", pierce: 0.9 }
  ];

  /**
   * 敵人：hp／spd／dmg(漏核)／armor(減傷 0～0.85)
   * 實際受傷 = 原始傷害 × (1 - armor × (1 - pierce))
   */
  var ENEMY_KINDS = [
    { id: "scout", tex: "cd-en-scout", hp: 22, spd: 1.7, dmg: 8, armor: 0, ore: 5, score: 40, tint: 0xf87171 },
    { id: "swarm", tex: "cd-en-swarm", hp: 12, spd: 2.4, dmg: 5, armor: 0, ore: 4, score: 28, tint: 0xfb923c },
    { id: "armor", tex: "cd-en-armor", hp: 44, spd: 1.1, dmg: 11, armor: 0.4, ore: 12, score: 85, tint: 0xa78bfa },
    { id: "shield", tex: "cd-en-shield", hp: 30, spd: 1.3, dmg: 10, armor: 0.65, ore: 15, score: 100, tint: 0x38bdf8 },
    { id: "raider", tex: "cd-en-raider", hp: 34, spd: 2.05, dmg: 18, armor: 0.05, ore: 14, score: 115, tint: 0xf97316 },
    { id: "elite", tex: "cd-en-elite", hp: 105, spd: 1.05, dmg: 20, armor: 0.22, ore: 26, score: 175, tint: 0xfbbf24 },
    { id: "titan", tex: "cd-en-titan", hp: 210, spd: 0.8, dmg: 34, armor: 0.32, ore: 48, score: 360, tint: 0xff6b6b }
  ];

  var ENEMY_BY_ID = {};
  for (var ei = 0; ei < ENEMY_KINDS.length; ei++) ENEMY_BY_ID[ENEMY_KINDS[ei].id] = ENEMY_KINDS[ei];

  var DIFF_COMBAT = {
    casual: { hpMul: 0.82, leakMul: 0.85, spawnMul: 0.9, oreRate: 1.4, oreStart: 170, coreHp: 170 },
    standard: { hpMul: 1.0, leakMul: 1.0, spawnMul: 1.0, oreRate: 1.2, oreStart: 140, coreHp: 135 },
    extreme: { hpMul: 1.38, leakMul: 1.45, spawnMul: 1.18, oreRate: 1.05, oreStart: 110, coreHp: 105 }
  };

  function calcDamage(rawDmg, enemyKind, def) {
    var armor = Math.max(0, Math.min(0.85, (enemyKind && enemyKind.armor) || 0));
    var pierce = Math.max(0, Math.min(1, (def && def.pierce) || 0));
    var effective = armor * (1 - pierce);
    return Math.max(0.5, rawDmg * (1 - effective));
  }

  function pickWeighted(weights) {
    var total = 0;
    var keys = Object.keys(weights);
    for (var i = 0; i < keys.length; i++) total += Math.max(0, weights[keys[i]]);
    if (total <= 0) return "scout";
    var roll = Math.random() * total;
    for (var j = 0; j < keys.length; j++) {
      roll -= Math.max(0, weights[keys[j]]);
      if (roll <= 0) return keys[j];
    }
    return keys[keys.length - 1];
  }

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

    // 禁建障礙（岩塊／廢料）
    g.clear();
    g.fillStyle(0x292524, 1);
    g.fillRoundedRect(4, 6, TILE - 16, TILE - 18, 4);
    g.lineStyle(2, 0x78716c, 0.9);
    g.strokeRoundedRect(4, 6, TILE - 16, TILE - 18, 4);
    g.fillStyle(0x57534e, 1);
    g.fillTriangle(10, 28, 22, 8, 34, 28);
    g.fillStyle(0xa8a29e, 0.55);
    g.fillCircle(18, 18, 3);
    g.generateTexture("cd-block", TILE - 8, TILE - 8);

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

    // 特斯拉：雙線圈
    g.clear();
    g.fillStyle(0x14532d, 1); g.fillRoundedRect(8, 14, 24, 18, 4);
    g.lineStyle(2, 0xa3e635, 1); g.strokeRoundedRect(8, 14, 24, 18, 4);
    g.fillStyle(0xa3e635, 1); g.fillCircle(14, 12, 6); g.fillCircle(26, 12, 6);
    g.fillStyle(0xecfccb, 1); g.fillCircle(20, 22, 4);
    g.lineStyle(2, 0xd9f99d, 0.9); g.lineBetween(14, 12, 26, 12);
    g.generateTexture("cd-tw-tesla", 40, 40);

    // 軌道砲：長管加底座
    g.clear();
    g.fillStyle(0x1e293b, 1); g.fillRoundedRect(6, 16, 28, 16, 4);
    g.lineStyle(2, 0xe2e8f0, 1); g.strokeRoundedRect(6, 16, 28, 16, 4);
    g.fillStyle(0x94a3b8, 1); g.fillRect(18, 4, 5, 22);
    g.fillStyle(0xf8fafc, 1); g.fillCircle(20.5, 6, 3);
    g.fillStyle(0x67e8f9, 0.9); g.fillRect(18, 2, 5, 3);
    g.generateTexture("cd-tw-rail", 40, 40);

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

    // 護盾：圓環艦
    g.clear();
    g.fillStyle(0x0c4a6e, 1); g.fillCircle(16, 16, 14);
    g.lineStyle(3, 0x38bdf8, 1); g.strokeCircle(16, 16, 14);
    g.lineStyle(2, 0x7dd3fc, 0.85); g.strokeCircle(16, 16, 9);
    g.fillStyle(0xe0f2fe, 1); g.fillCircle(16, 16, 4);
    g.generateTexture("cd-en-shield", 32, 32);

    // 劫掠：尖刺快艦
    g.clear();
    g.fillStyle(0x9a3412, 1); g.fillTriangle(18, 0, 34, 28, 2, 28);
    g.fillStyle(0xf97316, 1); g.fillTriangle(18, 6, 28, 24, 8, 24);
    g.fillStyle(0xffedd5, 1); g.fillCircle(18, 16, 3);
    g.lineStyle(2, 0xea580c, 1); g.strokeTriangle(18, 0, 34, 28, 2, 28);
    g.generateTexture("cd-en-raider", 36, 36);

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
    g.clear(); g.fillStyle(0xa3e635, 1); g.fillCircle(4, 4, 4); g.generateTexture("cd-arc", 8, 8);
    g.clear(); g.fillStyle(0xf8fafc, 1); g.fillRect(0, 0, 14, 3); g.generateTexture("cd-railshot", 14, 3);

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

  /** 可見光束（矩形），避免 Phaser Line 幾乎看不見 */
  function addBeam(scene, x1, y1, x2, y2, color, width, alpha) {
    var dist = Math.max(4, Phaser.Math.Distance.Between(x1, y1, x2, y2));
    var ang = Phaser.Math.Angle.Between(x1, y1, x2, y2);
    var beam = scene.add.rectangle(
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      dist,
      width || 3,
      color,
      alpha == null ? 0.95 : alpha
    ).setDepth(19);
    beam.setRotation(ang);
    return beam;
  }

  function muzzleFlash(scene, x, y, color) {
    var flash = scene.add.circle(x, y, 10, color, 0.85).setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
    var ring = scene.add.circle(x, y, 6, 0xffffff, 0.7).setDepth(22);
    scene.tweens.add({
      targets: [flash, ring],
      scale: 2.2,
      alpha: 0,
      duration: 120,
      ease: "Cubic.easeOut",
      onComplete: function () {
        flash.destroy();
        ring.destroy();
      }
    });
  }

  function impactFx(scene, x, y, color, count) {
    Kit.neonBurst(scene, x, y, color, count || 16);
    var spark = scene.add.circle(x, y, 8, color, 0.7).setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: spark, scale: 2.4, alpha: 0, duration: 160, ease: "Cubic.easeOut",
      onComplete: function () { spark.destroy(); }
    });
  }

  /** 直線格子路徑（含起點；接續段會去掉重複起點） */
  function lineCells(x1, y1, x2, y2) {
    var pts = [{ x: x1, y: y1 }];
    var x = x1, y = y1;
    var dx = x2 === x1 ? 0 : (x2 > x1 ? 1 : -1);
    var dy = y2 === y1 ? 0 : (y2 > y1 ? 1 : -1);
    while (x !== x2 || y !== y2) {
      x += dx;
      y += dy;
      pts.push({ x: x, y: y });
    }
    return pts;
  }

  function joinSegments(segs) {
    var out = [];
    for (var i = 0; i < segs.length; i++) {
      var seg = segs[i];
      var start = i === 0 ? 0 : 1;
      for (var j = start; j < seg.length; j++) out.push(seg[j]);
    }
    return out;
  }

  /**
   * 多套地圖：路徑形狀、禁建障礙、配色皆不同。
   * difficulty 權重：casual 偏短直、extreme 偏長彎。
   */
  var MAP_LAYOUTS = [
    {
      id: "forge-hook",
      name: "熔爐折角",
      accent: 0xff8c5a,
      bg: "#0c0706",
      pools: ["casual", "standard"],
      path: function () {
        return joinSegments([
          lineCells(0, 1, 11, 1),
          lineCells(11, 1, 11, 6),
          lineCells(11, 6, 5, 6)
        ]);
      },
      blocked: [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 7, y: 3 }, { x: 8, y: 4 }]
    },
    {
      id: "serpent",
      name: "蛇行礦道",
      accent: 0x34d399,
      bg: "#06120e",
      pools: ["casual", "standard", "extreme"],
      path: function () {
        return joinSegments([
          lineCells(0, 0, 10, 0),
          lineCells(10, 0, 10, 2),
          lineCells(10, 2, 1, 2),
          lineCells(1, 2, 1, 4),
          lineCells(1, 4, 10, 4),
          lineCells(10, 4, 10, 6),
          lineCells(10, 6, 6, 6)
        ]);
      },
      blocked: [{ x: 4, y: 1 }, { x: 5, y: 3 }, { x: 6, y: 5 }, { x: 3, y: 5 }]
    },
    {
      id: "valley-u",
      name: "峽谷迴廊",
      accent: 0x67e8f9,
      bg: "#060c14",
      pools: ["standard", "extreme"],
      path: function () {
        return joinSegments([
          lineCells(0, 3, 2, 3),
          lineCells(2, 3, 2, 6),
          lineCells(2, 6, 9, 6),
          lineCells(9, 6, 9, 1),
          lineCells(9, 1, 5, 1)
        ]);
      },
      blocked: [
        { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 },
        { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }
      ]
    },
    {
      id: "stairs",
      name: "階梯煉廠",
      accent: 0xa78bfa,
      bg: "#0c0614",
      pools: ["casual", "standard", "extreme"],
      path: function () {
        return joinSegments([
          lineCells(0, 0, 2, 0),
          lineCells(2, 0, 2, 2),
          lineCells(2, 2, 5, 2),
          lineCells(5, 2, 5, 4),
          lineCells(5, 4, 8, 4),
          lineCells(8, 4, 8, 6),
          lineCells(8, 6, 11, 6),
          lineCells(11, 6, 11, 3)
        ]);
      },
      blocked: [{ x: 0, y: 3 }, { x: 1, y: 5 }, { x: 3, y: 5 }, { x: 6, y: 1 }, { x: 9, y: 2 }]
    },
    {
      id: "chicane",
      name: "急彎航道",
      accent: 0xfbbf24,
      bg: "#120e06",
      pools: ["standard", "extreme"],
      path: function () {
        return joinSegments([
          lineCells(0, 2, 6, 2),
          lineCells(6, 2, 6, 5),
          lineCells(6, 5, 2, 5),
          lineCells(2, 5, 2, 7),
          lineCells(2, 7, 9, 7),
          lineCells(9, 7, 9, 3),
          lineCells(9, 3, 11, 3)
        ]);
      },
      blocked: [{ x: 4, y: 0 }, { x: 4, y: 3 }, { x: 8, y: 1 }, { x: 8, y: 5 }, { x: 3, y: 3 }]
    },
    {
      id: "deep-core",
      name: "深核巷戰",
      accent: 0xf472b6,
      bg: "#14060c",
      pools: ["extreme"],
      path: function () {
        return joinSegments([
          lineCells(0, 1, 3, 1),
          lineCells(3, 1, 3, 6),
          lineCells(3, 6, 7, 6),
          lineCells(7, 6, 7, 2),
          lineCells(7, 2, 11, 2),
          lineCells(11, 2, 11, 5),
          lineCells(11, 5, 9, 5)
        ]);
      },
      blocked: [
        { x: 1, y: 3 }, { x: 1, y: 4 }, { x: 5, y: 3 }, { x: 5, y: 4 },
        { x: 5, y: 1 }, { x: 9, y: 3 }, { x: 9, y: 7 }, { x: 4, y: 0 }
      ]
    },
    {
      id: "split-lane",
      name: "雙折防線",
      accent: 0xfb923c,
      bg: "#120a06",
      pools: ["casual", "standard"],
      path: function () {
        return joinSegments([
          lineCells(0, 6, 0, 2),
          lineCells(0, 2, 4, 2),
          lineCells(4, 2, 4, 5),
          lineCells(4, 5, 8, 5),
          lineCells(8, 5, 8, 1),
          lineCells(8, 1, 11, 1)
        ]);
      },
      blocked: [{ x: 2, y: 4 }, { x: 2, y: 5 }, { x: 6, y: 2 }, { x: 6, y: 3 }, { x: 10, y: 4 }]
    }
  ];

  function pickMapLayout(diffKey) {
    var pool = MAP_LAYOUTS.filter(function (m) {
      return m.pools.indexOf(diffKey) >= 0;
    });
    if (!pool.length) pool = MAP_LAYOUTS;
    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  class GameScene extends Phaser.Scene {
    constructor() { super("GameScene"); }
    init(data) {
      this.diffKey = Kit.resolveDiffKey(data && data.difficulty);
      this.diff = Kit.DIFF_PRESETS[this.diffKey];
      this.combat = DIFF_COMBAT[this.diffKey] || DIFF_COMBAT.standard;
      this.coreHp = this.combat.coreHp;
      this.coreMax = this.coreHp;
      this.ore = this.combat.oreStart;
      this.hpMul = this.combat.hpMul;
      this.leakMul = this.combat.leakMul;
      this.spawnMul = this.combat.spawnMul;
      this.oreRate = this.combat.oreRate;
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
      this.blocked = {};
      this.mapLayout = null;
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
      this.buildPath();
      var accent = (this.mapLayout && this.mapLayout.accent) || 0xff8c5a;
      this.cameras.main.setBackgroundColor((this.mapLayout && this.mapLayout.bg) || "#0c0706");
      this.cameras.main.fadeIn(200, 4, 6, 12);

      // 背景工業氛圍（隨地圖配色）
      for (var i = 0; i < 40; i++) {
        var star = this.add.circle(
          Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
          Phaser.Math.Between(1, 2), accent, Phaser.Math.FloatBetween(0.08, 0.28)
        ).setDepth(0);
        this.tweens.add({
          targets: star, alpha: 0.05, duration: Phaser.Math.Between(800, 1800),
          yoyo: true, repeat: -1, ease: "Sine.easeInOut"
        });
      }

      var self = this;
      for (var x = 0; x < COLS; x++) {
        this.grid[x] = [];
        for (var y = 0; y < ROWS; y++) {
          var img = this.add.image(OX + x * TILE + TILE / 2, OY + y * TILE + TILE / 2, "cd-tile")
            .setInteractive({ useHandCursor: true }).setAlpha(0.92).setDepth(1);
          img.gx = x; img.gy = y; img.tower = null; img.blocked = false;
          if (this.mapLayout.accent) img.setTint(this.mapLayout.accent);
          img.on("pointerdown", function () { self.onTileClick(this); });
          img.on("pointerover", function () {
            if (!this.tower && !this.blocked) this.setTint(0xffccaa);
            self.onTileHover(this);
          });
          img.on("pointerout", function () {
            if (self.mapLayout && self.mapLayout.accent && !this.tower) this.setTint(self.mapLayout.accent);
            else if (!this.tower) this.clearTint();
            self.onTileHoverEnd(this);
          });
          this.grid[x][y] = img;
        }
      }
      this.path.forEach(function (p) {
        var pathImg = self.add.image(OX + p.x * TILE + TILE / 2, OY + p.y * TILE + TILE / 2, "cd-path")
          .setDepth(2).setAlpha(0.95);
        if (self.mapLayout.accent) pathImg.setTint(self.mapLayout.accent);
      });
      Object.keys(this.blocked).forEach(function (key) {
        var parts = key.split(",");
        var bx = Number(parts[0]), by = Number(parts[1]);
        if (self.grid[bx] && self.grid[bx][by]) {
          self.grid[bx][by].blocked = true;
          self.grid[bx][by].disableInteractive();
          self.grid[bx][by].setAlpha(0.35);
        }
        var blk = self.add.image(OX + bx * TILE + TILE / 2, OY + by * TILE + TILE / 2, "cd-block")
          .setDepth(3).setAlpha(0.95);
        if (self.mapLayout.accent) blk.setTint(self.mapLayout.accent);
      });

      var coreCell = this.path[this.path.length - 1];
      this.core = this.add.image(
        OX + coreCell.x * TILE + TILE / 2,
        OY + coreCell.y * TILE + TILE / 2,
        "cd-core"
      ).setDepth(8);
      if (this.mapLayout.accent) this.core.setTint(this.mapLayout.accent);
      this.coreGlow = this.add.circle(this.core.x, this.core.y, 28, this.mapLayout.accent || 0xff8c5a, 0.22).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [this.core, this.coreGlow], scale: 1.08, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
      });

      this.enemies = this.add.group();
      this.fxLayer = this.add.container(0, 0).setDepth(25);
      this.rangeGfx = this.add.graphics().setDepth(6);
      this.inspectedTile = null;
      this.hoverPreview = false;

      this.hud = this.add.text(12, 8, "", {
        fontFamily: "Segoe UI", fontSize: "14px", fontStyle: "bold", color: "#ff8c5a"
      }).setDepth(30);
      this.hudDanger = this.add.text(12, 30, "DANGER x1.00", {
        fontFamily: "Segoe UI", fontSize: "13px", fontStyle: "bold", color: "#f472b6"
      }).setDepth(30);
      this.hudTip = this.add.text(W / 2, H - 14,
        "地圖：" + this.mapLayout.name + " · 護盾／重甲需破甲塔 · 路徑與岩石不能蓋", {
        fontFamily: "Microsoft JhengHei", fontSize: "12px", color: "#a8a29e"
      }).setOrigin(0.5, 1).setDepth(30);

      TOWERS.forEach(function (t, i) {
        var col = i % 2;
        var row = Math.floor(i / 2);
        var btn = Kit.makeMenuButton(
          self,
          52 + col * 102,
          68 + row * 44,
          t.name + " $" + t.cost,
          t.color,
          function () {
            self.selected = i;
            self.refreshSelect();
            SFX.click();
            if (self.inspectedTile && self.inspectedTile.tower) {
              self.showTowerRange(self.inspectedTile);
            }
          },
          96,
          34
        );
        self.selectBtns.push(btn);
      });
      this.refreshSelect();

      Kit.makeMenuButton(this, W - 72, 28, "開波 ▶", 0xff8c5a, function () { self.startWave(); }, 128, 42);
      this.btnAuto = Kit.makeMenuButton(this, W - 72, 78, "自動：關", 0xfbbf24, function () {
        self.autoWave = !self.autoWave;
        self.btnAuto.txt.setText(self.autoWave ? "自動：開" : "自動：關");
        self.btnAuto.bg.setFillStyle(0xfbbf24, self.autoWave ? 0.45 : 0.22);
        SFX.click();
        if (self.autoWave && self.gameStarted && !self.waveActive && self.wave < 20) {
          self.startWave();
        }
      }, 128, 42);
      this.btnSpeed = Kit.makeMenuButton(this, W - 72, 128, "加速 ×1", 0x67e8f9, function () {
        self.speedMul = self.speedMul >= 3 ? 1 : self.speedMul + 1;
        self.btnSpeed.txt.setText("加速 ×" + self.speedMul);
        self.btnSpeed.bg.setFillStyle(0x67e8f9, self.speedMul > 1 ? 0.45 : 0.22);
        self.time.timeScale = self.speedMul;
        SFX.click();
      }, 128, 42);

      var shakeOn = !!(Kit.getSettings() && Kit.getSettings().shake);
      this.btnShake = Kit.makeMenuButton(this, W - 72, 178, shakeOn ? "震動：開" : "震動：關", 0xa78bfa, function () {
        var s = Kit.getSettings();
        s.shake = !s.shake;
        Kit.saveSettings();
        self.btnShake.txt.setText(s.shake ? "震動：開" : "震動：關");
        self.btnShake.bg.setFillStyle(0xa78bfa, s.shake ? 0.45 : 0.22);
        SFX.click();
        if (s.shake) Kit.screenShake(self, 90, 0.01);
      }, 128, 42);
      this.btnShake.bg.setFillStyle(0xa78bfa, shakeOn ? 0.45 : 0.22);

      floatText(this, W / 2, 88, this.mapLayout.name, "#fde68a");
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
      this.mapLayout = pickMapLayout(this.diffKey);
      this.path = this.mapLayout.path();
      this.blocked = {};
      var pathKeys = {};
      for (var i = 0; i < this.path.length; i++) {
        pathKeys[this.path[i].x + "," + this.path[i].y] = true;
      }
      var blocks = this.mapLayout.blocked || [];
      for (var b = 0; b < blocks.length; b++) {
        var cell = blocks[b];
        var key = cell.x + "," + cell.y;
        if (pathKeys[key]) continue;
        if (cell.x < 0 || cell.x >= COLS || cell.y < 0 || cell.y >= ROWS) continue;
        this.blocked[key] = true;
      }
    }

    isPathCell(gx, gy) {
      for (var i = 0; i < this.path.length; i++) {
        if (this.path[i].x === gx && this.path[i].y === gy) return true;
      }
      return false;
    }

    clearRangeGfx() {
      if (this.rangeGfx) this.rangeGfx.clear();
    }

    drawRangeAt(x, y, def, preview) {
      if (!this.rangeGfx || !def) return;
      var alphaFill = preview ? 0.08 : 0.14;
      var alphaLine = preview ? 0.55 : 0.9;
      this.rangeGfx.clear();
      this.rangeGfx.fillStyle(def.color, alphaFill);
      this.rangeGfx.fillCircle(x, y, def.range);
      this.rangeGfx.lineStyle(2, def.color, alphaLine);
      this.rangeGfx.strokeCircle(x, y, def.range);
      if (def.aoe) {
        this.rangeGfx.lineStyle(1.5, 0xffffff, preview ? 0.35 : 0.55);
        this.rangeGfx.strokeCircle(x, y, def.aoe);
      }
      if (def.chainRange) {
        this.rangeGfx.lineStyle(1.5, 0xa3e635, preview ? 0.3 : 0.5);
        this.rangeGfx.strokeCircle(x, y, def.chainRange);
      }
    }

    showTowerRange(tile) {
      if (!tile || !tile.tower) return;
      this.inspectedTile = tile;
      this.hoverPreview = false;
      this.drawRangeAt(tile.x, tile.y, tile.tower.def, false);
      if (tile.tower.ring) {
        this.tweens.add({
          targets: tile.tower.ring,
          scale: 1.35,
          alpha: 0.45,
          duration: 160,
          yoyo: true,
          ease: "Cubic.easeOut"
        });
      }
    }

    hideTowerRange() {
      this.inspectedTile = null;
      this.hoverPreview = false;
      this.clearRangeGfx();
    }

    onTileHover(tile) {
      if (!this.alive) return;
      if (tile.tower) {
        if (this.inspectedTile !== tile) {
          this.drawRangeAt(tile.x, tile.y, tile.tower.def, true);
          this.hoverPreview = true;
        }
        return;
      }
      if (tile.blocked || this.isPathCell(tile.gx, tile.gy)) {
        if (!this.inspectedTile) this.clearRangeGfx();
        else if (this.inspectedTile.tower) {
          this.drawRangeAt(this.inspectedTile.x, this.inspectedTile.y, this.inspectedTile.tower.def, false);
        }
        return;
      }
      if (this.inspectedTile) return;
      var def = TOWERS[this.selected];
      if (!def) return;
      this.hoverPreview = true;
      this.drawRangeAt(tile.x, tile.y, def, true);
    }

    onTileHoverEnd(tile) {
      if (this.inspectedTile && this.inspectedTile.tower) {
        this.drawRangeAt(this.inspectedTile.x, this.inspectedTile.y, this.inspectedTile.tower.def, false);
        this.hoverPreview = false;
        return;
      }
      if (this.hoverPreview) {
        this.clearRangeGfx();
        this.hoverPreview = false;
      }
    }

    onTileClick(tile) {
      if (!this.alive) return;
      if (tile.tower) {
        if (this.inspectedTile === tile) {
          this.hideTowerRange();
          SFX.click();
        } else {
          this.showTowerRange(tile);
          SFX.click();
          this.hudTip.setText(tile.tower.def.name + " · 射程 " + tile.tower.def.range + " · 再點一次關閉範圍");
        }
        return;
      }
      this.hideTowerRange();
      this.tryBuild(tile);
    }

    tryBuild(tile) {
      if (!this.alive || tile.tower || tile.blocked) return;
      if (this.blocked[tile.gx + "," + tile.gy]) {
        floatText(this, tile.x, tile.y, "障礙禁建", "#a8a29e");
        return;
      }
      if (this.isPathCell(tile.gx, tile.gy)) {
        floatText(this, tile.x, tile.y, "路徑禁建", "#f87171");
        return;
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
      // 放置後短暫顯示射程，不鎖成檢視（避免一直固定不消失）
      this.inspectedTile = null;
      this.hoverPreview = true;
      this.drawRangeAt(tile.x, tile.y, def, true);
      var self = this;
      var placeToken = (this._rangeFlashToken = (this._rangeFlashToken || 0) + 1);
      this.time.delayedCall(850, function () {
        if (placeToken !== self._rangeFlashToken) return;
        if (self.inspectedTile) return;
        self.clearRangeGfx();
        self.hoverPreview = false;
      });
      this.hudTip.setText(def.name + " 已部署 · 點砲塔可查看／關閉射程");
    }

    startWave() {
      if (!this.alive || this.waveActive) return;
      if (this.wave >= 20) return;
      this.gameStarted = true;
      this.wave += 1;
      this.waveActive = true;
      var baseCount = 10 + this.wave * 2 + (this.wave >= 10 ? 5 : 0) + (this.wave >= 16 ? 3 : 0);
      this.spawnLeft = Math.max(8, Math.round(baseCount * this.spawnMul));
      this.spawnAcc = 0;
      floatText(this, W / 2, 70, "WAVE " + this.wave, "#ff8c5a");
      var tip = "敵軍壓線中 — 守住核心";
      if (this.wave >= 15) tip = "⚠ 泰坦壓境 — 軌道／雷射破甲優先";
      else if (this.wave % 4 === 0) tip = "⚠ 精英混編 — 注意護盾單位";
      else if (this.wave >= 7) tip = "重甲／護盾出現 — 破甲塔更有效";
      this.hudTip.setText(tip);
    }

    pickEnemyKind() {
      var w = this.wave;
      var diff = this.diffKey;
      var left = this.spawnLeft;

      if (w >= 15 && left <= 1) return ENEMY_BY_ID.titan;
      if (w >= 18 && left <= 2 && diff === "extreme") return ENEMY_BY_ID.titan;
      if (w % 4 === 0 && left <= 2) return ENEMY_BY_ID.elite;
      if (w >= 11 && left <= 3 && Math.random() < (diff === "extreme" ? 0.55 : 0.3)) {
        return ENEMY_BY_ID.raider;
      }

      var weights = {
        scout: Math.max(0.15, 1.1 - w * 0.04),
        swarm: w >= 2 ? 0.55 + (diff === "casual" ? 0.15 : 0) : 0,
        armor: w >= 5 ? (diff === "casual" ? 0.28 : diff === "extreme" ? 0.72 : 0.48) : 0,
        shield: w >= 7 ? (diff === "casual" ? 0.12 : diff === "extreme" ? 0.58 : 0.32) : 0,
        raider: w >= 8 ? (diff === "extreme" ? 0.42 : diff === "standard" ? 0.22 : 0.1) : 0,
        elite: w >= 10 ? (diff === "extreme" ? 0.18 : 0.1) : 0
      };
      return ENEMY_BY_ID[pickWeighted(weights)] || ENEMY_BY_ID.scout;
    }

    spawnEnemy() {
      var kind = this.pickEnemyKind();
      if (!kind) kind = ENEMY_BY_ID.scout;
      var start = this.path[0];
      var e = this.add.image(
        OX + start.x * TILE + TILE / 2,
        OY + start.y * TILE + TILE / 2,
        kind.tex
      ).setDepth(12);
      var hp = Math.floor(kind.hp * this.hpMul * (1 + this.wave * 0.09) * this.dangerMultiplier);
      hp = Math.max(1, hp);
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
        this.ore += this.oreRate * dt;
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
          var leak = Math.max(1, Math.round(d.kind.dmg * self.leakMul));
          self.coreHp -= leak;
          floatText(self, self.core.x, self.core.y - 24, "-" + leak, "#fb7185");
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
      else if (def.id === "splash") this.fireSplash(tile, enemy, def, ang, mx, my);
      else if (def.id === "tesla") this.fireTesla(tile, enemy, def);
      else if (def.id === "rail") this.fireRail(tile, enemy, def, mx, my);
      else this.fireGun(tile, enemy, def, ang, mx, my);
    }

    applyHit(enemy, def, rawDmg, showNum) {
      if (!enemy || !enemy.active) return;
      var d = enemy.data.values;
      if (!d || !d.kind) return;
      var dmg = calcDamage(rawDmg, d.kind, def);
      d.hp -= dmg;
      d.hitFlash = 0.08;
      if (def && def.slow) d.slow = Math.min(d.slow, def.slow);
      if (showNum) {
        floatText(
          this,
          enemy.x + Phaser.Math.Between(-8, 8),
          enemy.y - 10,
          "-" + Math.ceil(dmg),
          "#fff7ed"
        );
      }
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
      muzzleFlash(this, mx, my, def.color);
      var bullet = this.add.image(mx, my, "cd-bullet").setDepth(18).setTint(def.color).setScale(1.4);
      var trail = this.add.circle(mx, my, 4, def.color, 0.55).setDepth(17).setBlendMode(Phaser.BlendModes.ADD);
      var tx = enemy.x, ty = enemy.y;
      var self = this;
      this.tweens.add({
        targets: [bullet, trail],
        x: tx,
        y: ty,
        duration: 90,
        ease: "Cubic.easeIn",
        onComplete: function () {
          bullet.destroy();
          trail.destroy();
          impactFx(self, tx, ty, def.color, 12);
          if (enemy.active) self.applyHit(enemy, def, def.dmg, true);
        }
      });
      if (SFX.hit) SFX.hit();
    }

    fireLaser(tile, enemy, def, mx, my) {
      var tx = enemy.x, ty = enemy.y;
      muzzleFlash(this, mx, my, def.color);
      var core = addBeam(this, mx, my, tx, ty, def.color, 5, 0.95);
      var glow = addBeam(this, mx, my, tx, ty, 0xecfeff, 10, 0.35);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: [core, glow], alpha: 0, duration: 140, ease: "Cubic.easeOut",
        onComplete: function () { core.destroy(); glow.destroy(); }
      });
      impactFx(this, tx, ty, def.color, 14);
      if (enemy.active) this.applyHit(enemy, def, def.dmg, true);
      if (SFX.hit) SFX.hit();
    }

    fireFrost(tile, enemy, def, ang, mx, my) {
      muzzleFlash(this, mx, my, def.color);
      var flake = this.add.image(mx, my, "cd-ice").setDepth(18).setTint(def.color).setScale(1.35);
      var aura = this.add.circle(mx, my, 7, def.color, 0.4).setDepth(17).setBlendMode(Phaser.BlendModes.ADD);
      var tx = enemy.x, ty = enemy.y;
      var self = this;
      this.tweens.add({
        targets: [flake, aura], x: tx, y: ty, duration: 140, ease: "Cubic.easeIn",
        onComplete: function () {
          flake.destroy();
          aura.destroy();
          impactFx(self, tx, ty, def.color, 16);
          var freeze = self.add.circle(tx, ty, 16, 0x93c5fd, 0.35).setDepth(20);
          self.tweens.add({
            targets: freeze, scale: 1.8, alpha: 0, duration: 220, ease: "Cubic.easeOut",
            onComplete: function () { freeze.destroy(); }
          });
          if (enemy.active) {
            self.applyHit(enemy, def, def.dmg, true);
            enemy.setTint(0x93c5fd);
          }
        }
      });
      if (SFX.hit) SFX.hit();
    }

    fireSplash(tile, enemy, def, ang, mx, my) {
      muzzleFlash(this, mx, my, def.color);
      var shell = this.add.image(mx, my, "cd-boom").setDepth(18).setTint(def.color).setScale(0.7);
      var tx = enemy.x, ty = enemy.y;
      var self = this;
      this.tweens.add({
        targets: shell, x: tx, y: ty, duration: 180, ease: "Cubic.easeIn",
        onComplete: function () {
          shell.destroy();
          var blast = self.add.circle(tx, ty, def.aoe, def.color, 0.28).setDepth(20);
          var ring = self.add.circle(tx, ty, 12, 0xffffff, 0.5).setDepth(21);
          self.tweens.add({
            targets: [blast, ring], alpha: 0, scale: 1.15, duration: 220, ease: "Cubic.easeOut",
            onComplete: function () { blast.destroy(); ring.destroy(); }
          });
          impactFx(self, tx, ty, def.color, 22);
          Kit.screenShake(self, 70, 0.006);
          self.enemies.getChildren().forEach(function (e) {
            if (!e.active) return;
            var dist = Phaser.Math.Distance.Between(tx, ty, e.x, e.y);
            if (dist <= def.aoe) {
              var falloff = dist < 16 ? 1 : 0.55;
              self.applyHit(e, def, def.dmg * falloff, dist < 22);
            }
          });
        }
      });
      if (SFX.explode) SFX.explode();
    }

    fireTesla(tile, enemy, def) {
      var self = this;
      var hit = [];
      var cursor = enemy;
      var dmg = def.dmg;
      var hops = Math.max(1, def.chain || 1);
      var fromX = tile.x;
      var fromY = tile.y;
      muzzleFlash(this, tile.x, tile.y, def.color);

      for (var i = 0; i < hops; i++) {
        if (!cursor || !cursor.active) break;
        hit.push(cursor);
        var toX = cursor.x;
        var toY = cursor.y;
        var core = addBeam(self, fromX, fromY, toX, toY, def.color, 4, 0.95);
        var glow = addBeam(self, fromX, fromY, toX, toY, 0xecfccb, 8, 0.35);
        glow.setBlendMode(Phaser.BlendModes.ADD);
        (function (a, b, hx, hy) {
          self.tweens.add({
            targets: [a, b], alpha: 0, duration: 160, ease: "Cubic.easeOut",
            onComplete: function () { a.destroy(); b.destroy(); }
          });
          impactFx(self, hx, hy, def.color, 10);
        })(core, glow, toX, toY);
        self.applyHit(cursor, def, dmg, i === 0);
        dmg *= def.chainFalloff || 0.6;
        fromX = toX;
        fromY = toY;

        var next = null;
        var best = def.chainRange || 90;
        self.enemies.getChildren().forEach(function (e) {
          if (!e.active || hit.indexOf(e) >= 0) return;
          var dist = Phaser.Math.Distance.Between(fromX, fromY, e.x, e.y);
          if (dist < best) {
            best = dist;
            next = e;
          }
        });
        cursor = next;
      }
      if (SFX.hit) SFX.hit();
    }

    fireRail(tile, enemy, def, mx, my) {
      var tx = enemy.x, ty = enemy.y;
      muzzleFlash(this, mx, my, def.color);
      var core = addBeam(this, mx, my, tx, ty, def.color, 6, 1);
      var glow = addBeam(this, mx, my, tx, ty, 0x67e8f9, 12, 0.4);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      var slug = this.add.image(mx, my, "cd-railshot").setDepth(20).setTint(0xffffff).setScale(1.4);
      var self = this;
      this.tweens.add({
        targets: slug, x: tx, y: ty, duration: 70, ease: "Cubic.easeIn",
        onComplete: function () {
          slug.destroy();
          if (enemy.active) self.applyHit(enemy, def, def.dmg, true);
          impactFx(self, tx, ty, def.color, 24);
          Kit.screenShake(self, 110, 0.012);
        }
      });
      this.tweens.add({
        targets: [core, glow], alpha: 0, duration: 180, ease: "Cubic.easeOut",
        onComplete: function () { core.destroy(); glow.destroy(); }
      });
      if (SFX.explode) SFX.explode();
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
      "【操作】左側選塔 → 點空地建造（路徑與岩石障礙不能蓋）。按「開波」開始後才會持續產礦。\n\n" +
      "【地圖】每局依難度隨機抽佈局；重開或換難度都會重新抽圖。\n\n" +
      "【砲塔】機槍清雜｜雷射破甲遠射｜冰凍減速｜爆破群傷｜特斯拉彈跳｜軌道斬殺重甲／護盾。\n\n" +
      "【防禦】敵人有裝甲減傷；破甲越高（雷射／軌道）對護盾與重甲越有效。\n\n" +
      "【敵軍】斥候／蟲群／重甲／護盾／劫掠／精英／泰坦。難度影響血量、漏核傷害、出怪組成與數量。\n\n" +
      "【自動開波／加速】可自動開下一波；加速在 ×1／×2／×3 間切換。",
    makeTextures: makeTextures,
    briefFn: function (diff) {
      var d = Kit.DIFF_PRESETS[Kit.resolveDiffKey(diff)];
      return [
        { title: "破甲優先", body: "護盾／重甲吃機槍很肉，改上雷射、軌道或特斯拉。" },
        { title: "控場與群傷", body: "冰凍拖慢劫掠與蟲群；爆破清密集路線。" },
        { title: d.label, body: "難度會改變敵血、漏核傷害與精英／護盾比例。" }
      ];
    },
    GameScene: GameScene
  });
})();
