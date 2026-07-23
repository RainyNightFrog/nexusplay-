import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const cards = {
  strike: { en: ["Void Strike", "Deal 6 damage"], es: ["Golpe del vacío", "Inflige 6 de daño"], "zh-CN": ["虚空打击", "造成 6 伤害"] },
  heavy: { en: ["Heavy Blow", "Deal 12 damage"], es: ["Golpe pesado", "Inflige 12 de daño"], "zh-CN": ["重锤一击", "造成 12 伤害"] },
  void_slash: { en: ["Void Slash", "8 dmg + Weak 1"], es: ["Corte del vacío", "8 daño + Débil 1"], "zh-CN": ["虚空斩", "8 伤 + 虚弱1"] },
  multi_hit: { en: ["Chain Slash", "4 damage ×3"], es: ["Corte en cadena", "4 daño ×3"], "zh-CN": ["连环斩", "3 次各 4 伤害"] },
  pierce: { en: ["Piercing Spear", "10 dmg, ignores block"], es: ["Lanza perforante", "10 daño, ignora escudo"], "zh-CN": ["穿透之矛", "10 伤，无视护盾"] },
  poison_dart: { en: ["Poison Dart", "4 dmg + Poison 3"], es: ["Dardo venenoso", "4 daño + Veneno 3"], "zh-CN": ["毒针", "4 伤 + 中毒3"] },
  combo_strike: { en: ["Combo Slash", "5 dmg; +8 if attacked this turn"], es: ["Corte combo", "5 daño; +8 si ya atacaste"], "zh-CN": ["连击斩", "5 伤；本回合已攻击+8"] },
  void_burst: { en: ["Void Burst", "18 damage"], es: ["Explosión del vacío", "18 de daño"], "zh-CN": ["虚空爆发", "18 伤害"] },
  drain: { en: ["Life Drain", "7 dmg, heal 5 HP"], es: ["Drenaje vital", "7 daño, cura 5 PV"], "zh-CN": ["生命汲取", "7 伤，回复 5 HP"] },
  shield: { en: ["Void Shield", "Gain 8 block"], es: ["Escudo del vacío", "Obtén 8 de escudo"], "zh-CN": ["虚空护盾", "获得 8 护盾"] },
  iron_wall: { en: ["Iron Wall", "Gain 15 block"], es: ["Muro de hierro", "Obtén 15 de escudo"], "zh-CN": ["铁壁结界", "获得 15 护盾"] },
  reflect: { en: ["Thorn Shield", "6 block + Thorns 4"], es: ["Escudo de espinas", "6 escudo + Espinas 4"], "zh-CN": ["荆棘护盾", "6 护盾 + 荆棘4"] },
  heal: { en: ["Abyss Heal", "Restore 8 HP"], es: ["Curación del abismo", "Recupera 8 PV"], "zh-CN": ["深渊治愈", "回复 8 HP"] },
  regen: { en: ["Regen Pulse", "Heal 4 + Regen 3"], es: ["Pulso regenerador", "Cura 4 + Regeneración 3"], "zh-CN": ["再生脉动", "回复 4 + 再生3"] },
  energy_surge: { en: ["Energy Surge", "+1 energy, draw 1"], es: ["Oleada de energía", "+1 energía, roba 1"], "zh-CN": ["能量涌动", "+1 能量，抽 1 牌"] },
  amplify: { en: ["Power Amp", "Next attack +50%"], es: ["Amplificador", "Próximo ataque +50%"], "zh-CN": ["力量增幅", "下张攻击 +50%"] },
  card_draw: { en: ["Void Draw", "Draw 2 cards"], es: ["Robo del vacío", "Roba 2 cartas"], "zh-CN": ["虚空抽牌", "抽 2 张牌"] },
  weaken: { en: ["Weak Curse", "Enemy Weak 2 turns"], es: ["Maldición débil", "Débil al enemigo 2 turnos"], "zh-CN": ["虚弱诅咒", "敌人虚弱 2 回合"] },
  void_shield: { en: ["Void Bulwark", "10 block; heal 4 if unhurt"], es: ["Baluarte del vacío", "10 escudo; cura 4 sin daño"], "zh-CN": ["虚空壁垒", "10 护盾；无伤回4"] },
  relay: { en: ["Relay Draw", "Draw 1; +2 if hand empty"], es: ["Robo en cadena", "Roba 1; +2 si mano vacía"], "zh-CN": ["接力抽牌", "抽 1；空手再抽2"] },
  void_cleave: { en: ["Void Cleave", "7 dmg; +6 if enemy blocked"], es: ["Hendidura del vacío", "7 daño; +6 si tiene escudo"], "zh-CN": ["虚空裂斩", "7 伤；敌有盾+6"] },
  doom_sigil: { en: ["Doom Sigil", "Apply Vulnerable 2"], es: ["Sello de ruina", "Aplica Vulnerable 2"], "zh-CN": ["破灭印记", "施加易伤 2"] },
  flame_edge: { en: ["Flame Edge", "5 dmg + Burn 3"], es: ["Filo ígneo", "5 daño + Quemadura 3"], "zh-CN": ["焰刃", "5 伤 + 燃烧3"] },
  execution: { en: ["Execution", "8 dmg; +14 if enemy <30% HP"], es: ["Ejecución", "8 daño; +14 si enemigo <30% PV"], "zh-CN": ["处决", "8 伤；敌<30%HP+14"] },
  rupture: { en: ["Shield Rupture", "Break block; 4 dmg per block"], es: ["Ruptura de escudo", "Rompe escudo; 4 daño por punto"], "zh-CN": ["护盾崩裂", "破盾；每点盾4伤"] },
  mirror_wall: { en: ["Mirror Wall", "10 block + Mirror 8"], es: ["Muro espejo", "10 escudo + Espejo 8"], "zh-CN": ["镜面壁垒", "10 盾 + 镜盾8"] },
  overclock: { en: ["Overclock", "+2 energy; self 3 dmg"], es: ["Sobrecarga", "+2 energía; 3 daño propio"], "zh-CN": ["超频超载", "+2 能量；自伤3"] },
  chain_relay: { en: ["Chain Pulse", "6 dmg; +10 if relay full"], es: ["Pulso en cadena", "6 daño; +10 si relay lleno"], "zh-CN": ["连锁脉冲", "6 伤；接力满+10"] },
  void_lance: { en: ["Void Lance", "12 dmg; +50% if Vulnerable"], es: ["Lanza del vacío", "12 daño; +50% si Vulnerable"], "zh-CN": ["虚空长枪", "12 伤；易伤+50%"] },
  void_orb: { en: ["Void Orb", "4 dmg ×2; draw 1"], es: ["Orbe del vacío", "4 daño ×2; roba 1"], "zh-CN": ["虚空法球", "4 伤×2；抽 1 牌"] },
  blood_pact: { en: ["Blood Pact", "10 dmg; self 4 HP"], es: ["Pacto de sangre", "10 daño; 4 PV propios"], "zh-CN": ["血契斩", "10 伤；自伤 4 HP"] },
  frost_bind: { en: ["Frost Bind", "6 block + Weak 1 + draw 1"], es: ["Atadura helada", "6 escudo + Débil 1 + roba 1"], "zh-CN": ["霜缚", "6 盾 + 虚弱1 + 抽1"] },
  void_echo: { en: ["Void Echo", "Each attack this turn +3 dmg"], es: ["Eco del vacío", "Cada ataque este turno +3 daño"], "zh-CN": ["虚空回响", "本回合每张攻击 +3 伤"] },
};

