import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public/games");
const SDK = "/sdk/rnf-game-sdk.js?v=20260723c";
const SDK_SRC_RE = /\/sdk\/rnf-game-sdk\.js(\?v=[A-Za-z0-9]+)?/g;

const PATCHES = {
  "neon-snake-extreme": {
    highlights: ["四段難度", "子彈時間", "排行榜", "靈敏度／速度"],
    help: {
      about: "經典貪食蛇的賽博電競版。吃食物讓蛇身變長、分數提高；連續吃可累積連擊倍率。靠近危險時會觸發子彈時間慢動作。",
      features: [
        "四段難度選擇，結算分數依難度加成並上傳排行榜",
        "瀕死子彈時間慢動作，爭取反應時間",
        "困難以上出現障礙磚、金色 ★ 食物與 Combo 食物",
        "設定可調操作靈敏度與遊戲速度",
      ],
      controls: [
        "↑↓←→ 或 WASD：控制蛇的移動方向",
        "Shift：氮氣加速（消耗氮氣條，鬆開後緩慢回復）",
        "困難以上：地圖會出現靜態障礙磚，撞到即失敗",
      ],
      tips: [
        "金色 ★ 食物得分為一般食物的 3 倍",
        "Combo 食物（黃色）可延長連擊計時",
        "主選單可調難度與操作靈敏度／遊戲速度",
        "結算分數會依難度加成並上傳排行榜（需登入）",
      ],
    },
  },
  "cyber-bubble-pop": {
    highlights: ["四段難度", "特殊泡泡", "連鎖消除", "排行榜"],
    help: {
      about: "經典泡泡龍的霓虹重製版。發射泡泡與上方同色泡泡相鄰三顆以上即可消除並得分，連鎖消除可觸發震屏與加分。",
      features: [
        "四段難度：影響初始列數、發射冷卻與警戒線高度",
        "閃電球消除整行、黑洞球吸收同色、炸彈球清除範圍（困難+）",
        "連鎖限時內繼續消除可維持 Combo 加成",
        "設定可調瞄準靈敏度，分數上傳排行榜",
      ],
      controls: ["← →：調整發射角度", "空白鍵：發射泡泡", "設定可調「操作靈敏度」改變瞄準速度"],
      tips: [
        "閃電球：消除整行並產生連鎖",
        "黑洞球：吸收周圍同色泡泡",
        "炸彈球（困難+）：清除小範圍泡泡",
        "連擊限時內繼續消除可維持 Combo 加成",
      ],
    },
  },
  "quantum-tic-tac-toe": {
    highlights: ["四段難度", "強化 AI", "限時對局", "勝率統計"],
    help: {
      about: "5×5 量子棋盤上的連五對決。與 AI 輪流落子，先連成五子者獲勝。每回合有倒數計時，超時自動落子。",
      features: [
        "四段難度縮短回合限時（45 秒 → 15 秒）",
        "困難以上 AI 會連五、擋招並搶佔中心與四角",
        "本機勝率統計顯示於主選單 HUD",
        "設定中的遊戲速度會加快倒數節奏",
      ],
      controls: ["滑鼠左鍵：在空格落子", "每回合倒數結束前必須落子，逾時會自動落子"],
      tips: [
        "困難以上 AI 會優先連五、阻擋你的連線",
        "限時依難度縮短",
        "設定中的「遊戲速度」會加快倒數節奏",
      ],
    },
  },
  "void-brick-breaker": {
    highlights: ["四段難度", "多球／雷射", "不可破壞磚", "排行榜"],
    help: {
      about: "虛空矩陣中的經典打磚塊。用擋板反彈球體擊碎磚塊，清空可破壞磚即可過關。",
      features: ["四段難度調整球速與磚塊列數", "多球分裂、磁力吸附、雷射冷卻射擊", "極限模式有不可破壞灰色磚"],
      controls: ["← → 或 A D：移動擋板", "空白鍵：發射雷射（有冷卻）"],
      tips: ["多球道具可同時破壞多排磚塊", "磁力道具讓球偏向擋板方向"],
    },
  },
  "rainy-frog-dash": {
    highlights: ["二段跳", "護盾", "Combo 金幣", "四段難度"],
    help: {
      about: "雨夜霓虹賽道上的橫向跑酷。控制青蛙跳躍、滑翔與衝刺，收集金幣，避開障礙物。",
      features: ["二段跳、長按滑翔與 Z 鍵護盾", "火箭道具短時間自動加速", "連續收集金幣累積 Combo"],
      controls: ["空白鍵：跳躍（可二段跳）", "長按空白：滑翔", "Z：開啟護盾（有冷卻）"],
      tips: ["護盾可抵擋一次碰撞", "難度越高障礙密度與移速越快"],
    },
  },
  "neon-tetromino-rush": {
    highlights: ["幽靈預覽", "方塊保留", "連消 Combo", "四段難度"],
    help: {
      about: "經典俄羅斯方塊的霓虹版。堆疊方塊並消除整行得分，方塊堆頂即失敗。",
      features: ["標準以上顯示幽靈落點", "C 鍵保留／交換方塊", "連續消行 Combo 加分"],
      controls: ["← →：移動", "↑：旋轉", "↓：軟降", "空白鍵：硬降", "C：保留（每顆方塊限一次）"],
      tips: ["一次消除多行得分更高", "困難以上掉落速度更快"],
    },
  },
  "galactic-invader-2026": {
    highlights: ["BOSS 波", "武器升級", "護盾道具", "四段難度"],
    help: {
      about: "復古射擊的星際強化版。操控戰機射擊，消滅入侵者與 BOSS。",
      features: ["多波敵人後出現 BOSS", "擊破敵人掉落武器升級或護盾", "四段難度調整敵速"],
      controls: ["← → 或 A D：移動戰機", "空白鍵：連續射擊"],
      tips: ["護盾可吸收一次敵彈", "每數波會出現 BOSS"],
    },
  },
  "memory-matrix-glitch": {
    highlights: ["Glitch 特效", "Combo 音階", "限時關卡", "四段難度"],
    help: {
      about: "駭客風格的記憶翻牌。限時內配對相同圖案，連續配對可累積 Combo。",
      features: ["四段難度調整配對數與限時", "極限模式 Glitch 故障翻轉", "連續配對觸發音階特效"],
      controls: ["滑鼠左鍵：翻牌", "Enter：快速翻牌"],
      tips: ["困難以上卡片數量增加", "清空所有配對即過關"],
    },
  },
  "overdrive-cyber-pong": {
    highlights: ["曲球軌跡", "重力場", "可點選模式", "雙人對戰"],
    help: {
      about: "霓虹風格的乒乓球對戰。先達到目標分數者獲勝。",
      features: ["開始後可點選畫面按鈕或按 1/2/3 選模式", "曲球 spin 與重力場", "四段難度調整 AI 與勝利分數"],
      controls: [
        "開始後點選畫面上的模式按鈕，或按 1 / 2 / 3",
        "1：簡單 AI · 2：困難 AI · 3：本地雙人",
        "單人對 AI：W / S 控制左側擋板",
        "雙人：左 W/S · 右 ↑/↓",
      ],
      tips: ["擊球角度取決於碰板位置", "目標分數依難度：5～11 分"],
    },
    pong: true,
  },
  "cyber-neon-runner": {
    highlights: ["雷射破障", "金幣磁吸", "視差背景", "四段難度"],
    help: {
      about: "賽博都市無盡跑酷。跳躍與滑行避開障礙，收集金幣，距離越遠分數越高。",
      features: ["Z 鍵雷射摧毀障礙", "困難以上金幣磁吸", "多層視差霓虹背景"],
      controls: ["空白鍵：跳躍", "↓ 或 S：滑行", "Z：發射雷射"],
      tips: ["連續收集金幣維持 Combo", "碰撞即結束，分數上傳排行榜"],
    },
  },
};

