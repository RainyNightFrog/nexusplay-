/**
 * Phaser 街機共用排行榜：每款遊戲以 RNF gameId（gid）對應獨立雲端榜。
 * 依賴：/sdk/rnf-game-sdk.js（RNF.fetchLeaderboard / submitScore / pushLocalScore）
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

  function formatLines(entries) {
    if (!entries || !entries.length) {
      return "尚無紀錄，完成一局即可上榜";
    }
    return entries
      .slice(0, 10)
      .map(function (e, i) {
        var grade = e.grade ? "  [" + e.grade + "]" : "";
        var src = e.local || e.source === "local" ? " ·本機" : "";
        return (
          i +
          1 +
          ". " +
          entryName(e) +
          "  —  " +
          Number(e.score || 0).toLocaleString() +
          grade +
          src
        );
      })
      .join("\n");
  }

  function submitRun(score, meta) {
    var m = Object.assign({}, meta || {});
    if (m.difficulty) m.difficulty = normalizeDiff(m.difficulty);
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
    if (typeof global.RNF === "undefined") {
      return Promise.resolve([]);
    }
    if (typeof global.RNF.fetchLeaderboardBundle === "function") {
      return global.RNF.fetchLeaderboardBundle(limit || 12, diff).then(function (b) {
        return (b && (b.merged || b.cloud || b.local)) || [];
      });
    }
    if (typeof global.RNF.fetchLeaderboard === "function") {
      return global.RNF.fetchLeaderboard(limit || 12, diff);
    }
    return Promise.resolve([]);
  }

  /**
   * @param {object} opts
   * @param {typeof Phaser} opts.Phaser
   * @param {function} opts.makeButton (scene,x,y,label,color,onClick,width?)
   * @param {number} [opts.W]
   * @param {number} [opts.H]
   * @param {number} [opts.accent]
   * @param {string} [opts.returnScene]
   * @param {function} [opts.getDefaultDiff] () => string
   */
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
      }

      create() {
        var self = this;
        this.cameras.main.setBackgroundColor("#060a14");
        this.cameras.main.fadeIn(180, 4, 6, 12);

        this.add
          .text(W / 2, 48, "本遊戲排行榜", {
            fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
            fontSize: "28px",
            fontStyle: "bold",
            color: "#67e8f9",
          })
          .setOrigin(0.5);

        this.add
          .text(W / 2, 82, "依難度獨立計分 · 與其他遊戲互不影響", {
            fontFamily: "Microsoft JhengHei, Segoe UI, sans-serif",
            fontSize: "13px",
            color: "#64748b",
          })
          .setOrigin(0.5);

        this._list = this.add
          .text(W / 2, H / 2 + 10, "載入中…", {
            fontFamily: "Segoe UI, Microsoft JhengHei, sans-serif",
            fontSize: "15px",
            color: "#94a3b8",
            align: "center",
            lineSpacing: 8,
          })
          .setOrigin(0.5);

        this._diffLabel = this.add
          .text(W / 2, 118, "", {
            fontFamily: "Segoe UI, sans-serif",
            fontSize: "14px",
            fontStyle: "bold",
            color: "#c4b5fd",
          })
          .setOrigin(0.5);

        DIFF_ORDER.forEach(function (key, i) {
          var x = W / 2 - 200 + i * 200;
          makeButton(
            self,
            x,
            160,
            DIFF_LABEL[key] || key,
            key === self._openDiff ? accent : 0x475569,
            function () {
              self._openDiff = key;
              self.reloadList();
            },
            170
          );
        });

        makeButton(
          this,
          W / 2,
          H - 48,
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
          180
        );

        this.reloadList();
      }

      reloadList() {
        var self = this;
        var diff = this._openDiff;
        this._diffLabel.setText("難度：" + (DIFF_LABEL[diff] || diff));
        this._list.setText("載入中…");
        fetchEntries(12, diff)
          .then(function (entries) {
            if (!self.sys || !self.sys.isActive()) return;
            self._list.setText(formatLines(entries));
          })
          .catch(function () {
            if (!self.sys || !self.sys.isActive()) return;
            self._list.setText("排行榜載入失敗（未登入仍可看本機榜）");
          });
      }
    };
  }

  global.RNFPhaserLeaderboard = {
    DIFF_ORDER: DIFF_ORDER,
    DIFF_LABEL: DIFF_LABEL,
    normalizeDiff: normalizeDiff,
    entryName: entryName,
    formatLines: formatLines,
    submitRun: submitRun,
    fetchEntries: fetchEntries,
    createLeaderboardScene: createLeaderboardScene,
  };
})(typeof window !== "undefined" ? window : this);
