import type { ForumCategory } from "@/lib/forum";
import { VOID_GACHA_TITLE } from "@/lib/platform-catalog";
import type { LocalizedText, SeedAuthorRef } from "@/lib/forum-seed-locale";

export type ForumPostSeedDef = {
  category: ForumCategory;
  createdAtOffsetDays: number;
  author: SeedAuthorRef;
  title: LocalizedText;
  content: LocalizedText;
  comments?: {
    author: SeedAuthorRef;
    content: LocalizedText;
    offsetHours: number;
  }[];
};

export type GameCommentSeedDef = {
  author: SeedAuthorRef;
  content: LocalizedText;
  offsetHours: number;
};

function loc(zhHK: string, zhCN: string, en: string): LocalizedText {
  return { "zh-HK": zhHK, "zh-CN": zhCN, en };
}

const player = (index: number): SeedAuthorRef => ({ kind: "player", index });

export const FORUM_POST_SEEDS: Record<string, ForumPostSeedDef[]> = {
  [VOID_GACHA_TITLE]: [
    {
      category: "question",
      createdAtOffsetDays: 2,
      author: player(0),
      title: loc(
        "求神秘虛擬卡牌的核心卡組搭配！",
        "求神秘虚拟卡牌的核心卡组搭配！",
        "Need help building a core deck for the void cards"
      ),
      content: loc(
        "剛入坑 VOID GACHA，目前手上有 3 張 SSR 虛空卡，但深淵關卡第 7 層一直卡關。\n\n想請各位大佬分享「核心卡組」的組法：\n- 虛無共鳴流 vs 暴擊連鎖流哪個更穩？\n- 微交易抽卡池要不要等活動再砸？\n\n任何心得都歡迎，感謝！",
        "刚入坑 VOID GACHA，目前手上有 3 张 SSR 虚空卡，但深渊关卡第 7 层一直卡关。\n\n想请各位大佬分享「核心卡组」的组法：\n- 虚无共鸣流 vs 暴击连锁流哪个更稳？\n- 微交易抽卡池要不要等活动再砸？\n\n任何心得都欢迎，感谢！",
        "Just started VOID GACHA — sitting on 3 SSR void cards but I'm hard stuck on Abyss floor 7.\n\nLooking for core deck builds:\n- Void Resonance vs crit chain — which is more consistent?\n- Should I save pulls for the event banner or go now?\n\nAny tips appreciated, thanks!"
      ),
      comments: [
        {
          author: player(2),
          content: loc(
            "建議先湊齊 2 張共鳴觸發卡，深淵 7 層的敵人血量高，暴擊流沒有續航會斷檔。",
            "建议先凑齐 2 张共鸣触发卡，深渊 7 层的敌人血量高，暴击流没有续航会断档。",
            "Grab 2 resonance trigger cards first. Floor 7 enemies are chunky — crit builds fall off without sustain."
          ),
          offsetHours: 3,
        },
        {
          author: player(11),
          content: loc(
            "活動池有保底機制，建議存到 80 抽再進場，長期 CP 值最高。",
            "活动池有保底机制，建议存到 80 抽再进场，长期 CP 值最高。",
            "Event banner has pity — I'd save up to 80 pulls before diving in. Best long-term value."
          ),
          offsetHours: 8,
        },
      ],
    },
    {
      category: "bug",
      createdAtOffsetDays: 5,
      author: player(12),
      title: loc(
        "回報：充值微交易介面的 UI 顯示 Bug",
        "回报：充值微交易界面的 UI 显示 Bug",
        "Bug report: top-up UI button hidden behind nav bar"
      ),
      content: loc(
        "在 1440p 螢幕下，充值微交易介面的確認按鈕會被底部導覽列遮住約 20%。\n\n重現步驟：\n1. 進入商城 → 虛空禮包\n2. 點擊購買\n3. 確認視窗底部按鈕不可點擊\n\n裝置：Chrome 136 / Windows 11",
        "在 1440p 屏幕下，充值微交易界面的确认按钮会被底部导航栏遮住约 20%。\n\n重现步骤：\n1. 进入商城 → 虚空礼包\n2. 点击购买\n3. 确认窗口底部按钮不可点击\n\n设备：Chrome 136 / Windows 11",
        "On 1440p the confirm button on the top-up screen gets covered by the bottom nav — about 20% hidden.\n\nSteps:\n1. Shop → Void Bundle\n2. Tap purchase\n3. Bottom button in the confirm dialog isn't clickable\n\nChrome 136 / Win 11"
      ),
      comments: [
        {
          author: { kind: "official", key: "nexusplay-support" },
          content: loc(
            "已收錄至 v1.2.4 修復清單，感謝回報！臨時解法可縮放至 90% 顯示。",
            "已收录至 v1.2.4 修复清单，感谢回报！临时解法可缩放至 90% 显示。",
            "Logged for v1.2.4 — thanks for the report! Workaround: zoom out to 90% for now."
          ),
          offsetHours: 6,
        },
      ],
    },
    {
      category: "review",
      createdAtOffsetDays: 1,
      author: player(5),
      title: loc(
        "新賽季深淵排名心得分享",
        "新赛季深渊排名心得分享",
        "New season abyss ladder — some thoughts"
      ),
      content: loc(
        "這季深淵排名賽的節奏比上季快很多，建議大家早點定好主核心，不要頻繁換卡組。\n\n我個人用「虛無共鳴 + 護盾循環」穩定在前 500，祝大家衝榜順利！",
        "这季深渊排名赛的节奏比上季快很多，建议大家早点定好主核心，不要频繁换卡组。\n\n我个人用「虚无共鸣 + 护盾循环」稳定在前 500，祝大家冲榜顺利！",
        "This season's abyss ladder is way faster paced. Lock in your core early — don't keep swapping decks.\n\nRunning Void Resonance + shield loop and sitting top 500. Good luck on the climb!"
      ),
    },
  ],

  "CoreDefense: Mindustry X": [
    {
      category: "guide",
      createdAtOffsetDays: 3,
      author: player(8),
      title: loc(
        "Mindustry X 第 12 關通關佈局分享",
        "Mindustry X 第 12 关通关布局分享",
        "Stage 12 clear layout — sharing my setup"
      ),
      content: loc(
        "第 12 關異星機械潮會從東、北兩側同時進攻，建議佈局如下：\n\n🔧 核心區：雙層輸送帶環形供彈，銅→鋼→穿甲彈藥全自動\n🛡️ 外圍：雷射塔 + 濺射砲塔 3:2 比例\n⚡ 關鍵：第 8 波前完成核心裂變升級\n\n附上我的佈局邏輯，歡迎交流優化！",
        "第 12 关异星机械潮会从东、北两侧同时进攻，建议布局如下：\n\n🔧 核心区：双层输送带环形供弹，铜→钢→穿甲弹药全自动\n🛡️ 外围：激光塔 + 溅射炮塔 3:2 比例\n⚡ 关键：第 8 波前完成核心裂变升级\n\n附上我的布局逻辑，欢迎交流优化！",
        "Stage 12 sends alien mech waves from east AND north at once. Here's what worked for me:\n\n🔧 Core: double belt ring feed, full auto copper → steel → AP ammo\n🛡️ Outer ring: laser + splash turrets at 3:2\n⚡ Key: core fission upgrade before wave 8\n\nHappy to hear tweaks!"
      ),
      comments: [
        {
          author: player(9),
          content: loc(
            "環形供彈超關鍵！我之前直線輸送在第 10 波斷鏈，學到了。",
            "环形供弹超关键！我之前直线输送在第 10 波断链，学到了。",
            "The ring feed is huge — my straight belts choked at wave 10. Good call."
          ),
          offsetHours: 4,
        },
      ],
    },
    {
      category: "review",
      createdAtOffsetDays: 1,
      author: player(10),
      title: loc(
        "這款 3D 渲染優化得太流暢了吧！",
        "这款 3D 渲染优化得太流畅了吧！",
        "The 3D performance on this is actually insane"
      ),
      content: loc(
        "在 GTX 1660 上全高畫質還能穩 60fps，工廠全速運轉時也沒明顯掉幀。\n\n重工業場景的粒子效果和金屬材質質感真的頂，NeonTowers 的技術力太強了。",
        "在 GTX 1660 上全高画质还能稳 60fps，工厂全速运转时也没明显掉帧。\n\n重工业场景的粒子效果和金属材质质感真的顶，NeonTowers 的技术力太强了。",
        "GTX 1660, max settings, locked 60fps even when the factory is going full tilt. No real stutters.\n\nParticles and metal shaders on the industrial scenes look incredible — NeonTowers cooked."
      ),
      comments: [
        {
          author: { kind: "official", key: "neontowers" },
          content: loc(
            "感謝支持！下一版會加入更多動態光影與輸送帶批次渲染優化。",
            "感谢支持！下一版会加入更多动态光影与输送带批次渲染优化。",
            "Appreciate it! Next patch adds more dynamic lighting and belt batching optimizations."
          ),
          offsetHours: 12,
        },
      ],
    },
    {
      category: "question",
      createdAtOffsetDays: 4,
      author: player(7),
      title: loc(
        "核心裂變升級時機怎麼抓？",
        "核心裂变升级时机怎么抓？",
        "When do you usually trigger core fission?"
      ),
      content: loc(
        "每次都在猶豫什麼時候點核心裂變——太早資源不夠，太晚又撐不住。\n\n大家通常第幾波升級？有沒有通用的資源門檻參考？",
        "每次都在犹豫什么时候点核心裂变——太早资源不够，太晚又撑不住。\n\n大家通常第几波升级？有没有通用的资源门槛参考？",
        "I always hesitate on core fission timing — too early and you're broke, too late and you fold.\n\nWhat wave do you usually upgrade? Any rough resource thresholds?"
      ),
    },
  ],

  "CyberFortune 012": [
    {
      category: "question",
      createdAtOffsetDays: 2,
      author: player(6),
      title: loc(
        "012 矩陣全餐打法真的能提高勝率嗎？",
        "012 矩阵全餐打法真的能提高胜率吗？",
        "Does the 012 matrix full-meal strat actually win more?"
      ),
      content: loc(
        "看了幾場高端局的回放，全餐打法（0-1-2 矩陣三線同開）好像勝率很高，但資源消耗也驚人。\n\n想請教：\n- 適合新手嗎？\n- 什麼牌型下才值得啟動全餐？\n- 有沒有反制策略？",
        "看了几场高端局的回放，全餐打法（0-1-2 矩阵三线同开）好像胜率很高，但资源消耗也惊人。\n\n想请教：\n- 适合新手吗？\n- 什么牌型下才值得启动全餐？\n- 有没有反制策略？",
        "Watched some high-elo VODs — the full-meal line (0-1-2 matrix, all three lanes) looks strong but burns resources fast.\n\nQuestions:\n- Newbie friendly?\n- What hand shapes justify going full meal?\n- Any counters?"
      ),
      comments: [
        {
          author: player(1),
          content: loc(
            "全餐適合中後期，起手別硬開。關鍵是看對手棄牌節奏，通常第 4 回合是最佳窗口。",
            "全餐适合中后期，起手别硬开。关键是看对手弃牌节奏，通常第 4 回合是最佳窗口。",
            "Full meal is mid/late — don't force it on open. Watch discard tempo; turn 4 is usually the sweet spot."
          ),
          offsetHours: 5,
        },
        {
          author: player(3),
          content: loc(
            "我跑了 500 場數據，全餐在牌型分散度 > 0.7 時期望值最高。",
            "我跑了 500 场数据，全餐在牌型分散度 > 0.7 时期望值最高。",
            "Ran 500 games — full meal EV peaks when hand spread > 0.7."
          ),
          offsetHours: 10,
        },
      ],
    },
    {
      category: "showcase",
      createdAtOffsetDays: 1,
      author: player(4),
      title: loc(
        "復古電競霓虹風的 UI 設計太戳我了",
        "复古电竞霓虹风的 UI 设计太戳我了",
        "This retro esports neon UI hits different"
      ),
      content: loc(
        "黑魂金配色 + 霓虹線條的 HUD 簡直藝術品級別，統計面板那個概率曲線動畫我可以看一整天。\n\nEliteRoyal Gaming 的視覺團隊真的懂高端電競審美。",
        "黑魂金配色 + 霓虹线条的 HUD 简直艺术品级别，统计面板那个概率曲线动画我可以看一整天。\n\nEliteRoyal Gaming 的视觉团队真的懂高端电竞审美。",
        "Dark gold + neon line HUD is straight art. I could stare at the probability curve animation on the stats panel all day.\n\nEliteRoyal's art team gets premium esports vibes."
      ),
      comments: [
        {
          author: { kind: "official", key: "eliteroyal-art" },
          content: loc(
            "謝謝喜歡！下一版會加入可自訂霓虹主題色，敬請期待。",
            "谢谢喜欢！下一版会加入可自定义霓虹主题色，敬请期待。",
            "Thanks! Custom neon theme colors are coming in the next update — stay tuned."
          ),
          offsetHours: 8,
        },
      ],
    },
    {
      category: "bug",
      createdAtOffsetDays: 6,
      author: player(0),
      title: loc(
        "對戰配對有時候等太久",
        "对战配对有时候等太久",
        "Matchmaking queues get really long sometimes"
      ),
      content: loc(
        "尖峰時段（晚上 9-11 點）配對有時要等 2-3 分鐘，不知道是不是伺服器負載問題？\n\n有人有同樣狀況嗎？",
        "尖峰时段（晚上 9-11 点）配对有时要等 2-3 分钟，不知道是不是服务器负载问题？\n\n有人有同样状况吗？",
        "Peak hours (9–11 PM) I sometimes wait 2–3 min in queue. Server load issue?\n\nAnyone else seeing this?"
      ),
    },
  ],

  "Neon Abyss: Void Runner": [
    {
      category: "guide",
      createdAtOffsetDays: 2,
      author: player(1),
      title: loc(
        "深淵第 15 波 BOSS 怎麼躲三重雷射？",
        "深渊第 15 波 BOSS 怎么躲三重激光？",
        "Abyss wave 15 boss — how do you dodge the triple lasers?"
      ),
      content: loc(
        "卡在深淵難度第 15 波 BOSS 的三重雷射很久了，中間那條路幾乎必中。\n\n大家是用衝刺硬穿還是等間隙？有沒有穩定的走位節奏？",
        "卡在深渊难度第 15 波 BOSS 的三重激光很久了，中间那条路几乎必中。\n\n大家是用冲刺硬穿还是等间隙？有没有稳定的走位节奏？",
        "Stuck on abyss wave 15 boss triple laser forever — middle lane feels like a guaranteed hit.\n\nDo you dash through or wait for gaps? Any consistent rhythm?"
      ),
      comments: [
        {
          author: player(2),
          content: loc(
            "BOSS 雷射有 1.2 秒預警，先切到安全線再衝刺穿第二發，第三發往反方向閃。",
            "BOSS 激光有 1.2 秒预警，先切到安全线再冲刺穿第二发，第三发往反方向闪。",
            "Lasers telegraph for 1.2s — slide to a safe lane, dash through beam #2, dodge #3 the other way."
          ),
          offsetHours: 4,
        },
      ],
    },
    {
      category: "meme",
      createdAtOffsetDays: 1,
      author: player(3),
      title: loc(
        "連擊倍率疊到 ×5 的爽感無敵",
        "连击倍率叠到 ×5 的爽感无敌",
        "Stacking combo multiplier to ×5 feels incredible"
      ),
      content: loc(
        "能量核心連吃 + 不撞障礙，倍率衝上 ×5 分數直接翻三倍，太上癮了！",
        "能量核心连吃 + 不撞障碍，倍率冲上 ×5 分数直接翻三倍，太上瘾了！",
        "Chain energy cores, no hits — multiplier hits ×5 and your score triples. So addictive."
      ),
    },
  ],

  "Signal Breach: ICE Protocol": [
    {
      category: "guide",
      createdAtOffsetDays: 3,
      author: player(4),
      title: loc(
        "第 9 關 ICE 巡邏路線攻略",
        "第 9 关 ICE 巡逻路线攻略",
        "Stage 9 ICE patrol routes — cleared in 18 steps"
      ),
      content: loc(
        "第 9 關有 4 隻 ICE 交叉巡邏，建議先誘導左上那隻再從右下角繞路進核心。\n\n附上我的步數：最少 18 步可過。",
        "第 9 关有 4 只 ICE 交叉巡逻，建议先诱导左上那只再从右下角绕路进核心。\n\n附上我的步数：最少 18 步可过。",
        "Stage 9 has 4 ICE agents on crossing patrols. Bait the top-left one first, then loop in from bottom-right to the core.\n\nMy run: 18 steps minimum."
      ),
    },
    {
      category: "lore",
      createdAtOffsetDays: 1,
      author: player(5),
      title: loc(
        "駭客風 UI 細節滿分",
        "骇客风 UI 细节满分",
        "The hacker UI details are *chef's kiss*"
      ),
      content: loc(
        "節點脈衝動畫和路徑粒子軌跡質感超好，破解成功那一下的閃光太療癒。",
        "节点脉冲动画和路径粒子轨迹质感超好，破解成功那一下的闪光太疗愈。",
        "Node pulse animations and path particle trails look amazing — that flash on a successful breach is so satisfying."
      ),
    },
  ],

  "Void Relay: Card Descent": [
    {
      category: "guide",
      createdAtOffsetDays: 2,
      author: player(6),
      title: loc(
        "虛空女王 BOSS 卡組推薦",
        "虚空女王 BOSS 卡组推荐",
        "Void Queen boss — deck rec"
      ),
      content: loc(
        "打到第 15 層虛空女王，她每回合雙攻 + 上毒。\n\n推薦帶 2 張護盾 + 虛空爆發 + 荊棘反傷，撐過前三回合就能反打。",
        "打到第 15 层虚空女王，她每回合双攻 + 上毒。\n\n推荐带 2 张护盾 + 虚空爆发 + 荆棘反伤，撑过前三回合就能反打。",
        "Floor 15 Void Queen hits double attack + poison every turn.\n\nRun 2 shields + void burst + thorns — survive three turns then turn it around."
      ),
      comments: [
        {
          author: player(2),
          content: loc(
            "記得留能量給淨化卡，女王第三階段會疊 3 層虛空腐蝕。",
            "记得留能量给净化卡，女王第三阶段会叠 3 层虚空腐蚀。",
            "Save energy for cleanse — phase 3 stacks 3 void corrosion."
          ),
          offsetHours: 6,
        },
      ],
    },
    {
      category: "update",
      createdAtOffsetDays: 1,
      author: player(7),
      title: loc(
        "Roguelike 卡牌深度超出預期",
        "Roguelike 卡牌深度超出预期",
        "Roguelike depth way better than I expected"
      ),
      content: loc(
        "20 種卡 + 敵人意圖預判，每局路線都不同，已經刷了 30 局還想再來。",
        "20 种卡 + 敌人意图预判，每局路线都不同，已经刷了 30 局还想再来。",
        "20 cards + enemy intent preview — every run feels different. 30 runs in and still one more."
      ),
    },
  ],

  "Pulse Protocol: Neon Beat": [
    {
      category: "speedrun",
      createdAtOffsetDays: 2,
      author: player(8),
      title: loc(
        "量子崩壞 狂熱難度全 Perfect 可能嗎？",
        "量子崩坏 狂热难度全 Perfect 可能吗？",
        "Quantum Collapse Maniac — full Perfect even possible?"
      ),
      content: loc(
        "狂熱難度 160 BPM 的密集段落太瘋了，目前最高 94% 準確率，有人全 Perfect 過嗎？",
        "狂热难度 160 BPM 的密集段落太疯了，目前最高 94% 准确率，有人全 Perfect 过吗？",
        "Maniac at 160 BPM in the dense sections is brutal. Best I've got is 94% accuracy — anyone actually full Perfect'd it?"
      ),
    },
    {
      category: "showcase",
      createdAtOffsetDays: 1,
      author: player(9),
      title: loc(
        "Fever 模式視覺效果炸裂",
        "Fever 模式视觉效果炸裂",
        "Fever mode visuals go absolutely hard"
      ),
      content: loc(
        "50 連擊進 Fever 整個畫面變金色，分數狂飆，設計太懂節奏遊戲玩家了。",
        "50 连击进 Fever 整个画面变金色，分数狂飙，设计太懂节奏游戏玩家了。",
        "50 combo into Fever turns the whole screen gold and scores explode. They know rhythm game players."
      ),
    },
  ],

  "軌道回收：環形防線": [
    {
      category: "guide",
      createdAtOffsetDays: 4,
      author: player(10),
      title: loc(
        "第 20 波 BOSS 環形佈局分享",
        "第 20 波 BOSS 环形布局分享",
        "Wave 20 boss — ring layout that held"
      ),
      content: loc(
        "最外圈 3 電磁 + 2 新星 AOE，中圈 4 脈衝速射，內圈 2 冰霜減速。\n\nBOSS 進內圈前用新星清小怪，核心 HP 能穩在 60% 以上。",
        "最外圈 3 电磁 + 2 新星 AOE，中圈 4 脉冲速射，内圈 2 冰霜减速。\n\nBOSS 进内圈前用新星清小怪，核心 HP 能稳在 60% 以上。",
        "Outer ring: 3 EM + 2 nova AOE. Mid: 4 pulse rapid. Inner: 2 frost slow.\n\nNova the adds before boss enters inner ring — kept core above 60% HP."
      ),
    },
    {
      category: "guide",
      createdAtOffsetDays: 2,
      author: player(11),
      title: loc(
        "回收砲塔經濟流超穩",
        "回收炮塔经济流超稳",
        "Salvage turret economy run is super stable"
      ),
      content: loc(
        "前期多放回收砲塔攢廢料，第 8 波一次升滿三個電磁，後面輕鬆很多。",
        "前期多放回收炮塔攒废料，第 8 波一次升满三个电磁，后面轻松很多。",
        "Spam salvage turrets early to stock scrap, max three EM turrets at wave 8 — late game gets easy."
      ),
    },
  ],
};