const enemies = {
  crawler: {
    en: ["Abyss Crawler", "Armored: alternates attack and defense", ["Claw 7", "Heavy 9", "Curl +8 block"]],
    es: ["Reptador del abismo", "Blindado: alterna ataque y defensa", ["Garra 7", "Golpe 9", "Enrollarse +8 escudo"]],
    "zh-CN": ["深渊爬行者", "厚甲生物：交替攻击与防御，节奏稳定", ["爪击 7", "重击 9", "蜷缩防御 +8"]],
  },
  wraith: {
    en: ["Spectral Wraith", "Grudge: often Weakens, then double-strikes", ["Ghost Claw 6", "Abyss Whisper (Weak 1)", "Twin Strike 5×2"]],
    es: ["Espectro vengativo", "Rencor: aplica Débil y doble golpe", ["Garra fantasmal 6", "Susurro del abismo (Débil 1)", "Doble sombra 5×2"]],
    "zh-CN": ["幽影怨灵", "怨念缠身：常施虚弱，并以双击压制", ["幽爪 6", "深渊低语（虚弱1）", "双影袭 5×2"]],
  },
  sentinel: {
    en: ["Void Sentinel", "Tactical: defend, buff, then ramp damage", ["Energy Shield +10", "Beam Cannon 8", "Overclock +2"]],
    es: ["Centinela del vacío", "Táctico: defiende, refuerza y escala daño", ["Escudo energético +10", "Cañón de rayos 8", "Sobrecarga +2"]],
    "zh-CN": ["虚空哨兵", "战术型敌人：先防御再强化，后续伤害递增", ["能量护盾 +10", "光束炮 8", "超频强化 +2"]],
  },
  leech: {
    en: ["Blood Leech", "Vampiric: heals on attack, hard to burst", ["Vampiric Claw 6 (heal 4)", "Rip 8", "Slime Layer +6"]],
    es: ["Sanguijuela", "Vampírico: cura al atacar", ["Garra vampírica 6 (cura 4)", "Desgarro 8", "Capa viscosa +6"]],
    "zh-CN": ["吸血水蛭", "嗜血：攻击时回复生命，难以速杀", ["吸血爪 6（回4）", "撕咬 8", "黏液护层 +6"]],
  },
  bomber: {
    en: ["Suicide Bug", "Last stand: second move self-destructs", ["Charge 5", "Self-destruct 14!"]],
    es: ["Insecto suicida", "Contraataque final: segunda acción explota", ["Embestida 5", "Autodestrucción 14!"]],
    "zh-CN": ["自爆虫", "临终反扑：第二动作会自爆造成高伤", ["冲撞 5", "自爆 14！"]],
  },
  moth: {
    en: ["Void Moth", "Toxic spread: poison on hit and mist", ["Toxic Claw 4 + Poison 3", "Poison Mist (Poison 2)", "Wing Rush 7"]],
    es: ["Polilla del vacío", "Tóxico: envenena al golpear", ["Garra tóxica 4 + Veneno 3", "Niebla venenosa (Veneno 2)", "Embate alado 7"]],
    "zh-CN": ["虚空毒蛾", "剧毒散布：攻击附毒并可喷洒毒雾", ["毒粉爪 4 + 中毒3", "毒雾喷洒（中毒2）", "振翅冲 7"]],
  },
  shade: {
    en: ["Shadow Assassin", "Fast combo: triple strike then kill shot", ["Shadow Triple 4×3", "Killing Intent +1", "Assassinate 11"]],
    es: ["Asesino sombrío", "Rápido: triple golpe y asesinato", ["Triple sombra 4×3", "Intención letal +1", "Asesinato 11"]],
    "zh-CN": ["暗影刺客", "高速连段：三连击后暗杀一击", ["影刃三连 4×3", "杀意凝聚 +1", "暗杀 11"]],
  },
  stalker: {
    en: ["Abyss Stalker", "Hunter: +3 attack when player below 50% HP", ["Pounce 8", "Armor Rend (Vulnerable 1)", "Twin Claws 6×2"]],
    es: ["Acechador del abismo", "Cazador: +3 ataque si jugador <50% PV", ["Embestida 8", "Desgarro (Vulnerable 1)", "Garras dobles 6×2"]],
    "zh-CN": ["深渊潜猎者", "猎杀本能：玩家 HP 低于 50% 时攻击 +3", ["扑击 8", "破甲撕扯（易伤1）", "双爪 6×2"]],
  },
  herald: {
    en: ["Void Herald", "Boss: void shield, twin cleave, abyss gaze", ["Void Shield +15", "Void Cleave 10", "Abyss Gaze (Weak 2)", "Twin Cleave 8×2", "Void Storm 16"]],
    es: ["Heraldo del vacío", "Jefe: escudo, corte doble y mirada", ["Escudo del vacío +15", "Corte del vacío 10", "Mirada del abismo (Débil 2)", "Corte doble 8×2", "Tormenta del vacío 16"]],
    "zh-CN": ["虚空先驱", "首领：虚空护盾 + 双重裂斩 + 深渊凝视", ["虚空护盾 +15", "虚空裂斩 10", "深渊凝视（虚弱2）", "双重裂斩 8×2", "虚空风暴 16"]],
  },
  titan: {
    en: ["Abyss Titan", "Boss: heavy block, stomp combo, doomsday hit", ["Crush 12", "Petrify +20", "Rage +3", "Stomp 8×2", "Doom Strike 22"]],
    es: ["Titán del abismo", "Jefe: alta defensa y golpe final", ["Aplastamiento 12", "Petrificación +20", "Ira +3", "Pisotón 8×2", "Golpe del juicio 22"]],
    "zh-CN": ["深渊巨像", "首领：高防御 + 践踏多段 + 末日一击", ["粉碎 12", "石化 +20", "怒意 +3", "践踏 8×2", "末日一击 22"]],
  },
  queen: {
    en: ["Void Queen", "Boss: poison, drain, whip combo", ["Toxic Kiss (Poison 4)", "Drain Touch 7 (heal 7)", "Queen Shield +12", "Whip 6×3", "Void Judgment 18"]],
    es: ["Reina del vacío", "Jefa: veneno, drenaje y látigo", ["Beso tóxico (Veneno 4)", "Toque drenador 7 (cura 7)", "Escudo real +12", "Látigo 6×3", "Juicio del vacío 18"]],
    "zh-CN": ["虚空女皇", "首领：剧毒 + 吸血 + 鞭挞连段", ["剧毒之吻（中毒4）", "吸血之触 7（回7）", "女皇护盾 +12", "鞭挞 6×3", "虚空审判 18"]],
  },
};

