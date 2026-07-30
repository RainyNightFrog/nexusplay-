/**
 * Phaser 街機共用：操作說明改中央彈窗，避免壓住選單按鈕／遊戲區
 */
(function (global) {
  "use strict";

  function showHelpOverlay(scene, text, opts) {
    opts = opts || {};
    var W = opts.W || scene.scale.width || 960;
    var H = opts.H || scene.scale.height || 540;
    var title = opts.title || "操作說明";
    var accent = opts.accent || 0x22d3ee;
    var bodyText = String(text || "").trim();

    if (scene._helpLayer) {
      scene._helpLayer.destroy(true);
      scene._helpLayer = null;
      return;
    }

    var layer = scene.add.container(0, 0).setDepth(300);
    scene._helpLayer = layer;

    var dim = scene.add
      .rectangle(W / 2, H / 2, W + 4, H + 4, 0x000000, 0.72)
      .setInteractive();
    var panel = scene.add
      .rectangle(W / 2, H / 2, Math.min(720, W - 80), Math.min(360, H - 100), 0x0b1220, 0.96)
      .setStrokeStyle(2, accent, 0.65);

    var head = scene.add
      .text(W / 2, H / 2 - 130, title, {
        fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#67e8f9",
      })
      .setOrigin(0.5);

    var body = scene.add
      .text(W / 2, H / 2 + 8, bodyText.slice(0, 1200), {
        fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
        fontSize: "15px",
        color: "#cbd5e1",
        align: "center",
        wordWrap: { width: Math.min(640, W - 140) },
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    var close = scene.add
      .text(W / 2, H / 2 + 140, "✕ 點擊任意處關閉", {
        fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
        fontSize: "14px",
        color: "#a78bfa",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    function dismiss() {
      if (!scene._helpLayer) return;
      scene._helpLayer.destroy(true);
      scene._helpLayer = null;
      try {
        if (global.RNF && RNF.sfx && RNF.sfx.click) RNF.sfx.click();
      } catch (_e) {}
    }

    close.on("pointerdown", dismiss);
    dim.on("pointerdown", dismiss);
    layer.add([dim, panel, head, body, close]);
    scene.tweens.add({
      targets: panel,
      scaleX: { from: 0.88, to: 1 },
      scaleY: { from: 0.88, to: 1 },
      duration: 260,
      ease: "Back.easeOut",
    });
  }

  /** 把常駐底部提示改到頂部，並可自動淡出 */
  function placeSafeHint(scene, text, opts) {
    opts = opts || {};
    var W = opts.W || 960;
    var y = opts.y != null ? opts.y : 18;
    var color = opts.color || "#94a3b8";
    var hint = scene.add
      .text(W / 2, y, text, {
        fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
        fontSize: opts.fontSize || "12px",
        color: color,
        align: "center",
        wordWrap: { width: opts.wrap || 820 },
      })
      .setOrigin(0.5, 0)
      .setDepth(opts.depth || 40)
      .setAlpha(opts.alpha != null ? opts.alpha : 0.9)
      .setScrollFactor(0);

    if (opts.autoHideMs > 0) {
      scene.time.delayedCall(opts.autoHideMs, function () {
        if (!hint || !hint.scene) return;
        scene.tweens.add({
          targets: hint,
          alpha: 0,
          duration: 400,
          onComplete: function () {
            try {
              hint.destroy();
            } catch (_e) {}
          },
        });
      });
    }
    return hint;
  }

  global.RNFPhaserHelp = {
    showHelpOverlay: showHelpOverlay,
    placeSafeHint: placeSafeHint,
  };
})(typeof window !== "undefined" ? window : this);