export const GAME_COMMENT_SEEDS: Record<string, GameCommentSeedDef[]> = {
  [VOID_GACHA_TITLE]: [
    {
      author: player(0),
      content: loc(
        "抽卡動畫和霓虹 UI 質感一流，已加入收藏。",
        "抽卡动画和霓虹 UI 质感一流，已加入收藏。",
        "Pull animations and neon UI are top tier — instant favorite."
      ),
      offsetHours: 4,
    },
    {
      author: player(1),
      content: loc(
        "共鳴流卡組湊齊之後深淵關卡順很多，微交易介面也算清楚。",
        "共鸣流卡组凑齐之后深渊关卡顺很多，微交易界面也算清楚。",
        "Resonance deck online — abyss floors feel way smoother. Shop UI is clean too."
      ),
      offsetHours: 18,
    },
    {
      author: player(2),
      content: loc(
        "活動池保底機制很友善，新手不用硬課也能慢慢組出核心牌組。",
        "活动池保底机制很友善，新手不用硬氪也能慢慢组出核心牌组。",
        "Event pity is fair — F2P can build a real core deck without whaling."
      ),
      offsetHours: 36,
    },
    {
      author: player(3),
      content: loc(
        "SSR 虛空卡的特效細節拉滿，每次抽卡都很有儀式感。",
        "SSR 虚空卡的特效细节拉满，每次抽卡都很有仪式感。",
        "SSR void card VFX are insane — every pull feels like an event."
      ),
      offsetHours: 72,
    },
  ],

  "CoreDefense: Mindustry X": [
    {
      author: player(0),
      content: loc(
        "七種砲塔搭配起來超有策略深度，自動下一波功能很貼心！",
        "七种炮塔搭配起来超有策略深度，自动下一波功能很贴心！",
        "Seven turret types combo deep — auto next wave is a nice QoL touch."
      ),
      offsetHours: 2,
    },
    {
      author: player(1),
      content: loc(
        "畫面雖然是 demo 但手感已經很完整了，期待正式版。",
        "画面虽然是 demo 但手感已经很完整了，期待正式版。",
        "Still a demo but it already feels complete — hyped for full release."
      ),
      offsetHours: 5,
    },
    {
      author: player(2),
      content: loc(
        "輸送帶環形供彈設計太爽了，看工廠全速運轉莫名療癒。",
        "输送带环形供弹设计太爽了，看工厂全速运转莫名疗愈。",
        "Ring belt feeding is so satisfying — factory at full speed is pure ASMR."
      ),
      offsetHours: 14,
    },
    {
      author: player(3),
      content: loc(
        "第 12 關雙向進攻壓力很大，但核心裂變升級後逆轉超有成就感。",
        "第 12 关双向进攻压力很大，但核心裂变升级后逆转超有成就感。",
        "Stage 12 dual assault is brutal — core fission comeback hits different."
      ),
      offsetHours: 28,
    },
    {
      author: player(4),
      content: loc(
        "建議新手先熟悉銅→鋼→穿甲彈藥鏈，後面波次會輕鬆很多。",
        "建议新手先熟悉铜→钢→穿甲弹药链，后面波次会轻松很多。",
        "New players: learn the copper → steel → AP chain first. Later waves get way easier."
      ),
      offsetHours: 52,
    },
  ],

  "CyberFortune 012": [
    {
      author: player(0),
      content: loc(
        "連擊系統很上癮，排行榜讓我想一直刷分。",
        "连击系统很上瘾，排行榜让我想一直刷分。",
        "Combo system is addictive — leaderboard has me grinding nonstop."
      ),
      offsetHours: 3,
    },
    {
      author: player(1),
      content: loc(
        "012 矩陣全餐打法看懂之後勝率明顯提升，策略深度比想像中高。",
        "012 矩阵全餐打法看懂之后胜率明显提升，策略深度比想象中高。",
        "Once you get the 012 full-meal line, win rate jumps — deeper than it looks."
      ),
      offsetHours: 11,
    },
    {
      author: player(2),
      content: loc(
        "霓虹 HUD 和概率曲線動畫質感滿分，光介面就能看很久。",
        "霓虹 HUD 和概率曲线动画质感满分，光界面就能看很久。",
        "Neon HUD + probability curve animation — could stare at the UI alone."
      ),
      offsetHours: 22,
    },
    {
      author: player(3),
      content: loc(
        "休閒難度很適合入門，深淵模式才真的考驗算牌節奏。",
        "休闲难度很适合入门，深渊模式才真的考验算牌节奏。",
        "Casual is great for learning — abyss is where the real math kicks in."
      ),
      offsetHours: 40,
    },
  ],

  "Neon Abyss: Void Runner": [
    {
      author: player(0),
      content: loc(
        "三線切換手感很順，衝刺冷卻抓好了能玩很久！",
        "三线切换手感很顺，冲刺冷却抓好了能玩很久！",
        "Three-lane switching feels tight — nail dash cooldown and you can run forever."
      ),
      offsetHours: 2,
    },
    {
      author: player(1),
      content: loc(
        "設定裡可以調移動幅度，覺得太靈敏的話選「小」會好很多。",
        "设置里可以调移动幅度，觉得太灵敏的话选「小」会好很多。",
        "Settings let you tweak movement range — set it to Small if controls feel too twitchy."
      ),
      offsetHours: 9,
    },
    {
      author: player(2),
      content: loc(
        "連擊倍率疊到 ×5 分數暴漲，能量球一定要穩穩接。",
        "连击倍率叠到 ×5 分数暴涨，能量球一定要稳稳接。",
        "×5 combo multiplier melts the scoreboard — don't miss those energy orbs."
      ),
      offsetHours: 20,
    },
    {
      author: player(3),
      content: loc(
        "每 5 波 BOSS 節奏設計很棒，三重雷射那關練完走位超有進步感。",
        "每 5 波 BOSS 节奏设计很棒，三重激光那关练完走位超有进步感。",
        "Boss every 5 waves is paced perfectly — triple laser stage made me way better at dodging."
      ),
      offsetHours: 48,
    },
  ],

  "Signal Breach: ICE Protocol": [
    {
      author: player(0),
      content: loc(
        "12 關難度曲線設計得很好，第 6 關開始真的燒腦。",
        "12 关难度曲线设计得很好，第 6 关开始真的烧脑。",
        "12 stages with a solid difficulty curve — stage 6 onward actually fries your brain."
      ),
      offsetHours: 3,
    },
    {
      author: player(1),
      content: loc(
        "ICE 巡邏路線可以預判，誘導之後繞路進核心超有駭客感。",
        "ICE 巡逻路线可以预判，诱导之后绕路进核心超有骇客感。",
        "ICE patrols are readable — bait and route around for that proper hacker rush."
      ),
      offsetHours: 12,
    },
    {
      author: player(2),
      content: loc(
        "節點脈衝動畫和路徑軌跡很精緻，破解成功瞬間超療癒。",
        "节点脉冲动画和路径轨迹很精致，破解成功瞬间超疗愈。",
        "Node pulses and path trails are crisp — successful breach flash is so good."
      ),
      offsetHours: 26,
    },
    {
      author: player(3),
      content: loc(
        "幽靈難度倒數壓力拉滿，連鎖破解加成設計鼓勵大膽走法。",
        "幽灵难度倒数压力拉满，连锁破解加成设计鼓励大胆走法。",
        "Ghost mode timer pressure is real — chain breach bonus rewards bold routes."
      ),
      offsetHours: 55,
    },
  ],

  "Void Relay: Card Descent": [
    {
      author: player(0),
      content: loc(
        "敵人意圖預判系統很讚，有種在玩 Slay the Spire 的感覺。",
        "敌人意图预判系统很赞，有种在玩 Slay the Spire 的感觉。",
        "Enemy intent preview is great — gives me Slay the Spire vibes."
      ),
      offsetHours: 5,
    },
    {
      author: player(1),
      content: loc(
        "虛空女王第三階段記得留淨化，不然腐蝕疊太快會直接崩。",
        "虚空女王第三阶段记得留净化，不然腐蚀叠太快会直接崩。",
        "Void Queen phase 3 — hold cleanse or corrosion stacks wipe you."
      ),
      offsetHours: 15,
    },
    {
      author: player(2),
      content: loc(
        "Roguelike 路線每次都不一樣，三選一強化讓每局都有新鮮感。",
        "Roguelike 路线每次都不一样，三选一强化让每局都有新鲜感。",
        "Every run path differs — pick-one-of-three upgrades keep it fresh."
      ),
      offsetHours: 30,
    },
    {
      author: player(3),
      content: loc(
        "20 種卡牌機制不重複，第五層領主戰節奏緊湊又公平。",
        "20 种卡牌机制不重复，第五层领主战节奏紧凑又公平。",
        "20 unique card mechanics — floor 5 lord fight is tight but fair."
      ),
      offsetHours: 60,
    },
  ],

  "Pulse Protocol: Neon Beat": [
    {
      author: player(0),
      content: loc(
        "四軌判定手感紮實，Fever 模式超有成就感！",
        "四轨判定手感扎实，Fever 模式超有成就感！",
        "Four-lane timing feels solid — Fever mode is pure dopamine."
      ),
      offsetHours: 2,
    },
    {
      author: player(1),
      content: loc(
        "50 連擊進 Fever 畫面變金色，視覺回饋做得非常到位。",
        "50 连击进 Fever 画面变金色，视觉回馈做得非常到位。",
        "50 combo Fever turns the screen gold — feedback is on point."
      ),
      offsetHours: 10,
    },
    {
      author: player(2),
      content: loc(
        "狂熱難度 160 BPM 真的狠，但 Great 判定容錯還算合理。",
        "狂热难度 160 BPM 真的狠，但 Great 判定容错还算合理。",
        "Maniac 160 BPM is nasty but Great window is forgiving enough."
      ),
      offsetHours: 24,
    },
    {
      author: player(3),
      content: loc(
        "三首原創曲目風格各異，戴耳機玩沉浸感直接拉滿。",
        "三首原创曲目风格各异，戴耳机玩沉浸感直接拉满。",
        "Three original tracks, all different vibes — headphones on, full immersion."
      ),
      offsetHours: 44,
    },
  ],

  "軌道回收：環形防線": [
    {
      author: player(0),
      content: loc(
        "環形地圖比傳統方格塔防更有策略深度，推薦！",
        "环形地图比传统方格塔防更有策略深度，推荐！",
        "Ring map has more depth than grid TD — highly recommend."
      ),
      offsetHours: 4,
    },
    {
      author: player(1),
      content: loc(
        "外圈電磁、內圈冰霜的佈局很經典，BOSS 進內圈前記得開新星。",
        "外圈电磁、内圈冰霜的布局很经典，BOSS 进内圈前记得开新星。",
        "Classic outer EM / inner frost setup — nova before boss enters inner ring."
      ),
      offsetHours: 16,
    },
    {
      author: player(2),
      content: loc(
        "前期多放回收砲塔攢資源，中期一次升滿電磁後期會輕鬆很多。",
        "前期多放回收炮塔攒资源，中期一次升满电磁后期会轻松很多。",
        "Stack salvage early, max EM mid game — late waves chill out."
      ),
      offsetHours: 32,
    },
    {
      author: player(3),
      content: loc(
        "螺旋軌道敵潮的視覺效果很震撼，環形升級槽位設計也很聰明。",
        "螺旋轨道敌潮的视觉效果很震撼，环形升级槽位设计也很聪明。",
        "Spiral track enemy waves look sick — ring upgrade slots are a smart design."
      ),
      offsetHours: 68,
    },
  ],
};