function ui(locale) {
  const en = locale === "en";
  const es = locale === "es";
  const cn = locale === "zh-CN";
  return {
    htmlLang: en ? "en" : es ? "es" : "zh-Hans",
    badge: "VOID RELAY · ROGUELIKE",
    title: en ? "Void Relay: Card Descent" : es ? "Void Relay: Card Descent" : "虚空接力：卡牌深渊",
    sub: en
      ? "Void Relay: Card Descent<br>Descend the abyss with cards. Boss every 5 floors. Reach floor 15 to win."
      : es
        ? "Void Relay: Card Descent<br>Desciende al abismo con cartas. Jefe cada 5 pisos. Llega al piso 15 para ganar."
        : "Void Relay: Card Descent<br>深入虚空深渊，以卡牌对决敌意。每五层遭遇首领，收集卡牌强化牌组，抵达第 15 层即胜利。",
    bestFloor: en ? "Best Floor" : es ? "Mejor piso" : "最佳层数",
    bestScore: en ? "Best Score" : es ? "Mejor puntuación" : "最高得分",
    bestGrade: en ? "Best Grade" : es ? "Mejor nota" : "最佳评级",
    difficulty: en ? "Difficulty" : es ? "Dificultad" : "难度",
    diffEasy: en ? "Easy" : es ? "Fácil" : "简单",
    diffNormal: en ? "Normal" : es ? "Normal" : "普通",
    diffHard: en ? "Hard" : es ? "Difícil" : "困难",
    start: en ? "▶ Begin the Descent" : es ? "▶ Comenzar descenso" : "▶ 开始深渊之旅",
    help: en ? "? How to Play" : es ? "? Cómo jugar" : "？ 玩法说明",
    leaderboard: en ? "🏆 Leaderboard" : es ? "🏆 Clasificación" : "🏆 排行榜",
    leave: en ? "← Back to Platform" : es ? "← Volver a la plataforma" : "← 返回平台",
    helpTitle: en ? "How to Play" : es ? "Cómo jugar" : "玩法说明",
    helpClose: en ? "Close" : es ? "Cerrar" : "关闭",
    back: en ? "Back" : es ? "Volver" : "返回",
    lbTitle: en ? "Leaderboard" : es ? "Clasificación" : "排行榜",
    lbSub: en ? "Best abyss runs" : es ? "Mejores descensos al abismo" : "深渊探索最高纪录",
    loading: en ? "Loading…" : es ? "Cargando…" : "载入中…",
    hudFloor: en ? "Floor" : es ? "Piso" : "层数",
    hudHp: en ? "HP" : es ? "PV" : "生命",
    hudEnergy: en ? "Energy" : es ? "Energía" : "能量",
    hudBlock: en ? "Block" : es ? "Escudo" : "护盾",
    hudScore: en ? "Score" : es ? "Puntos" : "得分",
    hudTurn: en ? "Turn" : es ? "Turno" : "回合",
    pause: en ? "⏸ Pause" : es ? "⏸ Pausa" : "⏸ 暂停",
    resume: en ? "▶ Resume" : es ? "▶ Reanudar" : "▶ 继续",
    gameLb: en ? "🏆 Rank" : es ? "🏆 Rango" : "🏆 排行",
    gameHelp: en ? "? Help" : es ? "? Ayuda" : "？ 说明",
    quit: en ? "✕ Forfeit" : es ? "✕ Rendirse" : "✕ 放弃",
    leaveGame: en ? "← Leave" : es ? "← Salir" : "← 离开",
    relay: en ? "Relay" : es ? "Cadena" : "接力",
    relayHint: en ? "Same×3" : es ? "Igual×3" : "同类×3",
    relaySurgeBanner: "VOID SURGE!",
    playerRole: en ? "VOID WALKER · Ally" : es ? "VOID WALKER · Aliado" : "VOID WALKER · 我方",
    enemyRole: en ? "VOID HOSTILE · Foe" : es ? "VOID HOSTILE · Enemigo" : "VOID HOSTILE · 敌方",
    playerName: en ? "◈ Void Walker" : es ? "◈ Caminante del vacío" : "◈ 虚空行者",
    playerTrait: en
      ? "Void Relay: 3 same-type cards in a row trigger a surge bonus"
      : es
        ? "Cadena del vacío: 3 cartas del mismo tipo activan un pulso"
        : "虚空接力：连续 3 张同类型卡牌触发脉冲加成",
    strength: en ? "Strength" : es ? "Fuerza" : "力量",
    block: en ? "Block" : es ? "Escudo" : "护盾",
    hand: en ? "Hand" : es ? "Mano" : "手牌",
    level: en ? "Level" : es ? "Nivel" : "等级",
    turnPlayer: en ? "Your turn" : es ? "Tu turno" : "你的回合",
    turnPlayerN: en ? "Your turn · Turn {n}" : es ? "Tu turno · Turno {n}" : "你的回合 · 第 {n} 回合",
    turnEnemy: en ? "Enemy turn" : es ? "Turno enemigo" : "敌方回合",
    intentReady: en ? "Preparing to attack…" : es ? "Preparando ataque…" : "准备攻击…",
    nextTurn: en ? "Next turn:" : es ? "Próximo turno:" : "下回合：",
    deckInfo: en ? "Deck {deck} · Discard {discard} · Hand {hand}" : es ? "Mazo {deck} · Descarte {discard} · Mano {hand}" : "牌组 {deck} · 弃牌 {discard} · 手牌 {hand}",
    endTurn: en ? "End Turn ▶" : es ? "Fin del turno ▶" : "结束回合 ▶",
    draftTitle: en ? "✦ Void Gift — Pick a card" : es ? "✦ Regalo del vacío — Elige una carta" : "✦ 虚空馈赠 — 选择一张卡牌",
    draftSub: en ? "The abyss rewards your victory with new power" : es ? "El abismo premia tu victoria con nuevo poder" : "深渊认可你的胜利，赠予新力量",
    restTitle: en ? "◈ Void Camp — Choose an upgrade" : es ? "◈ Campamento del vacío — Elige una mejora" : "◈ 虚空营地 — 选择一项强化",
    restSub: en ? "A brief rest — the abyss still watches" : es ? "Un breve descanso — el abismo te observa" : "短暂喘息，深渊仍注视着你",
    restHeal: en ? "💚 Abyss Heal (restore 25% HP)" : es ? "💚 Curación del abismo (25% PV)" : "💚 深渊治愈（回复 25% HP）",
    restUpgrade: en ? "📈 Deck Refine (upgrade 1 random card)" : es ? "📈 Refinar mazo (mejora 1 carta al azar)" : "📈 牌组精炼（随机升级 1 张牌）",
    restMaxHp: en ? "❤ Void Brand (max HP +8)" : es ? "❤ Marca del vacío (PV máx. +8)" : "❤ 虚空烙印（最大 HP +8）",
    resultWin: en ? "🏆 Abyss Conquered!" : es ? "🏆 ¡Abismo conquistado!" : "🏆 深渊征服！",
    resultLose: en ? "💀 The Abyss Claims You" : es ? "💀 El abismo te reclama" : "💀 深渊吞噬了你",
    resultMsgWin: en
      ? "You reached floor {n} and defeated the final boss! The void yields."
      : es
        ? "¡Llegaste al piso {n} y venciste al jefe final! El vacío cede."
        : "你抵达第 {n} 层并击败最终首领！虚空为你让路。",
    resultMsgLose: en
      ? "You fell on floor {n}. The abyss remembers your name."
      : es
        ? "Caíste en el piso {n}. El abismo recuerda tu nombre."
        : "在第 {n} 层倒下。深渊记住了你的名字。",
    resFloor: en ? "Floor reached" : es ? "Piso alcanzado" : "到达层数",
    resScore: en ? "Total score" : es ? "Puntuación total" : "总得分",
    resDeck: en ? "Deck size" : es ? "Tamaño del mazo" : "牌组大小",
    retry: en ? "Descend Again" : es ? "Descender de nuevo" : "再战深渊",
    menu: en ? "Main Menu" : es ? "Menú principal" : "主选单",
    confirmQuit: en
      ? "Forfeit this run? Progress may not be saved."
      : es
        ? "¿Rendir esta partida? El progreso puede no guardarse."
        : "确定放弃本局？进度可能尚未保存。",
    typeAttack: en ? "Attack" : es ? "Ataque" : "攻击",
    typeSkill: en ? "Skill" : es ? "Habilidad" : "技能",
    typePower: en ? "Power" : es ? "Poder" : "能力",
    typeAttackCard: en ? "Attack card" : es ? "Carta de ataque" : "攻击牌",
    typeSkillCard: en ? "Skill card" : es ? "Carta de habilidad" : "技能牌",
    typePowerCard: en ? "Power card" : es ? "Carta de poder" : "能力牌",
    rarityCommon: en ? "Common" : es ? "Común" : "普通",
    rarityUncommon: en ? "Uncommon" : es ? "Poco común" : "稀有",
    rarityRare: en ? "Legendary" : es ? "Legendario" : "传说",
    rarityMarkRare: en ? "★ Legendary" : es ? "★ Legendario" : "★ 传说",
    rarityMarkUncommon: en ? "◆ Rare" : es ? "◆ Raro" : "◆ 稀有",
    costLabel: en ? "Cost" : es ? "Coste" : "费用",
    floorBanner: en ? "FLOOR {n}" : es ? "PISO {n}" : "FLOOR {n}",
    floorBoss: en ? "⚠ BOSS · FLOOR {n}" : es ? "⚠ JEFE · PISO {n}" : "⚠ BOSS · FLOOR {n}",
    elitePrefix: en ? "Elite·" : es ? "Élite·" : "精英·",
    noTrait: en ? "No special ability" : es ? "Sin habilidad especial" : "无特殊能力",
    statusWeak: en ? "Weak" : es ? "Débil" : "虚弱",
    statusVuln: en ? "Vulnerable" : es ? "Vulnerable" : "易伤",
    statusPoison: en ? "Poison" : es ? "Veneno" : "中毒",
    statusBurn: en ? "Burn" : es ? "Quemadura" : "燃烧",
    statusRegen: en ? "Regen" : es ? "Regeneración" : "再生",
    statusThorns: en ? "Thorns" : es ? "Espinas" : "荆棘",
    statusMirror: en ? "Mirror" : es ? "Espejo" : "镜盾",
    statusAmplify: en ? "Amp" : es ? "Amplif." : "增幅",
    statusEcho: en ? "Echo" : es ? "Eco" : "回响",
    statusBlock: en ? "Block" : es ? "Escudo" : "护盾",
    statusStrength: en ? "Strength" : es ? "Fuerza" : "力量",
    statusEnraged: en ? "Enraged" : es ? "Enfurecido" : "狂暴",
    statusElite: en ? "Elite" : es ? "Élite" : "精英",
    strengthAmp: en ? " +Amp" : es ? " +Amplif." : " +增",
    relaySurgeAttack: en ? "Void Slash!" : es ? "¡Corte del vacío!" : "虚空斩击！",
    relaySurgeSkill: en ? "Void Flow!" : es ? "¡Flujo del vacío!" : "虚空涌流！",
    relaySurgePower: en ? "Void Resonance!" : es ? "¡Resonancia del vacío!" : "虚空共鸣！",
    logRelay: en ? "Void Relay: {label}" : es ? "Cadena del vacío: {label}" : "虚空接力：{label}",
    logRupture: en ? "Rupture {n} block" : es ? "Ruptura {n} escudo" : "崩裂 {n} 护盾",
    logOverclock: en ? "Overclock +2 energy" : es ? "Sobrecarga +2 energía" : "超频 +2 能量",
    logPoison: en ? "Poison -{n}" : es ? "Veneno -{n}" : "中毒 -{n}",
    logEnemyPoison: en ? "Enemy poison -{n}" : es ? "Veneno enemigo -{n}" : "敌人中毒 -{n}",
    logBurn: en ? "Burn -{n}" : es ? "Quemadura -{n}" : "燃烧 -{n}",
    logEnemyBurn: en ? "Enemy burn -{n}" : es ? "Quemadura enemiga -{n}" : "敌人燃烧 -{n}",
    logRegen: en ? "Regen +{n}" : es ? "Regeneración +{n}" : "再生 +{n}",
    logCritDeal: en ? "Crit {n} damage" : es ? "Crítico {n} daño" : "暴击 造成 {n} 伤害",
    logDeal: en ? "Dealt {n} damage" : es ? "Infligido {n} daño" : "造成 {n} 伤害",
    logMirror: en ? "Mirror reflect {n}" : es ? "Espejo refleja {n}" : "镜盾反弹 {n}",
    logTaken: en ? "Took {n} damage" : es ? "Recibido {n} daño" : "受到 {n} 伤害",
    logThorns: en ? "Thorns reflect {n}" : es ? "Espinas reflejan {n}" : "荆棘反弹 {n}",
    logBossEnrage: en ? "Boss enraged! Attack +2" : es ? "¡Jefe enfurecido! Ataque +2" : "首领狂暴！攻击 +2",
    logHeal: en ? "Healed {n} HP" : es ? "Curado {n} PV" : "回复 {n} HP",
    logBlock: en ? "Gained {n} block" : es ? "Obtuvo {n} escudo" : "获得 {n} 护盾",
    logYourTurn: en ? "— Your turn —" : es ? "— Tu turno —" : "— 你的回合 —",
    logEnemyHeal: en ? "Enemy healed {n}" : es ? "Enemigo curado {n}" : "敌人回复 {n}",
    logEnemyDefend: en ? "Enemy block +{n}" : es ? "Escudo enemigo +{n}" : "敌人防御 +{n}",
    logEnemyBuff: en ? "Enemy buff +{n}" : es ? "Refuerzo enemigo +{n}" : "敌人强化 +{n}",
    logEnemyDebuff: en ? "Enemy applied {effect}" : es ? "Enemigo aplicó {effect}" : "敌人施加 {effect}",
    logDefeat: en ? "Enemy defeated! +{n} pts" : es ? "¡Enemigo derrotado! +{n} pts" : "击败敌人！+{n} 分",
    logNoUpgrade: en ? "No cards to upgrade" : es ? "No hay cartas para mejorar" : "牌组无可升级卡牌",
    logUpgrade: en ? "Refined card: {name}" : es ? "Carta refinada: {name}" : "精炼卡牌：{name}",
    logMaxHp: en ? "Max HP +8" : es ? "PV máx. +8" : "最大 HP +8",
    upgradeSuffix: en ? " (Refined +2)" : es ? " (Refinado +2)" : "（精炼+2）",
    helpHtml: buildHelpHtml(locale),
  };
}

