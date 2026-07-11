/**
 * Patch homepage filter/tag/price i18n keys across all locales.
 * Usage: node scripts/patch-home-filter-i18n.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dir = resolve(process.cwd(), "messages");

const PATCHES = {
  "zh-CN": {
    tagFilterLabel: "热门游戏标签",
    tagFilterExpand: "展开全部标签",
    tagFilterCollapse: "收起标签",
    tagFilterClear: "清除 {count} 个",
    tagFilterSelectedHint:
      "已选 {count} 个标签 · 需同时符合所有已选标签",
    tagGroupArtStyle: "美术风格",
    tagGroupGameplay: "玩法机制",
    tagGroupPlayMode: "游玩方式",
    tagGroupPerspective: "视角与维度",
    tagGroupMood: "氛围与受众",
    gridDescTags: "标签：{tags} · 按「{sort}」排序",
    gridDescCategoryTags: "「{category}」· 标签：{tags} · {sort}",
    emptyTags: "没有符合所选标签的游戏",
    emptyHintTags: "试试减少标签或清除筛选。",
    viewAllTags: "清除标签筛选",
  },
  ja: {
    tagFilterLabel: "ゲームタグ",
    tagFilterExpand: "すべてのタグを表示",
    tagFilterCollapse: "タグを折りたたむ",
    tagFilterClear: "{count} 件をクリア",
    tagFilterSelectedHint:
      "{count} 個のタグを選択 · すべてのタグに一致するゲームを表示",
    tagGroupArtStyle: "アートスタイル",
    tagGroupGameplay: "ゲームプレイの仕組み",
    tagGroupPlayMode: "プレイモード",
    tagGroupPerspective: "視点と次元",
    tagGroupMood: "雰囲気と聴衆",
    priceFilterTitle: "価格フィルター",
    priceFilter: {
      all: "すべてのゲーム",
      free: "無料ゲーム",
      under_5: "$5 以下",
      under_15: "$15 以下",
      on_sale: "セール中",
    },
    gridDescPrice: "価格：{price} · 「{sort}」で並べ替え",
    gridDescCategoryPrice: "「{category}」· {price} · {sort}",
    gridDescTags: "タグ：{tags} · {sort}",
    gridDescCategoryTags: "「{category}」· タグ：{tags} · {sort}",
    emptyPrice: "「{price}」に一致するゲームはありません",
    emptyTags: "選択したタグに一致するゲームはありません",
    emptyHintTags: "タグを減らすか、フィルターを解除してください。",
    viewAllTags: "タグフィルターを解除",
    emptyHintPrice: "別の価格帯を試すか、フィルターを解除してください。",
    viewAllPrices: "すべての価格を表示",
  },
  ko: {
    tagFilterLabel: "게임 태그",
    tagFilterExpand: "모든 태그 보기",
    tagFilterCollapse: "태그 접기",
    tagFilterClear: "{count}개 지우기",
    tagFilterSelectedHint:
      "{count}개 태그 선택 · 모든 선택 태그와 일치하는 게임",
    tagGroupArtStyle: "아트 스타일",
    tagGroupGameplay: "게임플레이 역학",
    tagGroupPlayMode: "플레이 모드",
    tagGroupPerspective: "관점 및 차원",
    tagGroupMood: "분위기 및 청중",
    priceFilterTitle: "가격 필터",
    priceFilter: {
      all: "모든 게임",
      free: "무료 게임",
      under_5: "$5 이하",
      under_15: "$15 이하",
      on_sale: "할인 중",
    },
    gridDescPrice: "가격: {price} · 「{sort}」기준 정렬",
    gridDescCategoryPrice: "「{category}」· {price} · {sort}",
    gridDescTags: "태그: {tags} · {sort}",
    gridDescCategoryTags: "「{category}」· 태그: {tags} · {sort}",
    emptyPrice: "「{price}」에 맞는 게임이 없습니다",
    emptyTags: "선택한 태그에 맞는 게임이 없습니다",
    emptyHintTags: "태그를 줄이거나 필터를 해제해 보세요.",
    viewAllTags: "태그 필터 해제",
    emptyHintPrice: "다른 가격대를 시도하거나 필터를 해제하세요.",
    viewAllPrices: "모든 가격 보기",
  },
  es: {
    tagFilterLabel: "Etiquetas de juegos",
    tagFilterExpand: "Mostrar todas las etiquetas",
    tagFilterCollapse: "Contraer etiquetas",
    tagFilterClear: "Borrar {count}",
    tagFilterSelectedHint:
      "{count} etiqueta(s) seleccionada(s) · los juegos deben coincidir con todas",
    tagGroupArtStyle: "Estilo artístico",
    tagGroupGameplay: "Mecánica de juego",
    tagGroupPlayMode: "Modo de juego",
    tagGroupPerspective: "Perspectiva y dimensión",
    tagGroupMood: "Ambiente y audiencia",
    priceFilterTitle: "Filtro de precio",
    priceFilter: {
      all: "Todos los juegos",
      free: "Juegos gratis",
      under_5: "$5 o menos",
      under_15: "$15 o menos",
      on_sale: "En oferta",
    },
    gridDescPrice: "Precio: {price} · ordenado por \"{sort}\"",
    gridDescCategoryPrice: "\"{category}\" · {price} · {sort}",
    gridDescTags: "Etiquetas: {tags} · {sort}",
    gridDescCategoryTags: "\"{category}\" · Etiquetas: {tags} · {sort}",
    emptyPrice: "Ningún juego coincide con \"{price}\"",
    emptyTags: "Ningún juego coincide con las etiquetas seleccionadas",
    emptyHintTags: "Prueba con menos etiquetas o borra el filtro.",
    viewAllTags: "Borrar filtro de etiquetas",
    emptyHintPrice: "Prueba otro rango de precio o borra el filtro.",
    viewAllPrices: "Ver todos los precios",
  },
  fr: {
    tagFilterLabel: "Tags de jeux",
    tagFilterExpand: "Afficher tous les tags",
    tagFilterCollapse: "Réduire les tags",
    tagFilterClear: "Effacer {count}",
    tagFilterSelectedHint:
      "{count} tag(s) sélectionné(s) · les jeux doivent correspondre à tous les tags",
    tagGroupArtStyle: "Style artistique",
    tagGroupGameplay: "Mécanismes de jeu",
    tagGroupPlayMode: "Mode de jeu",
    tagGroupPerspective: "Perspective et dimension",
    tagGroupMood: "Ambiance et public",
    priceFilterTitle: "Filtre de prix",
    priceFilter: {
      all: "Tous les jeux",
      free: "Jeux gratuits",
      under_5: "5 $ ou moins",
      under_15: "15 $ ou moins",
      on_sale: "En promotion",
    },
    gridDescPrice: "Prix : {price} · trié par \"{sort}\"",
    gridDescCategoryPrice: "\"{category}\" · {price} · {sort}",
    gridDescTags: "Tags : {tags} · {sort}",
    gridDescCategoryTags: "\"{category}\" · Tags : {tags} · {sort}",
    emptyPrice: "Aucun jeu ne correspond à \"{price}\"",
    emptyTags: "Aucun jeu ne correspond aux tags sélectionnés",
    emptyHintTags: "Essayez moins de tags ou effacez le filtre.",
    viewAllTags: "Effacer le filtre de tags",
    emptyHintPrice: "Essayez une autre fourchette de prix ou effacez le filtre.",
    viewAllPrices: "Voir tous les prix",
  },
  de: {
    tagFilterLabel: "Spiel-Tags",
    tagFilterExpand: "Alle Tags anzeigen",
    tagFilterCollapse: "Tags einklappen",
    tagFilterClear: "{count} löschen",
    tagFilterSelectedHint:
      "{count} Tag(s) ausgewählt · Spiele müssen allen ausgewählten Tags entsprechen",
    tagGroupArtStyle: "Kunststil",
    tagGroupGameplay: "Spielmechanik",
    tagGroupPlayMode: "Spielmodus",
    tagGroupPerspective: "Perspektive und Dimension",
    tagGroupMood: "Stimmung & Publikum",
    priceFilterTitle: "Preisfilter",
    priceFilter: {
      all: "Alle Spiele",
      free: "Kostenlose Spiele",
      under_5: "5 $ oder weniger",
      under_15: "15 $ oder weniger",
      on_sale: "Im Angebot",
    },
    gridDescPrice: "Preis: {price} · sortiert nach \"{sort}\"",
    gridDescCategoryPrice: "\"{category}\" · {price} · {sort}",
    gridDescTags: "Tags: {tags} · {sort}",
    gridDescCategoryTags: "\"{category}\" · Tags: {tags} · {sort}",
    emptyPrice: "Keine Spiele entsprechen \"{price}\"",
    emptyTags: "Keine Spiele entsprechen den ausgewählten Tags",
    emptyHintTags: "Weniger Tags wählen oder Filter löschen.",
    viewAllTags: "Tag-Filter löschen",
    emptyHintPrice: "Anderen Preisbereich wählen oder Filter löschen.",
    viewAllPrices: "Alle Preise anzeigen",
  },
  pt: {
    tagFilterLabel: "Tags de jogos",
    tagFilterExpand: "Mostrar todas as tags",
    tagFilterCollapse: "Recolher tags",
    tagFilterClear: "Limpar {count}",
    tagFilterSelectedHint:
      "{count} tag(s) selecionada(s) · os jogos devem corresponder a todas as tags",
    tagGroupArtStyle: "Estilo de arte",
    tagGroupGameplay: "Mecânica de jogo",
    tagGroupPlayMode: "Modo de jogo",
    tagGroupPerspective: "Perspectiva e dimensão",
    tagGroupMood: "Humor e público",
    priceFilterTitle: "Filtro de preço",
    priceFilter: {
      all: "Todos os jogos",
      free: "Jogos gratuitos",
      under_5: "$5 ou menos",
      under_15: "$15 ou menos",
      on_sale: "Em promoção",
    },
    gridDescPrice: "Preço: {price} · ordenado por \"{sort}\"",
    gridDescCategoryPrice: "\"{category}\" · {price} · {sort}",
    gridDescTags: "Tags: {tags} · {sort}",
    gridDescCategoryTags: "\"{category}\" · Tags: {tags} · {sort}",
    emptyPrice: "Nenhum jogo corresponde a \"{price}\"",
    emptyTags: "Nenhum jogo corresponde às tags selecionadas",
    emptyHintTags: "Tente menos tags ou limpe o filtro.",
    viewAllTags: "Limpar filtro de tags",
    emptyHintPrice: "Tente outra faixa de preço ou limpe o filtro.",
    viewAllPrices: "Ver todos os preços",
  },
  th: {
    tagFilterLabel: "แท็กเกม",
    tagFilterExpand: "แสดงแท็กทั้งหมด",
    tagFilterCollapse: "ย่อแท็ก",
    tagFilterClear: "ล้าง {count}",
    tagFilterSelectedHint:
      "เลือก {count} แท็ก · เกมต้องตรงกับแท็กที่เลือกทั้งหมด",
    tagGroupArtStyle: "สไตล์ศิลปะ",
    tagGroupGameplay: "กลไกการเล่นเกม",
    tagGroupPlayMode: "โหมดการเล่น",
    tagGroupPerspective: "มุมมองและมิติ",
    tagGroupMood: "อารมณ์และผู้ชม",
    priceFilterTitle: "ตัวกรองราคา",
    priceFilter: {
      all: "เกมทั้งหมด",
      free: "เกมฟรี",
      under_5: "ไม่เกิน $5",
      under_15: "ไม่เกิน $15",
      on_sale: "ลดราคา",
    },
    gridDescPrice: "ราคา: {price} · เรียงตาม \"{sort}\"",
    gridDescCategoryPrice: "\"{category}\" · {price} · {sort}",
    gridDescTags: "แท็ก: {tags} · {sort}",
    gridDescCategoryTags: "\"{category}\" · แท็ก: {tags} · {sort}",
    emptyPrice: "ไม่มีเกมที่ตรงกับ \"{price}\"",
    emptyTags: "ไม่มีเกมที่ตรงกับแท็กที่เลือก",
    emptyHintTags: "ลองลดแท็กหรือล้างตัวกรอง",
    viewAllTags: "ล้างตัวกรองแท็ก",
    emptyHintPrice: "ลองช่วงราคาอื่นหรือล้างตัวกรอง",
    viewAllPrices: "ดูราคาทั้งหมด",
  },
  vi: {
    tagFilterLabel: "Thẻ game",
    tagFilterExpand: "Hiện tất cả thẻ",
    tagFilterCollapse: "Thu gọn thẻ",
    tagFilterClear: "Xóa {count}",
    tagFilterSelectedHint:
      "Đã chọn {count} thẻ · game phải khớp tất cả thẻ đã chọn",
    tagGroupArtStyle: "Phong cách nghệ thuật",
    tagGroupGameplay: "Cơ chế chơi",
    tagGroupPlayMode: "Chế độ chơi",
    tagGroupPerspective: "Góc nhìn & chiều không gian",
    tagGroupMood: "Không khí & đối tượng",
    priceFilterTitle: "Lọc giá",
    priceFilter: {
      all: "Tất cả game",
      free: "Game miễn phí",
      under_5: "Dưới $5",
      under_15: "Dưới $15",
      on_sale: "Đang giảm giá",
    },
    gridDescPrice: "Giá: {price} · sắp xếp theo \"{sort}\"",
    gridDescCategoryPrice: "\"{category}\" · {price} · {sort}",
    gridDescTags: "Thẻ: {tags} · {sort}",
    gridDescCategoryTags: "\"{category}\" · Thẻ: {tags} · {sort}",
    emptyPrice: "Không có game phù hợp \"{price}\"",
    emptyTags: "Không có game khớp thẻ đã chọn",
    emptyHintTags: "Thử bớt thẻ hoặc xóa bộ lọc.",
    viewAllTags: "Xóa bộ lọc thẻ",
    emptyHintPrice: "Thử khoảng giá khác hoặc xóa bộ lọc.",
    viewAllPrices: "Xem tất cả giá",
  },
};

function applyPatch(target, patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== "object") {
        target[key] = {};
      }
      applyPatch(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

for (const [locale, patch] of Object.entries(PATCHES)) {
  const filePath = resolve(dir, `${locale}.json`);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  if (!data.home) {
    console.warn(`⚠ ${locale}.json: missing home namespace`);
    continue;
  }
  applyPatch(data.home, patch);
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  console.log(`✓ ${locale}.json (${Object.keys(patch).length} top-level keys)`);
}

console.log("Done — homepage filter i18n patched");
