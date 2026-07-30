/**
 * Cyber Rogue Dungeon — 像素機甲貼圖（覆寫 suite 內幾何三角／圓形）
 * 使用 Canvas 2D 畫出機體、敵人、膠囊、地牢地板。
 */
(function (root) {
  "use strict";

  function hex(n) {
    return "#" + (n >>> 0).toString(16).padStart(6, "0");
  }

  function bake(scene, key, w, h, paint) {
    var c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    var ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    paint(ctx, w, h);
    if (scene.textures.exists(key)) {
      try { scene.textures.remove(key); } catch (_e) {}
    }
    scene.textures.addCanvas(key, c);
  }

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = typeof color === "number" ? hex(color) : color;
    ctx.fillRect(x | 0, y | 0, w | 0, h | 0);
  }

  function outline(ctx, x, y, w, h, fill, edge) {
    px(ctx, x, y, w, h, edge);
    px(ctx, x + 1, y + 1, w - 2, h - 2, fill);
  }

  /** 朝右的賽博戰鬥機（面板機甲，非三角） */
  function paintFighter(ctx, w, h, mk2) {
    var cy = (h / 2) | 0;
    var hull = mk2 ? "#4c1d95" : "#1e3a5f";
    var hullHi = mk2 ? "#7c3aed" : "#3b82f6";
    var armor = mk2 ? "#e879f9" : "#fbbf24";
    var armorDk = mk2 ? "#a21caf" : "#d97706";
    var glass = "#67e8f9";
    // 陰影
    px(ctx, 12, h - 8, w - 24, 5, "rgba(0,0,0,0.4)");
    // 尾噴底座
    px(ctx, 2, cy - 10, 14, 20, "#0f172a");
    px(ctx, 4, cy - 8, 10, 6, mk2 ? "#d946ef" : "#ea580c");
    px(ctx, 4, cy + 2, 10, 6, mk2 ? "#f0abfc" : "#fb923c");
    px(ctx, 0, cy - 3, 8, 6, "#fff7ed");
    // 下翼（先畫）
    px(ctx, 26, cy + 8, 42, 12, "#0f172a");
    px(ctx, 28, cy + 10, 38, 8, hull);
    px(ctx, 30, cy + 12, 34, 2, armor);
    px(ctx, 34, cy + 16, 8, 4, "#22d3ee");
    px(ctx, 52, cy + 16, 8, 4, "#22d3ee");
    // 上翼
    px(ctx, 26, cy - 20, 42, 12, "#0f172a");
    px(ctx, 28, cy - 18, 38, 8, hull);
    px(ctx, 30, cy - 14, 34, 2, armor);
    px(ctx, 40, cy - 22, 10, 4, glass);
    px(ctx, 42, cy - 24, 6, 3, "#ffffff");
    // 主機身
    px(ctx, 16, cy - 11, 62, 22, "#0f172a");
    px(ctx, 18, cy - 9, 58, 18, hull);
    px(ctx, 20, cy - 7, 54, 4, hullHi);
    px(ctx, 20, cy + 3, 54, 4, "#0f172a");
    // 裝甲板
    px(ctx, 24, cy - 3, 46, 6, armor);
    px(ctx, 26, cy - 2, 42, 2, "#ffffff");
    px(ctx, 26, cy + 1, 42, 2, armorDk);
    // 艙蓋線
    px(ctx, 36, cy - 9, 2, 18, "#0f172a");
    px(ctx, 50, cy - 9, 2, 18, "#0f172a");
    // 駕駛艙
    px(ctx, 52, cy - 8, 18, 10, "#0e7490");
    px(ctx, 54, cy - 7, 14, 8, glass);
    px(ctx, 56, cy - 6, 6, 3, "#ffffff");
    px(ctx, 62, cy - 3, 5, 4, "#a5f3fc");
    // 機鼻階梯
    px(ctx, 74, cy - 7, 16, 14, "#0f172a");
    px(ctx, 76, cy - 5, 14, 10, armorDk);
    px(ctx, 86, cy - 3, 10, 6, armor);
    px(ctx, 94, cy - 2, 6, 4, "#ffffff");
    // 雙聯機炮
    px(ctx, 88, cy - 10, 14, 3, "#64748b");
    px(ctx, 88, cy + 7, 14, 3, "#64748b");
    px(ctx, 100, cy - 10, 4, 3, glass);
    px(ctx, 100, cy + 7, 4, 3, glass);
    // 進氣／警示條
    px(ctx, 22, cy - 6, 10, 3, "#ef4444");
    px(ctx, 22, cy + 3, 10, 3, "#ef4444");
    px(ctx, 24, cy - 5, 3, 1, "#fecaca");
    // 識別燈
    px(ctx, 68, cy - 10, 4, 3, "#4ade80");
    px(ctx, 68, cy + 7, 4, 3, "#f43f5e");
    // 尾翼安定面
    px(ctx, 14, cy - 16, 8, 6, hullHi);
    px(ctx, 14, cy + 10, 8, 6, hullHi);
  }

  function paintMech(ctx, w, h, palette) {
    var cx = (w / 2) | 0;
    var cy = (h / 2) | 0;
    var body = palette.body;
    var accent = palette.accent;
    var glow = palette.glow;
    var dark = palette.dark || 0x0f172a;
    // 腿
    outline(ctx, cx - 12, cy + 6, 8, 14, body, dark);
    outline(ctx, cx + 4, cy + 6, 8, 14, body, dark);
    px(ctx, cx - 13, cy + 16, 10, 4, dark);
    px(ctx, cx + 3, cy + 16, 10, 4, dark);
    // 軀幹
    outline(ctx, cx - 11, cy - 8, 22, 18, body, dark);
    px(ctx, cx - 8, cy - 5, 16, 5, accent);
    px(ctx, cx - 6, cy + 2, 12, 3, glow);
    // 肩甲
    outline(ctx, cx - 18, cy - 10, 8, 10, accent, dark);
    outline(ctx, cx + 10, cy - 10, 8, 10, accent, dark);
    // 頭
    outline(ctx, cx - 7, cy - 18, 14, 12, body, dark);
    px(ctx, cx - 5, cy - 14, 4, 4, glow);
    px(ctx, cx + 1, cy - 14, 4, 4, glow);
    px(ctx, cx - 3, cy - 8, 6, 2, 0xffffff);
    // 武器臂
    if (palette.gun) {
      outline(ctx, cx + 14, cy - 4, 14, 5, 0x64748b, dark);
      px(ctx, cx + 26, cy - 3, 4, 3, glow);
    }
  }

  function paintDrone(ctx, w, h, palette) {
    var cx = (w / 2) | 0;
    var cy = (h / 2) | 0;
    // 旋翼臂
    px(ctx, 2, cy - 2, w - 4, 4, palette.dark || 0x1e293b);
    outline(ctx, 2, cy - 8, 10, 10, palette.accent, 0x0f172a);
    outline(ctx, w - 12, cy - 8, 10, 10, palette.accent, 0x0f172a);
    px(ctx, 4, cy - 6, 6, 6, palette.glow);
    px(ctx, w - 10, cy - 6, 6, 6, palette.glow);
    // 機身
    outline(ctx, cx - 10, cy - 6, 20, 14, palette.body, 0x0f172a);
    px(ctx, cx - 6, cy - 3, 12, 6, palette.glow);
    px(ctx, cx - 3, cy - 1, 6, 2, 0xffffff);
    // 底掛武器
    px(ctx, cx - 2, cy + 6, 4, 8, 0x64748b);
  }

  function paintTank(ctx, w, h, palette) {
    var cx = (w / 2) | 0;
    outline(ctx, 4, h - 16, w - 8, 12, palette.body, 0x0f172a);
    px(ctx, 6, h - 14, w - 12, 3, palette.accent);
    // 履帶細節
    for (var i = 8; i < w - 8; i += 6) px(ctx, i, h - 8, 3, 3, 0x0f172a);
    // 砲塔
    outline(ctx, cx - 10, 8, 20, 16, palette.accent, 0x0f172a);
    px(ctx, cx - 6, 12, 12, 6, palette.glow);
    outline(ctx, cx + 8, 12, 18, 5, 0x64748b, 0x0f172a);
    px(ctx, cx + 24, 13, 4, 3, palette.glow);
  }

  function paintCapsule(ctx, w, h, color, icon) {
    var cx = (w / 2) | 0;
    var cy = (h / 2) | 0;
    // 外框光暈（方塊暈，不用大圓當主體）
    px(ctx, 4, 4, w - 8, h - 8, color);
    outline(ctx, 8, 6, w - 16, h - 12, 0x0f172a, color);
    outline(ctx, 11, 9, w - 22, h - 18, color, 0xffffff);
    // 玻璃窗
    px(ctx, cx - 6, cy - 8, 12, 14, "rgba(255,255,255,0.35)");
    if (icon === "bolt") {
      px(ctx, cx - 2, cy - 8, 4, 6, 0xffffff);
      px(ctx, cx - 4, cy - 2, 8, 3, 0xffffff);
      px(ctx, cx, cy + 1, 4, 6, 0xffffff);
    } else if (icon === "fire") {
      px(ctx, cx - 4, cy - 2, 8, 10, 0xfde68a);
      px(ctx, cx - 2, cy - 6, 4, 6, 0xffffff);
    } else if (icon === "ice") {
      px(ctx, cx - 1, cy - 8, 2, 16, 0xffffff);
      px(ctx, cx - 6, cy - 1, 12, 2, 0xffffff);
      px(ctx, cx - 4, cy - 5, 8, 2, 0xe0f2fe);
    } else if (icon === "missile") {
      px(ctx, cx - 6, cy - 2, 14, 4, 0xffffff);
      px(ctx, cx + 6, cy - 4, 4, 8, 0xffffff);
    } else if (icon === "armor") {
      outline(ctx, cx - 6, cy - 6, 12, 12, 0xe2e8f0, 0xffffff);
      px(ctx, cx - 2, cy - 2, 4, 4, 0x64748b);
    }
  }

  function paintBullet(ctx, w, h, color) {
    outline(ctx, 0, 2, w, h - 4, color, 0xffffff);
    px(ctx, w - 6, 3, 5, h - 6, 0xffffff);
    px(ctx, 2, 4, 6, h - 8, "rgba(0,0,0,0.25)");
  }

  function paintFloor(ctx, w, h) {
    px(ctx, 0, 0, w, h, 0x0b1220);
    for (var y = 0; y < h; y += 16) {
      for (var x = 0; x < w; x += 16) {
        var alt = ((x / 16 + y / 16) | 0) % 2 === 0;
        px(ctx, x, y, 16, 16, alt ? 0x111827 : 0x0f172a);
        px(ctx, x, y, 16, 1, 0x1e293b);
        px(ctx, x, y, 1, 16, 0x1e293b);
        if ((x + y) % 64 === 0) {
          px(ctx, x + 6, y + 6, 4, 4, 0x1d4ed8);
          px(ctx, x + 7, y + 7, 2, 2, 0x38bdf8);
        }
      }
    }
  }

  function paintPillar(ctx, w, h) {
    outline(ctx, 8, 0, w - 16, h, 0x334155, 0x0f172a);
    px(ctx, 12, 4, w - 24, h - 8, 0x1e293b);
    for (var y = 10; y < h - 10; y += 18) {
      px(ctx, 14, y, w - 28, 3, 0xfbbf24);
      px(ctx, 16, y + 6, w - 32, 2, 0x22d3ee);
    }
    px(ctx, w / 2 - 2, 0, 4, h, 0x67e8f9);
  }

  function paintCrate(ctx, w, h) {
    outline(ctx, 2, 2, w - 4, h - 4, 0xb45309, 0x78350f);
    px(ctx, 6, 6, w - 12, 6, 0xfbbf24);
    px(ctx, 6, h / 2 - 2, w - 12, 4, 0x78350f);
    px(ctx, w / 2 - 2, 6, 4, h - 12, 0x78350f);
    px(ctx, 8, 8, 4, 2, 0xffffff);
  }

  function install(scene) {
    // 玩家機
    bake(scene, "player-fighter", 112, 64, function (ctx, w, h) {
      paintFighter(ctx, w, h, false);
    });
    bake(scene, "player-fighter-mk2", 112, 64, function (ctx, w, h) {
      paintFighter(ctx, w, h, true);
    });
    bake(scene, "engine-flame", 20, 16, function (ctx, w, h) {
      px(ctx, 0, 4, 12, 8, 0xea580c);
      px(ctx, 4, 2, 10, 12, 0xf97316);
      px(ctx, 8, 5, 10, 6, 0xfde68a);
      px(ctx, 14, 6, 6, 4, 0xffffff);
    });

    // 敵人（機甲／無人機／坦克 — 不用三角球）
    bake(scene, "foe-scout", 40, 32, function (ctx, w, h) {
      paintDrone(ctx, w, h, { body: 0x0ea5e9, accent: 0x0369a1, glow: 0x7dd3fc });
    });
    bake(scene, "foe-swarm", 28, 24, function (ctx, w, h) {
      paintDrone(ctx, w, h, { body: 0x22c55e, accent: 0x166534, glow: 0x86efac });
    });
    bake(scene, "foe-wasp", 40, 28, function (ctx, w, h) {
      paintDrone(ctx, w, h, { body: 0xf59e0b, accent: 0xb45309, glow: 0xfde68a });
    });
    bake(scene, "foe-grunt", 40, 44, function (ctx, w, h) {
      paintMech(ctx, w, h, { body: 0xea580c, accent: 0x9a3412, glow: 0xfdba74, gun: true });
    });
    bake(scene, "foe-crawler", 48, 36, function (ctx, w, h) {
      paintMech(ctx, w, h, { body: 0x0f766e, accent: 0x115e59, glow: 0x5eead4, gun: false });
      // 額外履帶腳
      px(ctx, 4, h - 8, 10, 6, 0x134e4a);
      px(ctx, w - 14, h - 8, 10, 6, 0x134e4a);
    });
    bake(scene, "foe-shield", 44, 44, function (ctx, w, h) {
      paintMech(ctx, w, h, { body: 0x64748b, accent: 0x334155, glow: 0x22d3ee, gun: false });
      outline(ctx, 6, 10, 8, 22, 0x94a3b8, 0x0f172a);
      outline(ctx, w - 14, 10, 8, 22, 0x94a3b8, 0x0f172a);
    });
    bake(scene, "foe-sniper", 40, 44, function (ctx, w, h) {
      paintMech(ctx, w, h, { body: 0x6366f1, accent: 0x3730a3, glow: 0xc7d2fe, gun: true });
      outline(ctx, w / 2 + 8, 14, 22, 4, 0x1e1b4b, 0x0f172a);
    });
    bake(scene, "foe-spitter", 40, 40, function (ctx, w, h) {
      paintMech(ctx, w, h, { body: 0xa855f7, accent: 0x6b21a8, glow: 0xe9d5ff, gun: true });
    });
    bake(scene, "foe-glitch", 40, 40, function (ctx, w, h) {
      paintMech(ctx, w, h, { body: 0x22d3ee, accent: 0x0e7490, glow: 0xecfeff, gun: false });
      // 故障色塊
      px(ctx, 8, 8, 8, 4, 0xd946ef);
      px(ctx, 24, 28, 10, 3, 0xf43f5e);
    });
    bake(scene, "foe-bomber", 40, 40, function (ctx, w, h) {
      paintMech(ctx, w, h, { body: 0xfb7185, accent: 0x9f1239, glow: 0xfef08a, gun: false });
      outline(ctx, w / 2 - 6, h - 14, 12, 10, 0xfef08a, 0x0f172a);
    });
    bake(scene, "foe-jugger", 56, 44, function (ctx, w, h) {
      paintTank(ctx, w, h, { body: 0x92400e, accent: 0xb45309, glow: 0xfbbf24 });
    });
    bake(scene, "foe-elite", 52, 48, function (ctx, w, h) {
      paintMech(ctx, w, h, { body: 0xdc2626, accent: 0x7f1d1d, glow: 0xfbbf24, gun: true });
      outline(ctx, w / 2 - 14, 4, 28, 8, 0xfbbf24, 0x0f172a);
    });

    // 掉落膠囊
    bake(scene, "drop-thunder", 40, 44, function (ctx, w, h) {
      paintCapsule(ctx, w, h, 0xfacc15, "bolt");
    });
    bake(scene, "drop-fire", 40, 44, function (ctx, w, h) {
      paintCapsule(ctx, w, h, 0xef4444, "fire");
    });
    bake(scene, "drop-ice", 40, 44, function (ctx, w, h) {
      paintCapsule(ctx, w, h, 0x38bdf8, "ice");
    });
    bake(scene, "drop-missile", 40, 44, function (ctx, w, h) {
      paintCapsule(ctx, w, h, 0xf472b6, "missile");
    });
    bake(scene, "drop-armor", 40, 44, function (ctx, w, h) {
      paintCapsule(ctx, w, h, 0x94a3b8, "armor");
    });

    // 子彈（能量彈體）
    bake(scene, "bullet", 28, 12, function (ctx, w, h) { paintBullet(ctx, w, h, 0xfbbf24); });
    bake(scene, "bullet-pierce", 28, 10, function (ctx, w, h) { paintBullet(ctx, w, h, 0x67e8f9); });
    bake(scene, "bullet-blast", 18, 18, function (ctx, w, h) {
      outline(ctx, 2, 2, 14, 14, 0xf97316, 0xfde68a);
      px(ctx, 6, 6, 6, 6, 0xffffff);
    });
    bake(scene, "bullet-frost", 16, 16, function (ctx, w, h) {
      outline(ctx, 2, 2, 12, 12, 0x38bdf8, 0xe0f2fe);
      px(ctx, 6, 6, 4, 4, 0xffffff);
    });
    bake(scene, "bullet-rail", 32, 8, function (ctx, w, h) { paintBullet(ctx, w, h, 0xe879f9); });
    bake(scene, "bullet-missile", 28, 14, function (ctx, w, h) {
      outline(ctx, 2, 3, 20, 8, 0xf472b6, 0xffffff);
      px(ctx, 0, 5, 6, 4, 0xfb7185);
      px(ctx, 20, 4, 8, 6, 0xfde68a);
    });
    bake(scene, "bullet-fire", 18, 18, function (ctx, w, h) {
      outline(ctx, 2, 2, 14, 14, 0xef4444, 0xfbbf24);
      px(ctx, 6, 5, 6, 8, 0xfef08a);
    });
    bake(scene, "bullet-thunder", 28, 12, function (ctx, w, h) {
      paintBullet(ctx, w, h, 0xfacc15);
      px(ctx, 10, 1, 4, 10, 0xffffff);
    });

    bake(scene, "mod-crate", 28, 28, paintCrate);
    bake(scene, "hp-pack", 24, 24, function (ctx, w, h) {
      outline(ctx, 2, 2, 20, 20, 0xe11d48, 0xffffff);
      px(ctx, 10, 5, 4, 14, 0xffffff);
      px(ctx, 5, 10, 14, 4, 0xffffff);
    });
    bake(scene, "xp", 18, 18, function (ctx, w, h) {
      outline(ctx, 2, 2, 14, 14, 0x10b981, 0x6ee7b7);
      px(ctx, 6, 6, 6, 6, 0xffffff);
    });

    // 地牢場景元件
    bake(scene, "dungeon-floor", 64, 64, paintFloor);
    bake(scene, "dungeon-pillar", 36, 96, paintPillar);
    bake(scene, "dungeon-vent", 48, 24, function (ctx, w, h) {
      outline(ctx, 0, 0, w, h, 0x334155, 0x0f172a);
      for (var x = 6; x < w - 6; x += 8) px(ctx, x, 6, 4, h - 12, 0x0f172a);
      px(ctx, 4, 2, w - 8, 2, 0x22d3ee);
    });
    bake(scene, "ship-glow", 64, 64, function (ctx, w, h) {
      // 柔和方暈，避免「大圓球」感
      for (var i = 0; i < 5; i++) {
        var s = 16 + i * 8;
        var a = 0.18 - i * 0.03;
        ctx.fillStyle = "rgba(251,191,36," + a + ")";
        ctx.fillRect((w - s) / 2, (h - s) / 2, s, s);
      }
    });
  }

  /** 在 GameScene 畫地牢場景（支援大地圖） */
  function buildDungeonScene(scene, mapW, mapH) {
    var floor = scene.add.tileSprite(mapW / 2, mapH / 2, mapW, mapH, "dungeon-floor").setDepth(0).setAlpha(0.95);
    var grid = scene.add.graphics().setDepth(1).setAlpha(0.28);
    grid.lineStyle(1, 0x22d3ee, 0.22);
    for (var x = 48; x < mapW; x += 64) grid.lineBetween(x, 24, x, mapH - 24);
    for (var y = 48; y < mapH; y += 64) grid.lineBetween(24, y, mapW - 24, y);
    var wall = scene.add.graphics().setDepth(2);
    wall.lineStyle(4, 0xfbbf24, 0.5);
    wall.strokeRect(12, 12, mapW - 24, mapH - 24);
    wall.lineStyle(2, 0x22d3ee, 0.35);
    wall.strokeRect(20, 20, mapW - 40, mapH - 40);
    // 四角 + 邊中柱，強調地圖更大
    var pillars = [
      [48, 56], [mapW - 48, 56], [48, mapH - 56], [mapW - 48, mapH - 56],
      [mapW / 2, 48], [mapW / 2, mapH - 48],
      [48, mapH / 2], [mapW - 48, mapH / 2]
    ];
    pillars.forEach(function (p) {
      scene.add.image(p[0], p[1], "dungeon-pillar").setDepth(3).setScale(0.55).setAlpha(0.85);
    });
    scene.add.image(mapW * 0.28, 40, "dungeon-vent").setDepth(3).setAlpha(0.8);
    scene.add.image(mapW * 0.72, 40, "dungeon-vent").setDepth(3).setAlpha(0.8);
    scene.add.image(mapW * 0.5, mapH - 40, "dungeon-vent").setDepth(3).setAlpha(0.8);
    scene.add.image(90, mapH - 80, "mod-crate").setDepth(3).setScale(1.05).setAlpha(0.65);
    scene.add.image(mapW - 90, mapH - 80, "mod-crate").setDepth(3).setScale(1.05).setAlpha(0.65);
    scene.add.image(90, 90, "mod-crate").setDepth(3).setScale(1.0).setAlpha(0.55);
    scene.add.image(mapW - 90, 90, "mod-crate").setDepth(3).setScale(1.0).setAlpha(0.55);
    return floor;
  }

  root.RNFCyberRogueArt = {
    install: install,
    buildDungeonScene: buildDungeonScene
  };
})(typeof window !== "undefined" ? window : globalThis);