function buildHelpHtml(locale) {
  if (locale === "en") {
    return `<h3>Goal</h3><ul><li>Descend from floor 1 to 15 and defeat the final boss to win.</li><li>If HP reaches 0, the run ends — best floor and score are recorded.</li></ul><h3>Combat</h3><ul><li>Gain <b>3 energy</b> each turn; hand limit 5 cards.</li><li>Click cards to spend energy; after End Turn the enemy acts on its intent.</li><li>Block absorbs damage and clears at end of turn.</li><li>Enemy shows <b>this turn's intent</b>, <b>next turn preview</b>, and a trait.</li><li>Every 4 floors: <b>elite enemies</b> (more HP and strength).</li><li>Every 3 floors or after a boss: <b>Void Camp</b> — heal, refine a card, or raise max HP.</li><li><b>Void Relay</b>: play 3 same-type cards in a row for a surge (bonus damage and draw).</li><li>Statuses: <b>Vulnerable</b> (+50% damage taken), <b>Burn</b> (decaying damage), <b>Mirror</b> (reflect damage).</li><li>Bosses below 50% HP become <b>Enraged</b> with permanent +attack.</li></ul><h3>Card Types</h3><ul><li><b>Attack</b>: deal damage</li><li><b>Skill</b>: block, heal, draw, weaken, etc.</li><li><b>Power</b>: ongoing effects (regen, amp, thorns)</li></ul><h3>Descent</h3><ul><li>After each floor, pick 1 of 3 random cards for your deck.</li><li>Every <b>5 floors</b>: powerful boss with special abilities.</li><li>Enemy variety: drain, poison, weaken, combos, self-destruct, and more.</li></ul><h3>Difficulty</h3><ul><li><b>Easy</b>: lower enemy HP and damage</li><li><b>Normal</b>: standard balance</li><li><b>Hard</b>: tougher enemies, higher score bonus</li></ul>`;
  }
  if (locale === "es") {
    return `<h3>Objetivo</h3><ul><li>Desciende del piso 1 al 15 y vence al jefe final.</li><li>Si tus PV llegan a 0, termina la partida; se guarda el mejor piso y puntuación.</li></ul><h3>Combate</h3><ul><li>Ganas <b>3 de energía</b> por turno; límite de 5 cartas en mano.</li><li>Haz clic en cartas para gastar energía; al terminar el turno el enemigo actúa según su intención.</li><li>El escudo absorbe daño y se borra al final del turno.</li><li>El enemigo muestra <b>intención actual</b>, <b>aviso del próximo turno</b> y rasgo.</li><li>Cada 4 pisos: <b>enemigos élite</b> (más PV y fuerza).</li><li>Cada 3 pisos o tras un jefe: <b>Campamento del vacío</b> — curar, refinar carta o subir PV máx.</li><li><b>Cadena del vacío</b>: 3 cartas del mismo tipo seguidas activan un pulso (daño extra y robo).</li><li>Estados: <b>Vulnerable</b> (+50% daño recibido), <b>Quemadura</b> (daño decreciente), <b>Espejo</b> (refleja daño).</li><li>Jefes bajo 50% PV entran en <b>Furia</b> con +ataque permanente.</li></ul><h3>Tipos de carta</h3><ul><li><b>Ataque</b>: inflige daño</li><li><b>Habilidad</b>: escudo, cura, robo, debilitar, etc.</li><li><b>Poder</b>: efectos persistentes (regeneración, amplificador, espinas)</li></ul><h3>Descenso</h3><ul><li>Tras cada piso, elige 1 de 3 cartas aleatorias.</li><li>Cada <b>5 pisos</b>: jefe poderoso con habilidades especiales.</li><li>Variedad enemiga: drenaje, veneno, debilidad, combos, autodestrucción, etc.</li></ul><h3>Dificultad</h3><ul><li><b>Fácil</b>: menos PV y daño enemigo</li><li><b>Normal</b>: equilibrio estándar</li><li><b>Difícil</b>: enemigos más fuertes, bonus de puntuación mayor</li></ul>`;
  }
  return `<h3>目标</h3><ul><li>从第 1 层深入至第 15 层，击败最终首领即胜利。</li><li>生命值归零则本局结束，记录最高层数与得分。</li></ul><h3>战斗</h3><ul><li>每回合获得 <b>3 点能量</b>，手牌上限 5 张。</li><li>点击卡牌消耗能量打出，结束回合后敌人依「意图」行动。</li><li>护盾可抵挡伤害，回合结束时护盾清零。</li><li>敌人头上显示<b>本回合意图</b>与<b>下回合预告</b>，并有特性说明。</li><li>每 4 层出现<b>精英敌人</b>（更高 HP 与力量）。</li><li>每 3 层或击败首领后可进入<b>虚空营地</b>：治愈、精炼卡牌或提升最大 HP。</li><li><b>虚空接力</b>：连续打出 3 张同类型卡牌触发虚空脉冲（额外伤害与抽牌）。</li><li>新状态：<b>易伤</b>（受击+50%）、<b>燃烧</b>（递减灼伤）、<b>镜盾</b>（反弹伤害）。</li><li>首领生命低于 50% 会<b>狂暴</b>，永久提升攻击力。</li></ul><h3>卡牌类型</h3><ul><li><b>攻击</b>：造成伤害</li><li><b>技能</b>：护盾、治疗、抽牌、虚弱等辅助</li><li><b>能力</b>：持续效果（再生、增幅、荆棘等）</li></ul><h3>深渊机制</h3><ul><li>每层胜利后从 3 张随机卡牌中选 1 张加入牌组。</li><li>每 <b>5 层</b> 遭遇强力首领，具特殊能力。</li><li>敌人类种各异：吸血、中毒、虚弱、连击、自爆等。</li></ul><h3>难度</h3><ul><li><b>简单</b>：敌人生命与伤害降低</li><li><b>普通</b>：标准平衡</li><li><b>困难</b>：敌人更强，得分加成更高</li></ul>`;
}

function buildLocalePack(locale) {
  const pack = ui(locale);
  pack.cards = {};
  for (const [id, loc] of Object.entries(cards)) {
    const [name, desc] = loc[locale];
    pack.cards[id] = { name, desc };
  }
  pack.enemies = {};
  for (const [id, loc] of Object.entries(enemies)) {
    const [name, trait, intents] = loc[locale];
    pack.enemies[id] = { name, trait, intents };
  }
  return pack;
}

const pack = {
  en: buildLocalePack("en"),
  es: buildLocalePack("es"),
  "zh-CN": buildLocalePack("zh-CN"),
};

const out = path.join(__dirname, "..", "public", "sdk", "_void-relay-pack-snippet.json");
fs.writeFileSync(out, JSON.stringify(pack, null, 2), "utf8");
console.log("Wrote", out);
