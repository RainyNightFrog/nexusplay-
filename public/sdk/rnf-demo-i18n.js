/**
 * Demo i18n runtime — reads ?locale=, applies RNF_DEMO_PACKS / RNF_DEMO_BRIDGE.
 */
(function (global) {
  "use strict";

  var SUPPORTED = [
    "zh-HK",
    "zh-CN",
    "en",
    "ja",
    "ko",
    "es",
    "fr",
    "de",
    "pt",
    "th",
    "vi",
  ];
  var ALIASES = {
    "zh-TW": "zh-HK",
    "zh-Hant": "zh-HK",
    "zh-Hans": "zh-CN",
    zh: "zh-HK",
    "en-US": "en",
    "en-GB": "en",
  };

  function normalizeLocale(raw) {
    if (!raw || typeof raw !== "string") return "zh-HK";
    var loc = raw.trim().replace(/_/g, "-");
    if (ALIASES[loc]) return ALIASES[loc];
    if (SUPPORTED.indexOf(loc) >= 0) return loc;
    var lower = loc.toLowerCase();
    for (var i = 0; i < SUPPORTED.length; i++) {
      if (SUPPORTED[i].toLowerCase() === lower) return SUPPORTED[i];
    }
    var base = loc.split("-")[0].toLowerCase();
    if (base === "zh") {
      if (/cn|hans|sg/i.test(loc)) return "zh-CN";
      return "zh-HK";
    }
    for (var j = 0; j < SUPPORTED.length; j++) {
      if (SUPPORTED[j].toLowerCase().split("-")[0] === base) return SUPPORTED[j];
    }
    return "zh-HK";
  }

  function detectLocale() {
    try {
      var locObj =
        (typeof location !== "undefined" && location) ||
        (global && global.location) ||
        null;
      var search = (locObj && locObj.search) || "";
      if (search) {
        var params = new URLSearchParams(search);
        var fromQuery = params.get("locale") || params.get("lang");
        if (fromQuery) return normalizeLocale(fromQuery);
      }
    } catch (_e) {}
    if (global.RNF_I18N && typeof global.RNF_I18N.getLocale === "function") {
      return normalizeLocale(global.RNF_I18N.getLocale());
    }
    return "zh-HK";
  }

  var locale = detectLocale();

  function getPack(slug) {
    var packs = global.RNF_DEMO_PACKS && global.RNF_DEMO_PACKS[slug];
    if (!packs) return null;
    if (locale === "zh-HK") return null;
    if (packs[locale]) return packs[locale];
    if (locale.indexOf("zh") === 0 && packs["zh-CN"]) return packs["zh-CN"];
    return packs.en || null;
  }

  function getBridge() {
    var packs = global.RNF_DEMO_BRIDGE;
    if (!packs) return null;
    if (locale === "zh-HK") return null;
    if (packs[locale]) return packs[locale];
    if (locale.indexOf("zh") === 0 && packs["zh-CN"]) return packs["zh-CN"];
    return packs.en || null;
  }

  function tPack(pack, key, fallback) {
    if (pack && pack[key] != null && pack[key] !== "") return pack[key];
    return fallback != null ? fallback : key;
  }

  function text(el, value) {
    if (!el || value == null) return;
    el.textContent = value;
  }

  function html(el, value) {
    if (!el || value == null) return;
    el.innerHTML = value;
  }

  function setLabelBeforeBold(statEl, label) {
    if (!statEl || !label) return;
    var b = statEl.querySelector("b");
    if (!b) {
      statEl.textContent = label;
      return;
    }
    while (statEl.firstChild && statEl.firstChild !== b) {
      statEl.removeChild(statEl.firstChild);
    }
    statEl.insertBefore(document.createTextNode(label), b);
  }

  function setTopStatLabel(statEl, label) {
    if (!statEl || !label) return;
    var span = statEl.querySelector(".label, .hud-label, span.label");
    if (span) {
      span.textContent = label;
      return;
    }
    var b = statEl.querySelector("b");
    if (b) {
      while (statEl.firstChild && statEl.firstChild !== b) {
        statEl.removeChild(statEl.firstChild);
      }
      var s = document.createElement("span");
      s.className = "label";
      s.textContent = label;
      statEl.insertBefore(s, b);
    }
  }

  function applyCoreDefense(pack) {
    if (!pack) return pack;
    try {
      document.documentElement.lang = pack.htmlLang || "en";
    } catch (_e) {}

    var sub = document.querySelector("#menu .sub");
    text(sub, pack.sub);

    var stats = document.querySelectorAll("#menu .menu-stat");
    if (stats[0]) setLabelBeforeBold(stats[0], pack.bestWave);
    if (stats[1]) setLabelBeforeBold(stats[1], pack.bestKills);
    if (stats[2]) setLabelBeforeBold(stats[2], pack.bestGrade);

    var pick = document.querySelector("#menu p[style*='letter-spacing']");
    text(pick, pack.pickDiff);

    var diffs = document.querySelectorAll("#menuDiff .diff-btn");
    var diffKeys = ["diffEasy", "diffNormal", "diffHard", "diffExtreme"];
    for (var i = 0; i < diffs.length; i++) {
      text(diffs[i], pack[diffKeys[i]] || diffs[i].textContent);
    }

    text(document.getElementById("btnStart"), pack.start);
    text(document.getElementById("btnLeaderboard"), pack.leaderboard);
    text(document.getElementById("btnHelp"), pack.help);
    text(document.getElementById("saveHint"), pack.loadingSave);

    var lbH1 = document.querySelector("#leaderboard h1");
    text(lbH1, pack.lbTitle);
    var lbSub = document.querySelector("#leaderboard .sub");
    text(lbSub, pack.lbSub);
    text(document.getElementById("lbLoading"), pack.loading);
    text(document.getElementById("btnLbBack"), pack.back);

    text(document.querySelector("#help h1"), pack.helpTitle);
    text(document.getElementById("btnHelpClose"), pack.helpClose);
    text(document.getElementById("btnHelpBack"), pack.helpBack);
    var helpBox = document.querySelector("#help .help-box");
    if (helpBox && pack.helpHtml) html(helpBox, pack.helpHtml);

    var topStats = document.querySelectorAll("#gameScreen .top-stat");
    if (topStats[0]) setTopStatLabel(topStats[0], pack.coreHp);
    if (topStats[1]) setTopStatLabel(topStats[1], pack.ore);
    if (topStats[2]) setTopStatLabel(topStats[2], pack.wave);
    if (topStats[3]) setTopStatLabel(topStats[3], pack.kills);
    if (topStats[4]) setTopStatLabel(topStats[4], pack.mult);

    var towers = document.querySelectorAll("#gameScreen .tower-bar .tool-btn");
    var towerKeys = [
      "towerGun",
      "towerLaser",
      "towerFrost",
      "towerSniper",
      "towerMortar",
      "towerTesla",
      "towerRocket",
    ];
    for (var ti = 0; ti < towers.length; ti++) {
      if (pack[towerKeys[ti]]) towers[ti].title = pack[towerKeys[ti]];
    }

    var threat = document.getElementById("threatBar");
    if (threat && pack.threatBar) {
      var tb = threat.querySelector("b");
      threat.innerHTML = "";
      threat.appendChild(document.createTextNode(pack.threatBar + " "));
      if (tb) threat.appendChild(tb);
      else {
        var b = document.createElement("b");
        b.id = "threatLevel";
        b.textContent = "★☆☆";
        threat.appendChild(b);
      }
      if (pack.threatMode) {
        threat.appendChild(document.createTextNode(" " + pack.threatMode));
      }
    }

    var skF = document.getElementById("skillFission");
    var skO = document.getElementById("skillOverdrive");
    var skA = document.getElementById("skillAirdrop");
    if (skF) {
      if (pack.skillFissionTitle) skF.title = pack.skillFissionTitle;
      skF.innerHTML =
        (pack.skillFission || skF.textContent) +
        ' <span class="cd" id="cdFission"></span>';
    }
    if (skO) {
      if (pack.skillOverdriveTitle) skO.title = pack.skillOverdriveTitle;
      skO.innerHTML =
        (pack.skillOverdrive || skO.textContent) +
        ' <span class="cd" id="cdOverdrive"></span>';
    }
    if (skA) {
      if (pack.skillAirdropTitle) skA.title = pack.skillAirdropTitle;
      skA.innerHTML =
        (pack.skillAirdrop || skA.textContent) +
        ' <span class="cd" id="cdAirdrop"></span>';
    }

    text(document.getElementById("btnStartBattle"), pack.startBattle);
    text(document.getElementById("btnNextWave"), pack.nextWave);
    text(document.getElementById("btnAutoWave"), pack.autoOff);
    text(document.getElementById("btnGameHelp"), pack.helpShort);
    text(document.getElementById("btnPause"), pack.pause);
    text(document.getElementById("btnQuit"), pack.menu);
    text(document.getElementById("btnLeaveGame"), pack.leaveShort);
    text(document.getElementById("phaseBanner"), pack.phaseBanner);
    text(document.getElementById("gameHint"), pack.gameHint);

    text(document.getElementById("overlayTitle"), pack.victory);
    var ovStats = document.querySelectorAll("#overlay .overlay-stats > div");
    if (ovStats[0]) setLabelBeforeBold(ovStats[0], pack.overlayWave || pack.wave);
    if (ovStats[1]) setLabelBeforeBold(ovStats[1], pack.overlayKills || pack.kills);
    if (ovStats[2]) setLabelBeforeBold(ovStats[2], pack.overlayCoreHp || pack.coreHp);
    text(document.getElementById("btnRetry"), pack.retry);
    text(document.getElementById("btnMenu"), pack.menu);

    return pack;
  }

  
  function setMenuStatLabel(el, label) {
    if (!el || !label) return;
    var b = el.querySelector("b");
    if (!b) {
      el.textContent = label;
      return;
    }
    while (el.firstChild && el.firstChild !== b) el.removeChild(el.firstChild);
    el.insertBefore(document.createTextNode(label), b);
  }

  function applyPulseProtocol(pack) {
    if (!pack) return pack;
    try {
      document.documentElement.lang = pack.htmlLang || "en";
    } catch (_e) {}
    var h1 = document.querySelector("#titleScreen h1");
    if (h1 && pack.titleZh) h1.textContent = pack.titleZh;
    var sub = document.querySelector("#titleScreen .sub");
    if (sub && pack.sub) sub.innerHTML = pack.sub;
    var stats = document.querySelectorAll("#titleScreen .menu-stat");
    if (stats[0]) setMenuStatLabel(stats[0], pack.bestGrade);
    if (stats[1]) setMenuStatLabel(stats[1], pack.bestScore);
    if (stats[2]) setMenuStatLabel(stats[2], pack.bestCombo);
    if (stats[3]) setMenuStatLabel(stats[3], pack.totalGames);
    text(document.getElementById("btnStart"), pack.start);
    text(document.getElementById("btnLeaderboard"), pack.leaderboard);
    text(document.getElementById("btnHelp"), pack.help);
    text(document.getElementById("btnLeave"), pack.leave);

    text(document.querySelector("#selectScreen .badge"), pack.songSelectBadge);
    text(document.querySelector("#selectScreen h1"), pack.songSelectTitle);
    text(document.querySelector("#selectScreen .sub"), pack.songSelectSub);
    var diffLabel = document.querySelector("#selectScreen p[style*='letter-spacing']");
    text(diffLabel, pack.difficulty);
    var diffs = document.querySelectorAll("#diffGroup button");
    if (diffs[0]) text(diffs[0], pack.diffCasual);
    if (diffs[1]) text(diffs[1], pack.diffStandard);
    if (diffs[2]) text(diffs[2], pack.diffMania);
    text(document.getElementById("btnPlay"), pack.play);
    text(document.getElementById("btnBackTitle"), pack.back);

    var hud = document.querySelectorAll("#gameScreen .hud-stat .label");
    if (hud[0]) text(hud[0], pack.score);
    if (hud[1]) text(hud[1], pack.combo);
    if (hud[2]) text(hud[2], pack.mult);
    if (hud[3]) text(hud[3], pack.accuracy);
    if (hud[4]) text(hud[4], pack.status);
    text(document.getElementById("btnPause"), pack.pause);
    text(document.getElementById("btnGameLeave"), pack.leaveShort);
    text(document.getElementById("btnGameLb"), pack.leaderboard);

    text(document.querySelector("#resultScreen .badge"), pack.resultBadge);
    var res = document.querySelectorAll("#resultScreen .result-item .label");
    if (res[0]) text(res[0], pack.finalScore);
    if (res[1]) text(res[1], pack.accuracy);
    if (res[2]) text(res[2], pack.maxCombo);
    if (res[3]) text(res[3], pack.judgeStats);
    text(document.getElementById("btnRetry"), pack.retry);
    text(document.getElementById("btnResultLb"), pack.leaderboard);
    text(document.getElementById("btnResultMenu"), pack.menu);

    text(document.querySelector("#lbScreen .badge"), pack.lbBadge);
    text(document.querySelector("#lbScreen h1"), pack.lbTitle);
    text(document.getElementById("lbLoading"), pack.loading);
    text(document.getElementById("btnLbBack"), pack.back);

    text(document.querySelector("#helpScreen h1"), pack.helpTitle);
    text(document.getElementById("btnHelpClose"), pack.helpClose);
    var helpBox = document.querySelector("#helpScreen .help-box");
    if (helpBox && pack.helpHtml) html(helpBox, pack.helpHtml);
    return pack;
  }

  function applyOrbitalSalvage(pack) {
    if (!pack) return pack;
    try {
      document.documentElement.lang = pack.htmlLang || "en";
    } catch (_e) {}

    var menuH1 = document.querySelector("#menu h1");
    if (menuH1 && pack.titleZh) menuH1.textContent = pack.titleZh;
    text(document.querySelector("#menu .sub"), pack.sub);

    var stats = document.querySelectorAll("#menu .menu-stat");
    if (stats[0]) setMenuStatLabel(stats[0], pack.bestWave);
    if (stats[1]) setMenuStatLabel(stats[1], pack.bestScore);
    if (stats[2]) setMenuStatLabel(stats[2], pack.bestGrade);

    var pick = document.querySelector("#menu p[style*='letter-spacing']");
    text(pick, pack.pickDiff);

    var diffs = document.querySelectorAll("#menuDiff .diff-btn");
    if (diffs[0]) text(diffs[0], pack.diffEasy);
    if (diffs[1]) text(diffs[1], pack.diffNormal);
    if (diffs[2]) text(diffs[2], pack.diffHard);

    text(document.getElementById("btnStart"), pack.start);
    text(document.getElementById("btnLeaderboard"), pack.leaderboard);
    text(document.getElementById("btnHelp"), pack.help);
    text(document.getElementById("saveHint"), pack.loadingSave);

    text(document.querySelector("#leaderboard h1"), pack.lbTitle);
    text(document.querySelector("#leaderboard .sub"), pack.lbSub);
    var lbTabs = document.querySelectorAll("#lbTabs .lb-tab");
    if (lbTabs[0]) text(lbTabs[0], pack.diffEasy);
    if (lbTabs[1]) text(lbTabs[1], pack.diffNormal);
    if (lbTabs[2]) text(lbTabs[2], pack.diffHard);
    text(document.getElementById("lbLoading"), pack.loading);
    text(document.getElementById("btnLbBack"), pack.back);

    text(document.querySelector("#help h1"), pack.helpTitle);
    text(document.getElementById("btnHelpClose"), pack.helpClose);
    text(document.getElementById("btnHelpBack"), pack.helpBack || pack.back);
    var helpBox = document.querySelector("#help .help-box");
    if (helpBox && pack.helpHtml) html(helpBox, pack.helpHtml);

    var hudLabels = document.querySelectorAll("#gameScreen .hud-item .label");
    if (hudLabels[0]) text(hudLabels[0], pack.coreHp);
    if (hudLabels[1]) text(hudLabels[1], pack.scrap);
    if (hudLabels[2]) text(hudLabels[2], pack.wave);
    if (hudLabels[3]) text(hudLabels[3], pack.enemies);

    var towerMap = {
      pulse: pack.towerPulse,
      salvage: pack.towerSalvage,
      frost: pack.towerFrost,
      rail: pack.towerRail,
      nova: pack.towerNova,
    };
    document.querySelectorAll("#towerDock .tower-btn[data-tower]").forEach(function (btn) {
      var key = btn.getAttribute("data-tower");
      var nameEl = btn.querySelector(".t-name");
      if (nameEl && towerMap[key]) text(nameEl, towerMap[key]);
    });

    text(document.getElementById("btnWaveAction"), pack.startBattle);
    text(document.getElementById("btnAutoWave"), pack.autoOn);
    text(document.getElementById("btnUpgradeMode"), pack.upgrade);
    text(document.getElementById("btnPause"), pack.pause);
    text(document.getElementById("btnQuit"), pack.menu);
    text(document.getElementById("phaseOverlay"), pack.phaseDeploy);

    text(document.getElementById("overlayTitle"), pack.victory);
    var ovStats = document.querySelectorAll("#overlay .overlay-stats > div");
    if (ovStats[0]) setLabelBeforeBold(ovStats[0], pack.overlayWave || pack.wave);
    if (ovStats[1]) setLabelBeforeBold(ovStats[1], pack.overlayScore);
    if (ovStats[2]) setLabelBeforeBold(ovStats[2], pack.overlayCoreHp || pack.coreHp);
    text(document.getElementById("btnRetry"), pack.retry);
    text(document.getElementById("btnOverlayLb"), pack.leaderboard);
    text(document.getElementById("btnMenu"), pack.menu);

    return pack;
  }

  function applySignalBreach(pack) {
    if (!pack) return pack;
    try {
      document.documentElement.lang = pack.htmlLang || "en";
    } catch (_e) {}
    if (pack.title) document.title = pack.title;

    var menuH1 = document.querySelector("#menuScreen h1");
    if (menuH1 && pack.titleZh) menuH1.textContent = pack.titleZh;
    text(document.querySelector("#menuScreen .sub"), pack.sub);
    var menuStats = document.querySelectorAll("#menuScreen .menu-stat");
    if (menuStats[0]) setMenuStatLabel(menuStats[0], pack.bestScore);
    if (menuStats[1]) setMenuStatLabel(menuStats[1], pack.bestGrade);
    if (menuStats[2]) setMenuStatLabel(menuStats[2], pack.clearedLevels);
    var pickDiff = document.querySelector("#menuScreen p[style*='letter-spacing']");
    text(pickDiff, pack.pickDiff);
    var diffs = document.querySelectorAll("#diffGroup .diff-btn");
    if (diffs[0]) text(diffs[0], pack.diffEasy);
    if (diffs[1]) text(diffs[1], pack.diffNormal);
    if (diffs[2]) text(diffs[2], pack.diffHard);
    text(document.getElementById("btnLevels"), pack.selectLevels);
    text(document.getElementById("btnHelp"), pack.help);
    text(document.getElementById("btnLeaderboard"), pack.leaderboard);
    text(document.getElementById("btnLeaveMenu"), pack.leave);

    text(document.querySelector("#levelScreen .badge"), pack.levelSelectBadge);
    text(document.querySelector("#levelScreen h1"), pack.levelSelectTitle);
    text(document.querySelector("#levelScreen .sub"), pack.levelSelectSub);
    text(document.getElementById("btnLevelBack"), pack.backMenu);

    text(document.querySelector("#helpScreen h1"), pack.helpTitle);
    text(document.getElementById("btnHelpClose"), pack.helpClose);
    text(document.getElementById("btnHelpBack"), pack.helpBack || pack.back);
    var helpBox = document.querySelector("#helpScreen .help-box");
    if (helpBox && pack.helpHtml) html(helpBox, pack.helpHtml);

    var hudLabels = document.querySelectorAll("#gameScreen .hud-label");
    if (hudLabels[0]) text(hudLabels[0], pack.moves);
    if (hudLabels[1]) text(hudLabels[1], pack.score);
    if (hudLabels[2]) text(hudLabels[2], pack.combo);
    if (hudLabels[3]) text(hudLabels[3], pack.integrity);
    if (hudLabels[4]) text(hudLabels[4], pack.undo);
    var timerSpans = document.querySelectorAll("#gameScreen .timer-label span");
    if (timerSpans[0]) text(timerSpans[0], pack.timerLabel);
    text(document.getElementById("btnPause"), pack.pause);
    text(document.getElementById("btnUndo"), pack.undoBtn);
    text(document.getElementById("btnGameHelp"), pack.helpBtn);
    text(document.getElementById("btnGameLb"), pack.lbBtn);
    text(document.getElementById("btnQuitGame"), pack.quitLevel);
    text(document.getElementById("btnLeaveGame"), pack.leaveShort);
    text(document.getElementById("levelTagPrefix"), pack.levelTagPrefix);
    text(document.getElementById("levelTagIce"), pack.levelTagIce);
    text(document.getElementById("gameHint"), pack.gameHint);

    text(document.querySelector("#pauseOverlay h2"), pack.pauseTitle);
    text(document.querySelector("#pauseOverlay p"), pack.pauseSub);
    text(document.getElementById("btnResume"), pack.resumePause);
    text(document.getElementById("btnPauseMenu"), pack.menu);

    text(document.getElementById("resultBadge"), pack.resultBadgeWin);
    text(document.getElementById("resultTitle"), pack.resultTitleWin);
    var resLbls = document.querySelectorAll("#resultScreen .result-stat .lbl");
    if (resLbls[0]) text(resLbls[0], pack.resScore);
    if (resLbls[1]) text(resLbls[1], pack.resMoves);
    if (resLbls[2]) text(resLbls[2], pack.resCombo);
    text(document.getElementById("btnNext"), pack.nextLevel);
    text(document.getElementById("btnRetry"), pack.retry);
    text(document.getElementById("btnResultMenu"), pack.levelSelect);
    text(document.getElementById("btnResultLeave"), pack.leave);

    text(document.querySelector("#leaderboardScreen .badge"), pack.lbBadge);
    text(document.querySelector("#leaderboardScreen h1"), pack.lbTitle);
    text(document.getElementById("lbLoading"), pack.loading);
    text(document.getElementById("btnLbBack"), pack.back);

    return pack;
  }

  function applyNeonAbyssRunner(pack) {
    if (!pack) return pack;
    try {
      document.documentElement.lang = pack.htmlLang || "en";
    } catch (_e) {}

    text(document.querySelector("#menu .badge"), pack.badge);
    text(document.querySelector("#menu h1"), pack.titleZh);
    text(document.querySelector("#menu .sub"), pack.sub);
    var stats = document.querySelectorAll("#menu .menu-stat");
    if (stats[0]) setMenuStatLabel(stats[0], pack.bestScore);
    if (stats[1]) setMenuStatLabel(stats[1], pack.bestWave);
    if (stats[2]) setMenuStatLabel(stats[2], pack.bestCombo);
    if (stats[3]) setMenuStatLabel(stats[3], pack.bestGrade);
    var pick = document.querySelector("#menu p[style*='letter-spacing']");
    text(pick, pack.pickDiff);
    var diffs = document.querySelectorAll("#menuDiff .diff-btn");
    if (diffs[0]) text(diffs[0], pack.diffEasy);
    if (diffs[1]) text(diffs[1], pack.diffNormal);
    if (diffs[2]) text(diffs[2], pack.diffHard);
    text(document.getElementById("btnStart"), pack.start);
    text(document.getElementById("btnSettings"), pack.settings);
    text(document.getElementById("btnHelp"), pack.help);
    text(document.getElementById("btnLeaderboard"), pack.leaderboard);
    text(document.getElementById("btnLeaveMenu"), pack.leave);
    text(document.getElementById("saveHint"), pack.loadingSave);

    text(document.querySelector("#help h1"), pack.helpTitle);
    text(document.getElementById("btnHelpClose"), pack.helpClose);
    var helpBox = document.querySelector("#help .help-box");
    if (helpBox && pack.helpHtml) html(helpBox, pack.helpHtml);
    text(document.getElementById("btnHelpBack"), pack.helpBack);

    text(document.querySelector("#settings h1"), pack.settingsTitle);
    text(document.getElementById("btnSettingsClose"), pack.settingsClose);
    var settingsGroups = document.querySelectorAll("#settings .settings-group");
    if (settingsGroups[0]) {
      var label0 = settingsGroups[0].querySelector(".settings-label span");
      text(label0, pack.moveRangeTitle);
      var moveBtns = settingsGroups[0].querySelectorAll(".setting-btn");
      if (moveBtns[0]) text(moveBtns[0], pack.moveRangeSmall);
      if (moveBtns[1]) text(moveBtns[1], pack.moveRangeMedium);
      if (moveBtns[2]) text(moveBtns[2], pack.moveRangeLarge);
      text(settingsGroups[0].querySelector(".settings-hint"), pack.moveRangeHint);
    }
    if (settingsGroups[1]) {
      var label1 = settingsGroups[1].querySelector(".settings-label span");
      text(label1, pack.laneSmoothTitle);
      var smoothBtns = settingsGroups[1].querySelectorAll(".setting-btn");
      if (smoothBtns[0]) text(smoothBtns[0], pack.laneSmoothSlow);
      if (smoothBtns[1]) text(smoothBtns[1], pack.laneSmoothMedium);
      if (smoothBtns[2]) text(smoothBtns[2], pack.laneSmoothFast);
      text(settingsGroups[1].querySelector(".settings-hint"), pack.laneSmoothHint);
    }
    text(document.getElementById("btnSettingsSave"), pack.settingsSave);
    text(document.getElementById("btnSettingsBack"), pack.settingsBack);

    text(document.querySelector("#leaderboardScreen h1"), pack.lbTitle);
    text(document.querySelector("#leaderboardScreen .sub"), pack.lbSub);
    text(document.getElementById("lbLoading"), pack.loading);
    text(document.getElementById("btnLbBack"), pack.back);

    var topStats = document.querySelectorAll("#gameScreen .top-stat");
    if (topStats[0]) setTopStatLabel(topStats[0], pack.score);
    if (topStats[1]) setTopStatLabel(topStats[1], pack.wave);
    if (topStats[2]) setTopStatLabel(topStats[2], pack.combo);
    if (topStats[3]) setTopStatLabel(topStats[3], pack.distance);
    if (topStats[4]) setTopStatLabel(topStats[4], pack.hp);
    if (topStats[5]) setTopStatLabel(topStats[5], pack.shield);
    text(document.getElementById("btnPause"), pack.pause);
    text(document.getElementById("btnGameSettings"), pack.gameSettings);
    text(document.getElementById("btnGameLb"), pack.gameLb);
    text(document.getElementById("btnGameHelp"), pack.gameHelp);
    text(document.getElementById("btnQuit"), pack.gameMenu);
    text(document.getElementById("btnLeaveGame"), pack.leaveShort);
    text(document.querySelector("#gameScreen .hint"), pack.gameHint);
    text(document.getElementById("dashCd"), pack.dashReady);

    text(document.querySelector("#gameover .badge"), pack.resultBadge);
    text(document.querySelector("#gameover h1"), pack.resultTitle);
    var goStats = document.querySelectorAll("#gameover .go-stats > div");
    if (goStats[0]) setLabelBeforeBold(goStats[0], pack.finalScore);
    if (goStats[1]) setLabelBeforeBold(goStats[1], pack.survivedWave);
    if (goStats[2]) setLabelBeforeBold(goStats[2], pack.maxCombo);
    if (goStats[3]) setLabelBeforeBold(goStats[3], pack.travelDist);
    text(document.querySelector("#gameover .go-lb-title"), pack.goLbTitle);
    text(document.getElementById("goLbLoading"), pack.lbLoadingGo);
    text(document.getElementById("btnRetry"), pack.retry);
    text(document.getElementById("btnGoMenu"), pack.menu);
    text(document.getElementById("btnLeaveGo"), pack.leave);

    return pack;
  }

  function applyCyberFortune(pack) {
    if (!pack) return pack;
    try {
      document.documentElement.lang = pack.htmlLang || "en";
    } catch (_e) {}

    text(document.querySelector("#menu .sub"), pack.sub);
    var stats = document.querySelectorAll("#menu .menu-stat");
    if (stats[0]) setLabelBeforeBold(stats[0], pack.bestScore);
    if (stats[1]) setLabelBeforeBold(stats[1], pack.bestCombo);
    if (stats[2]) setLabelBeforeBold(stats[2], pack.bestGrade);

    var pick = document.querySelector("#menu p[style*='letter-spacing']");
    text(pick, pack.pickDiff);
    var diffs = document.querySelectorAll("#menuDiff .diff-btn");
    var diffKeys = ["diffEasy", "diffNormal", "diffHard", "diffExtreme"];
    for (var i = 0; i < diffs.length; i++) {
      text(diffs[i], pack[diffKeys[i]] || diffs[i].textContent);
    }

    text(document.getElementById("btnStart"), pack.start);
    text(document.getElementById("btnLeaderboard"), pack.leaderboard);
    text(document.getElementById("btnHelp"), pack.help);
    text(document.getElementById("btnLeaveMenu"), pack.leave);
    text(document.getElementById("saveHint"), pack.loadingSave);

    text(document.querySelector("#leaderboard h1"), pack.lbTitle);
    text(document.querySelector("#leaderboard .sub"), pack.lbSub);
    text(document.getElementById("lbLoading"), pack.loading);
    text(document.getElementById("btnLbBack"), pack.back);

    text(document.querySelector("#help h1"), pack.helpTitle);
    text(document.getElementById("btnHelpClose"), pack.helpClose);
    text(document.getElementById("btnHelpBack"), pack.helpBack || pack.back);
    var helpBox = document.querySelector("#help .help-box");
    if (helpBox && pack.helpHtml) html(helpBox, pack.helpHtml);

    text(document.querySelector("#pauseOverlay h2"), pack.pauseTitle);
    text(document.querySelector("#pauseOverlay p"), pack.pauseSub);
    text(document.getElementById("btnResume"), pack.resume);
    text(document.getElementById("btnPauseMenu"), pack.menu);
    text(document.getElementById("btnPauseLeave"), pack.leaveShort || pack.leave);

    text(document.getElementById("btnPause"), pack.pause);
    text(document.getElementById("btnGameHelp"), pack.helpShort);
    text(document.getElementById("btnQuitGame"), pack.menu);
    text(document.getElementById("btnLeave"), pack.leaveShort || pack.leave);

    var tags = document.querySelectorAll("#game .fighter-tag");
    if (tags[0]) text(tags[0], pack.player);
    if (tags[1]) text(tags[1], pack.aiCore);

    var hudBlocks = document.querySelectorAll("#game .hud-block");
    for (var h = 0; h < hudBlocks.length; h++) {
      var lab = hudBlocks[h].querySelector(".hud-label");
      if (!lab) continue;
      if (h === 0) text(lab, pack.round);
      if (h === 1) text(lab, pack.score);
      if (h === 2) text(lab, pack.combo);
      if (h === 3) text(lab, pack.laneWins);
    }

    var progLabel = document.querySelector("#game .progress-label span");
    if (progLabel) text(progLabel, pack.progress);

    var arena = document.querySelector("#game .arena-title");
    if (arena && pack.arenaTitle) {
      var rt = document.getElementById("roundTag");
      arena.innerHTML = "";
      arena.appendChild(document.createTextNode(pack.arenaTitle + " · "));
      if (rt) arena.appendChild(rt);
      else {
        var span = document.createElement("span");
        span.id = "roundTag";
        span.textContent = (pack.roundTags && pack.roundTags[0]) || "";
        arena.appendChild(span);
      }
    }

    text(document.getElementById("deployHint"), pack.deployHint);
    text(document.getElementById("btnFullMeal"), pack.fullMeal);
    text(document.getElementById("btnClearDeploy"), pack.clearDeploy);
    text(document.getElementById("btnCommit"), pack.commit);

    var prob = document.querySelector("#game .prob-panel > span");
    if (prob && !prob.id) text(prob, pack.winPredict);

    text(document.getElementById("resultTitle"), pack.resultWin);
    var resBreak = document.querySelectorAll("#result .result-breakdown > div");
    if (resBreak[0]) setLabelBeforeBold(resBreak[0], pack.resLaneWins || pack.laneWins);
    if (resBreak[1]) setLabelBeforeBold(resBreak[1], pack.resBestCombo || pack.bestCombo);
    if (resBreak[2]) setLabelBeforeBold(resBreak[2], pack.resHpLeft || "HP");
    text(document.getElementById("btnRetry"), pack.retry);
    text(document.getElementById("btnMenu"), pack.menu);
    text(document.getElementById("btnResultLeave"), pack.leaveShort || pack.leave);

    if (pack.roundBanner) {
      var title = document.getElementById("roundBannerTitle");
      if (title) text(title, pack.roundBanner.replace("{n}", "1"));
    }
    if (pack.roundTags && pack.roundTags[0]) {
      text(document.getElementById("roundBannerSub"), pack.roundTags[0]);
      text(document.getElementById("roundTag"), pack.roundTags[0]);
    }

    return pack;
  }

  function applyVoidRelay(pack) {
    if (!pack) return pack;
    try {
      document.documentElement.lang = pack.htmlLang || "en";
      if (pack.title) document.title = pack.title;
    } catch (_e) {}

    text(document.querySelector("#menuScreen .badge"), pack.badge);
    text(document.querySelector("#menuScreen h1"), pack.title);
    var menuSub = document.querySelector("#menuScreen .sub");
    if (menuSub && pack.sub) html(menuSub, pack.sub);

    var menuStats = document.querySelectorAll("#menuScreen .menu-stat span");
    if (menuStats[0]) text(menuStats[0], pack.bestFloor);
    if (menuStats[1]) text(menuStats[1], pack.bestScore);
    if (menuStats[2]) text(menuStats[2], pack.bestGrade);

    var diffLabel = document.querySelector("#menuScreen p[style*='letter-spacing']");
    text(diffLabel, pack.difficulty);
    var diffs = document.querySelectorAll("#menuScreen .diff-btn");
    if (diffs[0]) text(diffs[0], pack.diffEasy);
    if (diffs[1]) text(diffs[1], pack.diffNormal);
    if (diffs[2]) text(diffs[2], pack.diffHard);

    text(document.getElementById("btnStart"), pack.start);
    text(document.getElementById("btnHelp"), pack.help);
    text(document.getElementById("btnLeaderboard"), pack.leaderboard);
    text(document.getElementById("btnLeaveMenu"), pack.leave);

    text(document.querySelector("#helpScreen h1"), pack.helpTitle);
    text(document.getElementById("btnHelpClose"), pack.helpClose);
    text(document.getElementById("btnHelpBack"), pack.back);
    var helpBox = document.querySelector("#helpScreen .help-box");
    if (helpBox && pack.helpHtml) html(helpBox, pack.helpHtml);

    text(document.querySelector("#leaderboardScreen h1"), pack.lbTitle);
    text(document.querySelector("#leaderboardScreen .sub"), pack.lbSub);
    text(document.getElementById("lbLoading"), pack.loading);
    text(document.getElementById("btnLbBack"), pack.back);

    var hud = document.querySelectorAll("#gameScreen .top-stat .label");
    if (hud[0]) text(hud[0], pack.hudFloor);
    if (hud[1]) text(hud[1], pack.hudHp);
    if (hud[2]) text(hud[2], pack.hudEnergy);
    if (hud[3]) text(hud[3], pack.hudBlock);
    if (hud[4]) text(hud[4], pack.hudScore);
    if (hud[5]) text(hud[5], pack.hudTurn);

    text(document.getElementById("btnPause"), pack.pause);
    text(document.getElementById("btnGameLb"), pack.gameLb);
    text(document.getElementById("btnGameHelp"), pack.gameHelp);
    text(document.getElementById("btnQuit"), pack.quit);
    text(document.getElementById("btnLeaveGame"), pack.leaveGame);

    var relayMeter = document.querySelector("#relayMeter > span");
    text(relayMeter, pack.relay);
    text(document.getElementById("relayHint"), pack.relayHint);
    text(document.getElementById("relaySurge"), pack.relaySurgeBanner);

    var playerRole = document.querySelector("#playerFighter .fighter-role");
    text(playerRole, pack.playerRole);
    text(document.getElementById("turnBanner"), pack.turnPlayer);
    text(document.querySelector("#playerFighter .fighter-name"), pack.playerName);
    var pStats = document.querySelectorAll("#playerFighter .fighter-stat .label");
    if (pStats[0]) text(pStats[0], pack.strength);
    if (pStats[1]) text(pStats[1], pack.block);
    if (pStats[2]) text(pStats[2], pack.hand);
    text(document.getElementById("playerTrait"), pack.playerTrait);

    text(document.querySelector("#enemyFighter .fighter-role"), pack.enemyRole);
    var eStats = document.querySelectorAll("#enemyFighter .fighter-stat .label");
    if (eStats[0]) text(eStats[0], pack.level);
    if (eStats[1]) text(eStats[1], pack.strength);
    if (eStats[2]) text(eStats[2], pack.block);

    text(document.getElementById("btnEndTurn"), pack.endTurn);

    var draft = document.querySelector("#draftOverlay");
    if (draft) {
      text(draft.querySelector("h3"), pack.draftTitle);
      text(draft.querySelector("p"), pack.draftSub);
    }
    var rest = document.querySelector("#restOverlay");
    if (rest) {
      text(rest.querySelector("h3"), pack.restTitle);
      text(rest.querySelector("p"), pack.restSub);
    }
    text(document.getElementById("restHeal"), pack.restHeal);
    text(document.getElementById("restUpgrade"), pack.restUpgrade);
    text(document.getElementById("restMaxHp"), pack.restMaxHp);

    var resStats = document.querySelectorAll("#resultOverlay .result-stats span");
    if (resStats[0]) text(resStats[0], pack.resFloor);
    if (resStats[1]) text(resStats[1], pack.resScore);
    if (resStats[2]) text(resStats[2], pack.resDeck);
    text(document.getElementById("btnRetry"), pack.retry);
    text(document.getElementById("btnMenu"), pack.menu);

    var intent = document.getElementById("enemyIntent");
    if (intent) {
      intent.className = "intent-box";
      intent.innerHTML =
        '<span class="intent-icon">⚔</span>' + (pack.intentReady || "…");
    }
    text(document.getElementById("enemyNextIntent"), (pack.nextTurn || "") + "—");

    return pack;
  }

  
  function applyVoidGacha(pack) {
    if (!pack) return pack;
    try {
      document.documentElement.lang = pack.htmlLang || "en";
      if (pack.title) document.title = pack.title;
    } catch (_e) {}
    text(document.querySelector(".panel h1"), pack.title);
    text(document.querySelector(".panel .tag"), pack.tag);
    text(document.querySelector(".panel .sub"), pack.sub);
    var stats = document.querySelectorAll(".panel .stat");
    // Structure: <div class="stat"><b>N</b>label</div>
    function setStatLabel(el, label) {
      if (!el || !label) return;
      var b = el.querySelector("b");
      if (!b) {
        el.textContent = label;
        return;
      }
      while (el.lastChild && el.lastChild !== b) el.removeChild(el.lastChild);
      el.appendChild(document.createTextNode(label));
    }
    if (stats[0]) setStatLabel(stats[0], pack.plays);
    if (stats[1]) setStatLabel(stats[1], pack.likes);
    if (stats[2]) setStatLabel(stats[2], pack.rating);
    return pack;
  }

  function apply(slug) {
    var pack = getPack(slug);
    if (!pack) return null;
    if (slug === "core-defense") return applyCoreDefense(pack);
    if (slug === "cyber-fortune") return applyCyberFortune(pack);
    if (slug === "pulse-protocol") return applyPulseProtocol(pack);
    if (slug === "orbital-salvage") return applyOrbitalSalvage(pack);
    if (slug === "neon-abyss-runner") return applyNeonAbyssRunner(pack);
    if (slug === "signal-breach") return applySignalBreach(pack);
    if (slug === "void-relay") return applyVoidRelay(pack);
    if (slug === "void-gacha") return applyVoidGacha(pack);
    return pack;
  }

  function makeT(slug) {
    var pack = getPack(slug);
    return function (key, fallback) {
      return tPack(pack, key, fallback);
    };
  }

  try {
    if (locale !== "zh-HK") {
      document.documentElement.lang =
        locale === "zh-CN" ? "zh-Hans" : locale;
    }
  } catch (_e2) {}

  global.RNF_DEMO_I18N = {
    locale: locale,
    getLocale: function () {
      return locale;
    },
    getPack: getPack,
    getBridge: getBridge,
    apply: apply,
    t: makeT,
    tPack: tPack,
  };
})(typeof window !== "undefined" ? window : this);
