/**
 * Phaser 街機共用排行榜：每款遊戲以 RNF gameId（gid）對應獨立雲端榜。
 * 依賴：/sdk/rnf-game-sdk.js（RNF.fetchLeaderboard / submitScore / pushLocalScore）
 * build: 20260731lb8 — 分頁每頁 10 名，名單與難度鈕拉開間距
 */
(function (global) {
  "use strict";

  var DIFF_ORDER = ["casual", "standard", "extreme"];
  var DIFF_LABEL = {
    casual: "輕鬆 Casual",
    standard: "電競 Standard",
    extreme: "狂暴 Extreme",
    easy: "輕鬆",
    normal: "標準",
    hard: "困難",
  };
  var PAGE_SIZE = 10;
  var BUILD_TAG = "lb8";

  function normalizeDiff(key) {
    var k = String(key || "standard").toLowerCase();
    if (k === "easy") return "casual";
    if (k === "normal") return "standard";
    if (k === "hard") return "extreme";
    if (DIFF_ORDER.indexOf(k) >= 0) return k;
    return "standard";
  }

  function entryName(e) {
    return (
      (e && (e.playerName || e.displayName || e.name)) ||
      "Player"
    );
  }

  function dedupeEntries(entries) {
    var seen = {};
    return (entries || []).filter(function (e) {
      var key =
        String(e.playerName || e.displayName || e.name || "")
          .trim()
          .toLowerCase() +
        "#" +
        String(e.score || 0);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function formatPageLines(entries, page) {
    if (!entries || !entries.length) {
      return "尚無紀錄，完成一局即可上榜";
    }
    var list = dedupeEntries(entries);
    var totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    var safePage = Math.min(Math.max(0, page | 0), totalPages - 1);
    var start = safePage * PAGE_SIZE;
    var slice = list.slice(start, start + PAGE_SIZE);
    if (!slice.length) return "尚無紀錄，完成一局即可上榜";

    return slice
      .map(function (e, i) {
        var rank = e.rank || start + i + 1;
        var grade = e.grade ? "  [" + e.grade + "]" : "";
        return (
          rank +
          ". " +
          entryName(e) +
          "  —  " +
          Number(e.score || 0).toLocaleString() +
          grade
        );
      })
      .join("\n");
  }

  /** @deprecated 保留給舊呼叫；等同 formatPageLines(entries, 0) */
  function formatLines(entries, page) {
    return formatPageLines(entries, page == null ? 0 : page);
  }

  function submitRun(score, meta) {
    var m = Object.assign({}, meta || {});
    if (m.difficulty) {
      var d = normalizeDiff(m.difficulty);
      m.difficulty =
        d === "casual" ? "easy" : d === "extreme" ? "hard" : "normal";
    }
    var s = Math.floor(Number(score) || 0);
    if (typeof global.RNF === "undefined") return null;
    if (typeof global.RNF.pushLocalScore === "function") {
      try {
        global.RNF.pushLocalScore(s, m);
      } catch (_) {}
    }
    if (typeof global.RNF.submitScore === "function") {
      return global.RNF.submitScore(s, m);
    }
    return null;
  }

  function fetchEntries(limit, difficulty) {
    var diff = normalizeDiff(difficulty);
    var legacy =
      diff === "casual" ? "easy" : diff === "extreme" ? "hard" : "normal";
    limit = limit || 30;

    function fromBundle(b) {
      return (b && (b.merged || b.cloud || b.local)) || [];
    }

    function directCloudFetch() {
      var gid = null;
      try {
        if (typeof global.RNF !== "undefined" && typeof global.RNF.getGameId === "function") {
          gid = global.RNF.getGameId();
        }
      } catch (_e) {}
      if (!gid) {
        try {
          gid = new URLSearchParams(location.search).get("gid");
        } catch (_e2) {}
      }
      if (!gid) return Promise.resolve([]);
      var path =
        "/api/games/" +
        gid +
        "/leaderboard?limit=" +
        limit +
        "&difficulty=" +
        encodeURIComponent(legacy);
      return fetch(path, { credentials: "same-origin" })
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          });
        })
        .then(function (data) {
          return Array.isArray(data.entries) ? data.entries : [];
        })
        .catch(function () {
          return [];
        });
    }

    var rnfPromise = Promise.resolve([]);
    if (typeof global.RNF !== "undefined") {
      if (typeof global.RNF.fetchLeaderboardBundle === "function") {
        rnfPromise = global.RNF.fetchLeaderboardBundle(limit, legacy)
          .then(fromBundle)
          .catch(function () {
            return [];
          });
      } else if (typeof global.RNF.fetchLeaderboard === "function") {
        rnfPromise = global.RNF.fetchLeaderboard(limit, legacy).catch(function () {
          return [];
        });
      }
    }

    return rnfPromise.then(function (entries) {
      if (entries && entries.length) return entries;
      return directCloudFetch();
    });
  }

  function createLeaderboardScene(opts) {
    opts = opts || {};
    var PhaserLib = opts.Phaser || global.Phaser;
    var makeButton = opts.makeButton;
    var W = opts.W || 960;
    var H = opts.H || 540;
    var accent = opts.accent || 0x22d3ee;
    var returnScene = opts.returnScene || "MainMenuScene";

    if (!PhaserLib || !makeButton) {
      throw new Error("RNFPhaserLeaderboard.createLeaderboardScene 需要 Phaser 與 makeButton");
    }

    // 依畫布高度配置，名單與難度鈕／底部分頁鈕留足空隙
    var footerY = H - 40;
    var pageLabelY = H - 78;
    var listBottom = H - 100;
    var diffBtnY = Math.min(118, Math.floor(H * 0.21));
    // 難度鈕高約 44，下方至少再留 56px，避免第 1 名貼邊被擋
    var listTop = diffBtnY + 56;
    var listHeight = Math.max(150, listBottom - listTop);
    var listCenterY = listTop + listHeight / 2;
    var listFontSize = H < 560 ? "13px" : H < 640 ? "14px" : "15px";
    var listLineSpacing = H < 560 ? 3 : 5;
    var panelW = Math.min(W - 64, 740);

    return class LeaderboardScene extends PhaserLib.Scene {
      constructor() {
        super("LeaderboardScene");
      }

      init(data) {
        this._openDiff = normalizeDiff(
          (data && data.difficulty) ||
            (opts.getDefaultDiff && opts.getDefaultDiff()) ||
            "standard"
        );
        this._page = 0;
        this._entries = [];
        this._diffBtns = [];
      }

      create() {
        var self = this;
        this.cameras.main.setBackgroundColor("#060a14");
        this.cameras.main.fadeIn(180, 4, 6, 12);

        this.add
          .text(W / 2, 28, "本遊戲排行榜", {
            fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
            fontSize: H < 560 ? "22px" : "26px",
            fontStyle: "bold",
            color: "#67e8f9",
          })
          .setOrigin(0.5)
          .setDepth(5);

        this.add
          .text(W / 2, 52, "依難度獨立計分 · 每頁 " + PAGE_SIZE + " 名", {
            fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
            fontSize: "12px",
            color: "#64748b",
          })
          .setOrigin(0.5)
          .setDepth(5);

        this._diffLabel = this.add
          .text(W / 2, 72, "", {
            fontFamily: "Segoe UI, sans-serif",
            fontSize: "12px",
            fontStyle: "bold",
            color: "#c4b5fd",
          })
          .setOrigin(0.5)
          .setDepth(5);

        this._diffBtns = [];
        DIFF_ORDER.forEach(function (key, i) {
          var x = W / 2 - 190 + i * 190;
          var btn = makeButton(
            self,
            x,
            diffBtnY,
            DIFF_LABEL[key] || key,
            key === self._openDiff ? accent : 0x475569,
            function () {
              self._openDiff = key;
              self._page = 0;
              self._refreshDiffBtnColors();
              self.reloadList();
            },
            160
          );
          if (btn && btn.bg) btn.bg.setDepth(20);
          if (btn && btn.txt) btn.txt.setDepth(21);
          self._diffBtns.push({ key: key, btn: btn });
        });

        // 名單底板（只覆蓋名單區，不延伸到分頁鈕）
        this.add
          .rectangle(W / 2, listCenterY, panelW, listHeight, 0x0a1220, 0.65)
          .setStrokeStyle(1, 0x22d3ee, 0.28)
          .setDepth(1);

        this._list = this.add
          .text(W / 2, listTop + 12, "載入中…", {
            fontFamily: "Segoe UI, Microsoft JhengHei, sans-serif",
            fontSize: listFontSize,
            color: "#cbd5e1",
            align: "left",
            lineSpacing: listLineSpacing,
            wordWrap: { width: panelW - 48 },
          })
          .setOrigin(0.5, 0)
          .setDepth(10);

        this._pageLabel = this.add
          .text(W / 2, pageLabelY, "", {
            fontFamily: "Segoe UI, Microsoft JhengHei, sans-serif",
            fontSize: "13px",
            fontStyle: "bold",
            color: "#67e8f9",
          })
          .setOrigin(0.5)
          .setDepth(25);

        var prev = makeButton(
          this,
          W / 2 - 170,
          footerY,
          "‹ 上一頁",
          0x334155,
          function () {
            if (self._page <= 0) return;
            self._page -= 1;
            self.paintPage();
          },
          120
        );
        var next = makeButton(
          this,
          W / 2 + 170,
          footerY,
          "下一頁 ›",
          0x334155,
          function () {
            var total = self._totalPages();
            if (self._page >= total - 1) return;
            self._page += 1;
            self.paintPage();
          },
          120
        );
        var back = makeButton(
          this,
          W / 2,
          footerY,
          "返回",
          0x64748b,
          function () {
            if (typeof global.RNF !== "undefined" && global.RNF.sfx) {
              try {
                global.RNF.sfx.click && global.RNF.sfx.click();
              } catch (_) {}
            }
            self.scene.start(returnScene);
          },
          110
        );
        [prev, next, back].forEach(function (b) {
          if (b && b.bg) b.bg.setDepth(30);
          if (b && b.txt) b.txt.setDepth(31);
        });

        this.reloadList();
      }

      _refreshDiffBtnColors() {
        var self = this;
        (this._diffBtns || []).forEach(function (item) {
          if (!item.btn || !item.btn.bg) return;
          var on = item.key === self._openDiff;
          item.btn.bg.setFillStyle(on ? accent : 0x475569, 0.2);
          item.btn.bg.setStrokeStyle(2, on ? accent : 0x475569, 0.9);
        });
      }

      _totalPages() {
        var list = dedupeEntries(this._entries || []);
        return Math.max(1, Math.ceil(list.length / PAGE_SIZE) || 1);
      }

      paintPage() {
        if (!this._list) return;
        var list = dedupeEntries(this._entries || []);
        var totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE) || 1);
        if (this._page >= totalPages) this._page = totalPages - 1;
        if (this._page < 0) this._page = 0;
        this._list.setText(formatPageLines(list, this._page));
        if (this._pageLabel) {
          if (!list.length) {
            this._pageLabel.setText("");
          } else {
            this._pageLabel.setText(
              "第 " + (this._page + 1) + " / " + totalPages + " 頁（共 " + list.length + " 名）"
            );
          }
        }
      }

      reloadList() {
        var self = this;
        var diff = this._openDiff;
        if (this._diffLabel) {
          this._diffLabel.setText("難度：" + (DIFF_LABEL[diff] || diff));
        }
        this._list.setText("載入中…");
        if (this._pageLabel) this._pageLabel.setText("");
        fetchEntries(30, diff)
          .then(function (entries) {
            if (!self.sys || !self.sys.isActive()) return;
            self._entries = entries || [];
            if (!self._entries.length) {
              self._list.setText("尚無紀錄，完成一局即可上榜");
              if (self._pageLabel) self._pageLabel.setText("");
              return;
            }
            self.paintPage();
          })
          .catch(function () {
            if (!self.sys || !self.sys.isActive()) return;
            self._entries = [];
            self._list.setText("排行榜載入失敗，請重新整理後再試");
            if (self._pageLabel) self._pageLabel.setText("");
          });
      }
    };
  }

  global.RNFPhaserLeaderboard = {
    DIFF_ORDER: DIFF_ORDER,
    DIFF_LABEL: DIFF_LABEL,
    PAGE_SIZE: PAGE_SIZE,
    BUILD_TAG: BUILD_TAG,
    normalizeDiff: normalizeDiff,
    entryName: entryName,
    formatLines: formatLines,
    formatPageLines: formatPageLines,
    submitRun: submitRun,
    fetchEntries: fetchEntries,
    createLeaderboardScene: createLeaderboardScene,
    /** @deprecated 請改用 createLeaderboardScene；保留避免舊遊戲誤判模組未載入 */
    show: function (scene, opts) {
      opts = opts || {};
      if (!scene || !scene.scene) return false;
      try {
        scene.scene.start("LeaderboardScene", {
          difficulty: opts.difficulty || "standard",
        });
        return true;
      } catch (_e) {
        return false;
      }
    },
  };
})(typeof window !== "undefined" ? window : this);
