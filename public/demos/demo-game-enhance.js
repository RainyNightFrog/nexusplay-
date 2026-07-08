/**
 * RainyNightFrog demo 遊戲共用增強：流暢度、畫布、排行榜
 */
(function (global) {
  "use strict";

  var MAX_DPR = 2;
  var MAX_DELTA = 32;
  var MAX_PARTICLES = 120;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  function resizeCanvas(canvas, logicalW, logicalH, maxDpr) {
    var dpr = Math.min(maxDpr || MAX_DPR, global.devicePixelRatio || 1);
    var w = logicalW;
    var h = logicalH;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    var ctx = canvas.getContext("2d");
    if (!ctx) {
      return { ctx: null, dpr: dpr, w: w, h: h };
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    return { ctx: ctx, dpr: dpr, w: w, h: h };
  }

  function createGameLoop(onFrame) {
    var raf = 0;
    var last = 0;
    var running = false;

    function frame(now) {
      if (!running) return;
      if (!last) last = now;
      var dt = clamp(now - last, 0, MAX_DELTA);
      last = now;
      onFrame(dt, now);
      raf = global.requestAnimationFrame(frame);
    }

    return {
      start: function () {
        if (running) return;
        running = true;
        last = 0;
        raf = global.requestAnimationFrame(frame);
      },
      stop: function () {
        running = false;
        if (raf) global.cancelAnimationFrame(raf);
        raf = 0;
        last = 0;
      },
      isRunning: function () {
        return running;
      },
    };
  }

  function capParticles(list, max) {
    var limit = max || MAX_PARTICLES;
    if (list.length > limit) list.splice(0, list.length - limit);
    return list;
  }

  function smoothStep(current, target, speed, dt) {
    var t = 1 - Math.pow(1 - clamp(speed * dt * 0.001, 0, 1), 3);
    return lerp(current, target, t);
  }

  function setupLeaderboard(options) {
    var btn = options.menuButton;
    var back = options.backButton;
    var listEl = options.listEl;
    var loadingEl = options.loadingEl;
    var showScreen = options.showScreen;
    var returnKey = options.returnScreen || "menu";
    var limit = options.limit || 15;
    var inGameBtn = options.inGameButton;

    async function open(fromScreen) {
      if (fromScreen) options._return = fromScreen;
      showScreen(options.leaderboardScreen || "leaderboard");
      if (loadingEl) {
        loadingEl.textContent = "載入排行榜中…";
        loadingEl.style.display = "";
      }
      if (listEl) listEl.innerHTML = "";
      try {
        var entries = await global.PlatformBridge.fetchLeaderboard(limit);
        if (loadingEl) loadingEl.style.display = "none";
        global.PlatformBridge.renderLeaderboard(listEl, entries);
      } catch (_e) {
        if (loadingEl) loadingEl.textContent = "無法載入排行榜";
      }
    }

    if (btn) btn.onclick = function () {
      open(options.menuScreen || "menu");
    };
    if (inGameBtn) inGameBtn.onclick = function () {
      if (options.onPause) options.onPause(true);
      open("game");
    };
    if (back) back.onclick = function () {
      showScreen(options._return || returnKey);
      if (options.onResume) options.onResume();
    };

    return { open: open };
  }

  function drawFpsBadge(ctx, fps, x, y) {
    if (!ctx || fps > 55) return;
    ctx.save();
    ctx.font = "10px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillText(Math.round(fps) + " FPS", x || 8, y || 14);
    ctx.restore();
  }

  function setupLeaveGuard(options) {
    options = options || {};
    var pb = global.PlatformBridge;
    if (!pb) return { sync: function () {}, clear: function () {} };

    var getActive = options.getActive || function () {
      return false;
    };
    var message = options.message;
    var buttons = [];
    if (options.button) buttons.push(options.button);
    if (options.buttons) buttons = buttons.concat(options.buttons);

    function sync() {
      pb.setGameSessionActive(!!getActive());
    }

    function clear() {
      pb.setGameSessionActive(false);
    }

    buttons.forEach(function (btn) {
      if (!btn) return;
      btn.addEventListener("click", function () {
        if (options.beforeLeave && options.beforeLeave() === false) return;
        pb.leaveToPlatform({ confirm: true, message: message }).then(function (left) {
          if (!left) return;
          if (options.stopGame) options.stopGame();
        });
      });
    });

    return { sync: sync, clear: clear };
  }

  global.DemoEnhance = {
    MAX_DPR: MAX_DPR,
    MAX_DELTA: MAX_DELTA,
    MAX_PARTICLES: MAX_PARTICLES,
    clamp: clamp,
    lerp: lerp,
    easeOutCubic: easeOutCubic,
    resizeCanvas: resizeCanvas,
    createGameLoop: createGameLoop,
    capParticles: capParticles,
    smoothStep: smoothStep,
    setupLeaderboard: setupLeaderboard,
    setupLeaveGuard: setupLeaveGuard,
    drawFpsBadge: drawFpsBadge,
  };
})(window);