function fmtHelp(help) {
  const q = (s) => `"${s.replace(/"/g, '\\"')}"`;
  const lines = (arr) => arr.map(q).join(",\n      ");
  return `  help: {
    about: ${q(help.about)},
    features: [
      ${lines(help.features)}
    ],
    controls: [
      ${lines(help.controls)}
    ],
    tips: [
      ${lines(help.tips)}
    ]
  },`;
}

function patchFile(slug, data) {
  const file = path.join(ROOT, slug, "index.html");
  let html = fs.readFileSync(file, "utf8");
  html = html.replace(SDK_SRC_RE, SDK);

  if (html.includes("help:")) {
    if (data.pong && !html.includes("MODE_BUTTONS")) {
      html = applyPongFix(html);
      fs.writeFileSync(file, html, "utf8");
      console.log(`${slug}: pong fix applied`);
    } else {
      console.log(`${slug}: already has help`);
    }
    html = html.replace(SDK_SRC_RE, SDK);
    fs.writeFileSync(file, html, "utf8");
    return;
  }

  const highlights = data.highlights.map((h) => `"${h}"`).join(", ");
  const helpBlock = `  highlights: [${highlights}],\n${fmtHelp(data.help)}\n  onStop: cleanup,\n`;

  const before = html;
  html = html.replace(/(\s+bgmStyle: "[^"]+",\r?\n)(\s+onStart: startGame)/, `$1${helpBlock}$2`);
  if (html === before) {
    console.warn(`${slug}: WARN help block not inserted (regex mismatch)`);
  }

  if (data.pong && !html.includes("MODE_BUTTONS")) {
    html = applyPongFix(html);
  }

  fs.writeFileSync(file, html, "utf8");
  console.log(`${slug}: patched`);
}

function applyPongFix(html) {
  if (html.includes("MODE_BUTTONS")) return html;
  html = html.replace(
    /function cleanup\(\) \{\n  running = false;/,
    `var MODE_BUTTONS = [
  { id: "easy", label: "1 · 單人簡單 AI", x: 280, y: 228, w: 400, h: 44 },
  { id: "hard", label: "2 · 單人困難 AI", x: 280, y: 278, w: 400, h: 44 },
  { id: "2p", label: "3 · 本地雙人", x: 280, y: 328, w: 400, h: 44 }
];

function cleanup() {
  running = false;
  if (shell && shell.canvas) shell.canvas.removeEventListener("click", onCanvasClick);`
  );
  html = html.replace(
    /  resetBall\(1\);\n  updateHud\(\);\n  running = true;\n  lastT = performance\.now\(\);\n  window\.addEventListener\("keydown", onKeyDown\);\n  window\.addEventListener\("keyup", onKeyUp\);\n  loopId = requestAnimationFrame\(loop\);\n\}/,
    `  resetBall(1);
  updateHud();
  running = true;
  lastT = performance.now();
  shell.canvas.setAttribute("tabindex", "0");
  shell.canvas.focus();
  shell.canvas.addEventListener("click", onCanvasClick);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  loopId = requestAnimationFrame(loop);
}

function pickMode(nextMode) {
  if (!modePick) return;
  mode = nextMode;
  modePick = false;
  RNF.sfx.confirm();
  updateHud();
}

function onCanvasClick(e) {
  if (!running || !modePick) return;
  var rect = shell.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  var x = (e.clientX - rect.left) * (960 / rect.width);
  var y = (e.clientY - rect.top) * (520 / rect.height);
  MODE_BUTTONS.forEach(function (btn) {
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) pickMode(btn.id);
  });
}`
  );
  html = html.replace(
    /if \(modePick\) \{\n    if \(e\.code === "Digit1"\)[\s\S]*?\n  \}/,
    `if (modePick) {
    if (e.code === "Digit1" || e.code === "Numpad1" || e.key === "1") pickMode("easy");
    else if (e.code === "Digit2" || e.code === "Numpad2" || e.key === "2") pickMode("hard");
    else if (e.code === "Digit3" || e.code === "Numpad3" || e.key === "3") pickMode("2p");
  }`
  );
  html = html.replace(
    /  if \(modePick\) \{\n    ctx\.fillStyle = "rgba\(0,0,0,0\.65\)";[\s\S]*?ctx\.fillText\("3 — 本地雙人 \(W\/S vs ↑↓\)", 480, 310\);\n  \}/,
    `  if (modePick) {
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, 960, 520);
    ctx.textAlign = "center";
    ctx.fillStyle = "#22d3ee";
    ctx.font = "bold 24px 'Microsoft JhengHei',sans-serif";
    ctx.fillText("選擇對戰模式", 480, 190);
    ctx.font = "14px sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("點擊按鈕，或按鍵盤 1 / 2 / 3", 480, 218);
    MODE_BUTTONS.forEach(function (btn, i) {
      var pulse = 0.85 + Math.sin(pickTimer * 4 + i) * 0.15;
      ctx.fillStyle = "rgba(34,211,238," + (0.12 * pulse) + ")";
      ctx.strokeStyle = "rgba(34,211,238," + (0.55 * pulse) + ")";
      ctx.lineWidth = 2;
      ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
      ctx.strokeRect(btn.x + 1, btn.y + 1, btn.w - 2, btn.h - 2);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 17px 'Microsoft JhengHei',sans-serif";
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 6);
    });
  }`
  );
  return html;
}

for (const [slug, data] of Object.entries(PATCHES)) {
  patchFile(slug, data);
}
