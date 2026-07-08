/**
 * NexusPlay 平台橋接：雲端存檔 + 排行榜 + 本地備份
 * 供 /demos/*.html 嵌入使用
 */
(function () {
  var AUTH_TYPE = "nexusplay:auth";
  var LEAVE_TYPE = "nexusplay:leave";
  var LEAVE_CONFIRM_REQUEST = "nexusplay:leave-confirm-request";
  var LEAVE_CONFIRM_RESPONSE = "nexusplay:leave-confirm-response";
  var READY_TYPE = "nexusplay:ready";

  var SCROLLBAR_CSS =
    "*{scrollbar-width:thin;scrollbar-color:rgba(34,211,238,.55) rgba(255,255,255,.06)}" +
    "*::-webkit-scrollbar{width:8px;height:8px}" +
    "*::-webkit-scrollbar-track{margin:2px;background:rgba(255,255,255,.06);border-radius:999px}" +
    "*::-webkit-scrollbar-thumb{border:2px solid transparent;border-radius:999px;" +
    "background:linear-gradient(180deg,rgba(34,211,238,.85) 0%,rgba(139,92,246,.85) 100%);" +
    "background-clip:padding-box;box-shadow:0 0 8px rgba(34,211,238,.45),inset 0 0 2px rgba(255,255,255,.25)}" +
    "*::-webkit-scrollbar-thumb:hover{background:linear-gradient(180deg,rgba(34,211,238,1) 0%,rgba(167,139,250,1) 100%);" +
    "box-shadow:0 0 12px rgba(34,211,238,.6),0 0 8px rgba(139,92,246,.35)}" +
    "*::-webkit-scrollbar-corner{background:transparent}";

  if (!document.getElementById("nexusplay-scrollbar")) {
    var scrollbarStyle = document.createElement("style");
    scrollbarStyle.id = "nexusplay-scrollbar";
    scrollbarStyle.textContent = SCROLLBAR_CSS;
    (document.head || document.documentElement).appendChild(scrollbarStyle);
  }

  var SLUG_MAP = {
    "cyber-fortune-preview.html": "cyber-fortune",
    "core-defense-preview.html": "core-defense",
    "signal-breach-preview.html": "signal-breach",
    "neon-abyss-runner-preview.html": "neon-abyss-runner",
    "void-relay-preview.html": "void-relay",
    "pulse-protocol-preview.html": "pulse-protocol",
    "orbital-salvage-preview.html": "orbital-salvage",
  };

  var GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1, "\u2014": 0 };

  function detectSlug() {
    var file = location.pathname.split("/").pop() || "";
    return SLUG_MAP[file] || file.replace(/\.html$/, "") || "demo";
  }

  function detectGameId() {
    var params = new URLSearchParams(location.search);
    var gid = params.get("gid");
    if (gid && !isNaN(parseInt(gid, 10))) return parseInt(gid, 10);
    var embedMatch = location.pathname.match(/\/api\/games\/(\d+)\/embed/);
    if (embedMatch) return parseInt(embedMatch[1], 10);
    if (window.NexusPlay && window.NexusPlay.gameId) return window.NexusPlay.gameId;
    return null;
  }

  var slug = detectSlug();
  var gameId = detectGameId();
  var user = null;
  var ownerEditUrl = null;
  var authSettled = false;
  var authWaiters = [];
  var gameSessionActive = false;
  var pendingLeaveConfirm = null;
  var LEAVE_CONFIRM_MESSAGE =
    "\u904a\u6232\u9032\u884c\u4e2d\uff0c\u78ba\u5b9a\u8981\u96e2\u958b\u55ce\uff1f\u76ee\u524d\u9032\u5ea6\u53ef\u80fd\u5c1a\u672a\u4fdd\u5b58\u3002";

  function localKey(suffix) {
    return "nexusplay:" + slug + ":" + suffix;
  }

  function resolveAuth() {
    authSettled = true;
    var copy = user === undefined ? null : user;
    authWaiters.splice(0).forEach(function (fn) {
      fn(copy);
    });
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin) return;
    var d = e.data;
    if (!d || d.type !== AUTH_TYPE) return;
    user = d.user || null;
    if (d.editUrl) {
      ownerEditUrl = d.editUrl;
    } else if (user && user.editUrl) {
      ownerEditUrl = user.editUrl;
    } else {
      ownerEditUrl = null;
    }
    resolveAuth();
  });

  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin) return;
    var d = e.data;
    if (!d || d.type !== "nexusplay:resize") return;
    document.documentElement.style.setProperty("--np-embed-width", (d.width || 0) + "px");
    document.documentElement.style.setProperty("--np-embed-height", (d.height || 0) + "px");
    document.documentElement.classList.toggle("np-embed-expanded", !!d.expanded);
    document.documentElement.classList.toggle("np-embed-mode", (d.width || 0) > 0);
    document.documentElement.classList.toggle(
      "np-embed-compact",
      (d.height || 0) > 0 && (d.height || 0) < 700
    );
    window.dispatchEvent(new Event("resize"));
  });

  window.addEventListener("message", function (e) {
    if (e.origin !== location.origin) return;
    var d = e.data;
    if (!d || d.type !== LEAVE_CONFIRM_RESPONSE) return;
    if (!pendingLeaveConfirm || d.requestId !== pendingLeaveConfirm.id) return;
    var resolve = pendingLeaveConfirm.resolve;
    pendingLeaveConfirm = null;
    resolve(!!d.confirmed);
  });

  function requestParentLeaveConfirm(message) {
    return new Promise(function (resolve) {
      var requestId =
        "leave-" + Date.now() + "-" + Math.random().toString(36).slice(2);
      pendingLeaveConfirm = { id: requestId, resolve: resolve };
      try {
        window.parent.postMessage(
          {
            type: LEAVE_CONFIRM_REQUEST,
            requestId: requestId,
            message: message,
          },
          location.origin
        );
      } catch (_e) {
        pendingLeaveConfirm = null;
        resolve(showCustomConfirm(message));
        return;
      }
      setTimeout(function () {
        if (pendingLeaveConfirm && pendingLeaveConfirm.id === requestId) {
          pendingLeaveConfirm = null;
          resolve(showCustomConfirm(message));
        }
      }, 30000);
    });
  }

  function showCustomConfirm(message) {
    return new Promise(function (resolve) {
      injectConfirmStyles();
      var overlay = document.createElement("div");
      overlay.className = "np-leave-overlay";
      overlay.innerHTML =
        '<div class="np-leave-dialog" role="alertdialog" aria-modal="true">' +
        '<div class="np-leave-header">' +
        '<div class="np-leave-icon" aria-hidden="true">!</div>' +
        '<div><p class="np-leave-title">\u78ba\u5b9a\u8981\u96e2\u958b\u904a\u6232\uff1f</p>' +
        '<p class="np-leave-message">' +
        escapeHtml(message) +
        "</p></div></div>" +
        '<div class="np-leave-actions">' +
        '<button type="button" class="np-leave-btn np-leave-btn-stay">\u7e7c\u7e8c\u904a\u73a9</button>' +
        '<button type="button" class="np-leave-btn np-leave-btn-leave">\u96e2\u958b\u904a\u6232</button>' +
        "</div></div>";

      function cleanup(result) {
        overlay.remove();
        document.removeEventListener("keydown", onKeyDown);
        resolve(result);
      }

      function onKeyDown(event) {
        if (event.key === "Escape") cleanup(false);
      }

      overlay.querySelector(".np-leave-btn-stay").onclick = function () {
        cleanup(false);
      };
      overlay.querySelector(".np-leave-btn-leave").onclick = function () {
        cleanup(true);
      };
      overlay.onclick = function (event) {
        if (event.target === overlay) cleanup(false);
      };

      document.addEventListener("keydown", onKeyDown);
      document.body.appendChild(overlay);
    });
  }

  function injectConfirmStyles() {
    if (document.getElementById("np-leave-confirm-styles")) return;
    var style = document.createElement("style");
    style.id = "np-leave-confirm-styles";
    style.textContent =
      ".np-leave-overlay{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:1rem;background:rgba(0,0,0,.78);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}" +
      ".np-leave-dialog{width:min(100%,24rem);overflow:hidden;border-radius:1rem;border:1px solid rgba(255,255,255,.1);background:rgba(9,9,11,.96);box-shadow:0 24px 64px rgba(0,0,0,.55)}" +
      ".np-leave-header{display:flex;gap:.75rem;padding:1rem 1.25rem;border-bottom:1px solid rgba(255,255,255,.08);background:linear-gradient(90deg,rgba(6,182,212,.1),transparent,rgba(139,92,246,.1))}" +
      ".np-leave-icon{flex-shrink:0;width:2.5rem;height:2.5rem;display:flex;align-items:center;justify-content:center;border-radius:.75rem;background:linear-gradient(135deg,rgba(245,158,11,.2),rgba(244,63,94,.2));color:#fcd34d;font-weight:800;font-size:1.1rem}" +
      ".np-leave-title{margin:0;font-size:1rem;font-weight:700;color:#f4f4f5}" +
      ".np-leave-message{margin:.35rem 0 0;font-size:.875rem;line-height:1.5;color:#a1a1aa}" +
      ".np-leave-actions{display:flex;flex-direction:column-reverse;gap:.5rem;padding:1rem 1.25rem}" +
      "@media(min-width:480px){.np-leave-actions{flex-direction:row;justify-content:flex-end}}" +
      ".np-leave-btn{cursor:pointer;border-radius:.65rem;padding:.55rem 1rem;font-size:.875rem;font-weight:600;border:1px solid transparent}" +
      ".np-leave-btn-stay{border-color:rgba(255,255,255,.1);background:rgba(24,24,27,.85);color:#e4e4e7}" +
      ".np-leave-btn-stay:hover{background:rgba(39,39,42,.95)}" +
      ".np-leave-btn-leave{background:linear-gradient(90deg,#0891b2,#7c3aed);color:#fff}" +
      ".np-leave-btn-leave:hover{background:linear-gradient(90deg,#06b6d4,#8b5cf6)}";
    document.head.appendChild(style);
  }

  function confirmLeave(message) {
    message = message || LEAVE_CONFIRM_MESSAGE;
    if (window.parent !== window) {
      return requestParentLeaveConfirm(message);
    }
    return showCustomConfirm(message);
  }

  function executeLeave() {
    gameSessionActive = false;
    try {
      if (window.parent !== window) {
        window.parent.postMessage({ type: LEAVE_TYPE }, location.origin);
        return true;
      }
    } catch (_e) {}
    if (window.history.length > 1) {
      window.history.back();
      return true;
    }
    var localeMatch = location.pathname.match(/^\/([a-z]{2}(-[A-Z]{2})?)\//);
    window.location.href = localeMatch ? "/" + localeMatch[1] : "/";
    return true;
  }

  function waitForAuth(ms) {
    ms = ms || 6000;
    return new Promise(function (resolve, reject) {
      if (authSettled) return resolve(user === undefined ? null : user);
      var timer = setTimeout(function () {
        resolve(null);
      }, ms);
      authWaiters.push(function (u) {
        clearTimeout(timer);
        resolve(u);
      });
    });
  }

  function readLocal(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      return null;
    }
  }

  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_e) {}
  }

  function betterGrade(a, b) {
    return (GRADE_RANK[a] || 0) >= (GRADE_RANK[b] || 0) ? a : b;
  }

  function mergeProgress(local, cloud) {
    if (window.NexusPlay && window.NexusPlay.mergeSaves) {
      return window.NexusPlay.mergeSaves(local, cloud);
    }
    if (!local && !cloud) return null;
    if (!local) return cloud;
    if (!cloud) return local;
    return {
      bestScore: Math.max(local.bestScore || 0, cloud.bestScore || 0),
      bestCombo: Math.max(local.bestCombo || 0, cloud.bestCombo || 0),
      bestKills: Math.max(local.bestKills || 0, cloud.bestKills || 0),
      bestWave: Math.max(local.bestWave || 0, cloud.bestWave || 0),
      bestGrade: betterGrade(local.bestGrade || "\u2014", cloud.bestGrade || "\u2014"),
      totalGames: Math.max(local.totalGames || 0, cloud.totalGames || 0),
      lastPlayed: local.lastPlayed > cloud.lastPlayed ? local.lastPlayed : cloud.lastPlayed,
      difficulty: cloud.difficulty || local.difficulty,
    };
  }

  async function cloudLoadSave() {
    if (!gameId) return null;
    if (window.NexusPlay && window.NexusPlay.loadSave) {
      try {
        return await window.NexusPlay.loadSave();
      } catch (_e) {
        return null;
      }
    }
    var res = await fetch("/api/games/" + gameId + "/save", { credentials: "same-origin" });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    var data = await res.json();
    return data.save ?? null;
  }

  async function cloudSaveSave(payload) {
    if (!gameId) return null;
    if (window.NexusPlay && window.NexusPlay.saveSave) {
      try {
        return await window.NexusPlay.saveSave(payload);
      } catch (_e) {
        return null;
      }
    }
    var res = await fetch("/api/games/" + gameId + "/save", {
      method: "PUT",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ save: payload }),
    });
    if (!res.ok) return null;
    var data = await res.json();
    return data.save ?? null;
  }

  async function cloudFetchLeaderboard(limit) {
    if (!gameId) return [];
    var res = await fetch("/api/games/" + gameId + "/leaderboard?limit=" + (limit || 20), {
      credentials: "same-origin",
    });
    if (!res.ok) return [];
    var data = await res.json();
    return data.entries || [];
  }

  async function cloudSubmitScore(payload) {
    if (!gameId || !user) return null;
    var res = await fetch("/api/games/" + gameId + "/leaderboard", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) return { error: "login_required" };
    if (!res.ok) return null;
    return await res.json();
  }

  function getGuestName() {
    var stored = readLocal("guest-name");
    if (stored) return stored;
    var names = [
      "Shout~listenme",
      "Tonightゝ",
      "ObiWanKenobi",
      "Vengeance",
      "Stormborn",
      "Mana Lisa",
      "Tank Sinatra",
      "Healium",
      "Shadowfax",
      "BOOM SHAKA LAKA",
      "打小是祖宗",
      "鐵鳩船長",
      "你今日食左未",
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  function submitLocalScore(entry) {
    var list = readLocal("leaderboard") || [];
    var name = user ? user.displayName : getGuestName();
    if (!user) writeLocal("guest-name", name);

    var newEntry = {
      playerName: name,
      score: entry.score,
      grade: entry.grade || null,
      meta: entry.meta || {},
      updatedAt: new Date().toISOString(),
      isMe: true,
      local: true,
    };

    var existingIdx = list.findIndex(function (e) {
      return e.isMe && e.local;
    });
    if (existingIdx >= 0) {
      if (list[existingIdx].score >= newEntry.score) return list;
      list[existingIdx] = newEntry;
    } else {
      list.push(newEntry);
    }

    list.sort(function (a, b) {
      return b.score - a.score;
    });
    list = list.slice(0, 20);
    writeLocal("leaderboard", list);
    return list;
  }

  function mergeLeaderboards(cloud, local) {
    var merged = (cloud || []).slice();
    (local || []).forEach(function (le) {
      if (le.isMe) {
        var idx = merged.findIndex(function (e) {
          return e.isMe;
        });
        if (idx >= 0) {
          if (le.score > merged[idx].score) merged[idx] = Object.assign({}, le, { rank: merged[idx].rank });
        } else {
          merged.push(le);
        }
      }
    });
    merged.sort(function (a, b) {
      return b.score - a.score;
    });
    return merged.slice(0, 20).map(function (e, i) {
      return Object.assign({}, e, { rank: i + 1 });
    });
  }

  function injectStyles() {
    if (document.getElementById("np-bridge-styles")) return;
    var style = document.createElement("style");
    style.id = "np-bridge-styles";
    style.textContent =
      ".np-save-hint{font-size:.72rem;color:#888;margin-top:.35rem;letter-spacing:.06em}" +
      ".np-save-hint.synced{color:#00ffc8}.np-save-hint.local{color:#d4af37}" +
      ".np-lb-list{text-align:left;margin:1rem 0;max-height:42vh;overflow-y:auto}" +
      ".np-lb-row{display:grid;grid-template-columns:2rem 1fr auto auto;gap:.5rem;align-items:center;" +
      "padding:.55rem .65rem;border-bottom:1px solid rgba(255,255,255,.06);font-size:.82rem}" +
      ".np-lb-row.me{background:rgba(0,255,200,.06);border-radius:4px}" +
      ".np-lb-rank{font-weight:800;opacity:.7}.np-lb-rank.top{color:#ffd700;opacity:1}" +
      ".np-lb-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".np-lb-score{font-weight:700;font-variant-numeric:tabular-nums}" +
      ".np-lb-grade{font-size:.75rem;opacity:.85;min-width:1.2rem;text-align:center}" +
      ".np-lb-empty{color:#888;font-size:.85rem;padding:1.5rem 0;text-align:center}" +
      "html.np-embed-mode,html.np-embed-mode body{height:100%!important;max-height:100%!important;overflow:hidden!important}" +
      "html.np-embed-mode .screen.active{height:100%;max-height:100%;min-height:0;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}" +
      "html.np-embed-mode #game.active,html.np-embed-mode #gameScreen.active{justify-content:flex-start;padding:.25rem .35rem .4rem}" +
      "html.np-embed-mode .game-shell,html.np-embed-mode .game-wrap{max-height:none;width:100%;overflow:visible}" +
      "html.np-embed-mode html.in-game #gameScreen.active,html.np-embed-mode.in-game #gameScreen.active{overflow:hidden;display:flex;flex-direction:column}" +
      "html.np-embed-mode html.in-game .game-wrap,html.np-embed-mode.in-game .game-wrap{flex:1;min-height:0;overflow:hidden}" +
      "html.np-embed-compact .game-toolbar{margin-bottom:.25rem}" +
      "html.np-embed-compact .tool-btn{padding:.28rem .5rem;font-size:.66rem}" +
      "html.np-embed-compact .battle-top{margin-bottom:.3rem}" +
      "html.np-embed-compact .fighter{padding:.28rem .38rem}" +
      "html.np-embed-compact .hud{gap:.25rem;margin-bottom:.3rem}" +
      "html.np-embed-compact .hud-block{padding:.32rem .38rem}" +
      "html.np-embed-compact .hud-block b{font-size:.95rem}" +
      "html.np-embed-compact .progress-wrap,html.np-embed-compact .timer-wrap{margin-bottom:.28rem}" +
      "html.np-embed-compact .battle-arena{padding:.45rem .35rem .4rem}" +
      "html.np-embed-compact .lane-col{min-height:100px;padding:.28rem .18rem}" +
      "html.np-embed-compact .battle-card{width:42px;height:58px}" +
      "html.np-embed-compact .battle-card .card-val{font-size:1.25rem}" +
      "html.np-embed-compact .hand-row{min-height:100px;margin-bottom:.35rem}" +
      "html.np-embed-compact .hand-wrap .battle-card{width:64px;height:88px}" +
      "html.np-embed-compact .hand-wrap .battle-card .card-val{font-size:1.65rem}" +
      "html.np-embed-compact .battle-actions{margin-bottom:.3rem}" +
      "html.np-embed-compact .battle-actions button{padding:.42rem .7rem;font-size:.72rem}" +
      "html.np-embed-compact .top-bar{font-size:.66rem;padding:.32rem .4rem;gap:.22rem;margin-bottom:.28rem}" +
      "html.np-embed-compact .hud-bar{margin-bottom:.22rem;padding:.32rem .4rem;font-size:.62rem}" +
      "html.np-embed-compact .hud-stat b{font-size:.88rem}" +
      "html.np-embed-compact .game-toolbar{margin-bottom:.2rem}" +
      "html.np-embed-compact .lane-keys{margin-top:.2rem;font-size:.62rem}" +
      "html.np-embed-compact .canvas-wrap{min-height:0}" +
      "html.np-embed-compact .top-stat b{font-size:.92rem}" +
      "html.np-embed-compact .tower-bar,html.np-embed-compact .tactical-bar,html.np-embed-compact .action-bar{margin-bottom:.25rem}" +
      "html.np-embed-compact .threat-bar{margin-bottom:.22rem;font-size:.62rem}" +
      "html.np-embed-compact .hint{display:none}" +
      ".help-screen-header{display:flex;align-items:center;justify-content:space-between;gap:.75rem;margin-bottom:.75rem}" +
      ".help-screen-header h1{margin:0!important;flex:1;text-align:left!important;font-size:1.1rem!important}" +
      ".help-close-btn{cursor:pointer;border:1px solid rgba(255,120,90,.5);background:rgba(255,80,60,.12);color:#ffb380;padding:.45rem .9rem;font-size:.78rem;font-weight:700;flex-shrink:0;border-radius:6px}" +
      ".help-close-btn:hover{background:rgba(255,80,60,.22);box-shadow:0 0 12px rgba(255,107,43,.2)}";
    document.head.appendChild(style);
  }

  window.PlatformBridge = {
    slug: slug,
    gameId: gameId,
    getUser: function () {
      return user ? Object.assign({}, user) : null;
    },
    getOwnerEditUrl: function () {
      return ownerEditUrl;
    },
    waitForAuth: waitForAuth,
    betterGrade: betterGrade,
    init: async function () {
      injectStyles();
      if (window.parent !== window) {
        document.documentElement.classList.add("np-embed-mode");
      }
      gameId = detectGameId();
      this.gameId = gameId;
      await waitForAuth();
      try {
        window.parent.postMessage({ type: READY_TYPE, gameId: gameId }, location.origin);
      } catch (_e) {}
      return this.loadProgress();
    },
    loadProgress: async function () {
      var local = readLocal("progress");
      var cloud = null;
      try {
        cloud = await cloudLoadSave();
      } catch (_e) {}
      var merged = mergeProgress(local, cloud);
      if (merged) writeLocal("progress", merged);
      return merged;
    },
    saveProgress: async function (data) {
      var prev = readLocal("progress") || {};
      var next = Object.assign({}, prev, data, {
        lastPlayed: new Date().toISOString(),
        totalGames: (prev.totalGames || 0) + (data._incrementGames ? 1 : 0),
      });
      delete next._incrementGames;
      if (next.bestGrade) next.bestGrade = betterGrade(prev.bestGrade || "\u2014", next.bestGrade);
      writeLocal("progress", next);
      var synced = false;
      if (gameId && user) {
        try {
          var result = await cloudSaveSave(next);
          synced = !!result;
        } catch (_e) {}
      }
      return { progress: next, synced: synced };
    },
    submitScore: async function (entry) {
      submitLocalScore(entry);
      var cloudResult = null;
      if (gameId && user) {
        cloudResult = await cloudSubmitScore({
          score: entry.score,
          grade: entry.grade,
          meta: entry.meta || {},
        });
      }
      return cloudResult;
    },
    fetchLeaderboard: async function (limit) {
      var local = readLocal("leaderboard") || [];
      var cloud = [];
      try {
        cloud = await cloudFetchLeaderboard(limit || 20);
      } catch (_e) {}
      return mergeLeaderboards(cloud, local);
    },
    renderLeaderboard: function (container, entries) {
      injectStyles();
      if (!container) return;
      if (!entries || !entries.length) {
        container.innerHTML = '<div class="np-lb-empty">尚無排行紀錄，完成一場對局即可上榜！</div>';
        return;
      }
      container.innerHTML = entries
        .map(function (e) {
          var rankCls = e.rank <= 3 ? " top" : "";
          var meCls = e.isMe ? " me" : "";
          var grade = e.grade ? e.grade : "\u2014";
          return (
            '<div class="np-lb-row' +
            meCls +
            '">' +
            '<span class="np-lb-rank' +
            rankCls +
            '">#' +
            e.rank +
            "</span>" +
            '<span class="np-lb-name">' +
            escapeHtml(e.playerName) +
            "</span>" +
            '<span class="np-lb-grade">' +
            grade +
            "</span>" +
            '<span class="np-lb-score">' +
            Number(e.score).toLocaleString() +
            "</span>" +
            "</div>"
          );
        })
        .join("");
    },
    setGameSessionActive: function (active) {
      gameSessionActive = !!active;
    },
    isGameSessionActive: function () {
      return gameSessionActive;
    },
    getLeaveConfirmMessage: function () {
      return LEAVE_CONFIRM_MESSAGE;
    },
    confirmLeave: confirmLeave,
    leaveToPlatform: function (options) {
      options = options || {};
      if (options.confirm !== false && gameSessionActive && !options.force) {
        var msg = options.message || LEAVE_CONFIRM_MESSAGE;
        return confirmLeave(msg).then(function (confirmed) {
          if (!confirmed) return false;
          return executeLeave();
        });
      }
      return executeLeave();
    },
    setSaveHint: function (el, synced, userLoggedIn) {
      if (!el) return;
      if (synced) {
        el.textContent = "\u2601 進度已同步至雲端";
        el.className = "np-save-hint synced";
      } else if (userLoggedIn && !gameId) {
        el.textContent = "\u25A1 本地已保存（無法連線雲端）";
        el.className = "np-save-hint local";
      } else if (userLoggedIn) {
        el.textContent = "\u25A1 本地已保存 · 登入平台帳號可同步雲端";
        el.className = "np-save-hint local";
      } else {
        el.textContent = "\u25A1 進度已保存至本機 · 登入後可同步雲端";
        el.className = "np-save-hint local";
      }
    },
  };

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  window.addEventListener("beforeunload", function (e) {
    if (!gameSessionActive) return;
    e.preventDefault();
    e.returnValue = LEAVE_CONFIRM_MESSAGE;
    return LEAVE_CONFIRM_MESSAGE;
  });

  try {
    window.parent.postMessage({ type: READY_TYPE, gameId: gameId }, location.origin);
  } catch (_e) {}
})();
