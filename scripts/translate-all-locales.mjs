/**
 * Fill locale message files:
 * - zh-CN: convert zh-HK strings (Traditional → Simplified) where zh-CN still matches en
 * - ja/ko/es/fr/de/pt/th/vi: machine-translate en strings that are still untranslated
 *
 * Usage: node scripts/translate-all-locales.mjs [--locale=ja] [--dry-run]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import * as OpenCC from "opencc-js";

const dir = resolve(process.cwd(), "messages");
const cachePath = resolve(process.cwd(), "scripts/.i18n-translate-cache.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const localeArg = args.find((a) => a.startsWith("--locale="))?.split("=")[1];

const en = JSON.parse(readFileSync(resolve(dir, "en.json"), "utf8"));
const zhHK = JSON.parse(readFileSync(resolve(dir, "zh-HK.json"), "utf8"));

const converter = OpenCC.Converter({ from: "hk", to: "cn" });

const TRANSLATE_LOCALES = {
  ja: "ja",
  ko: "ko",
  es: "es",
  fr: "fr",
  de: "de",
  pt: "pt",
  th: "th",
  vi: "vi",
};

function deepWalkStrings(obj, fn, path = "") {
  for (const [key, value] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      deepWalkStrings(value, fn, fullPath);
    } else if (typeof value === "string") {
      fn(fullPath, value);
    }
  }
}

function getAt(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

function setAt(obj, path, value) {
  const parts = path.split(".");
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

function protectPlaceholders(text) {
  const placeholders = [];
  const protectedText = text.replace(/\{[^}]+\}/g, (match) => {
    const id = `__PH${placeholders.length}__`;
    placeholders.push(match);
    return id;
  });
  return { text: protectedText, placeholders };
}

function restorePlaceholders(text, placeholders) {
  return text.replace(/__PH(\d+)__/g, (_, index) => placeholders[Number(index)] ?? _);
}

function loadCache() {
  if (!existsSync(cachePath)) return {};
  try {
    return JSON.parse(readFileSync(cachePath, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  if (!dryRun) {
    writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
  }
}

async function googleTranslate(text, targetLang) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });
  if (!response.ok) {
    throw new Error(`Translate HTTP ${response.status}`);
  }
  const data = await response.json();
  return data[0].map((part) => part[0]).join("");
}

async function translateBatch(texts, targetLang, cache, cachePrefix) {
  const results = [];
  const pending = [];

  for (let i = 0; i < texts.length; i += 1) {
    const cacheKey = `${cachePrefix}:${texts[i]}`;
    if (cache[cacheKey]) {
      results[i] = cache[cacheKey];
    } else {
      pending.push(i);
    }
  }

  if (pending.length === 0) return results;

  const delimiter = "\n<<<I18N_SPLIT>>>\n";
  const chunkSize = 40;

  for (let offset = 0; offset < pending.length; offset += chunkSize) {
    const chunkIndices = pending.slice(offset, offset + chunkSize);
    const chunkTexts = chunkIndices.map((index) => texts[index]);
    const joined = chunkTexts.join(delimiter);

    let translatedJoined = joined;
    let attempts = 0;
    while (attempts < 4) {
      try {
        translatedJoined = await googleTranslate(joined, targetLang);
        break;
      } catch (error) {
        attempts += 1;
        await sleep(500 * attempts);
        if (attempts >= 4) throw error;
      }
    }

    const translatedParts = translatedJoined.split(delimiter);
    if (translatedParts.length !== chunkTexts.length) {
      for (const index of chunkIndices) {
        const single = await googleTranslate(texts[index], targetLang);
        results[index] = single;
        cache[`${cachePrefix}:${texts[index]}`] = single;
      }
    } else {
      chunkIndices.forEach((index, partIndex) => {
        results[index] = translatedParts[partIndex];
        cache[`${cachePrefix}:${texts[index]}`] = translatedParts[partIndex];
      });
    }

    saveCache(cache);
    await sleep(150);
  }

  return results;
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function applyZhCN(data) {
  let updated = 0;

  deepWalkStrings(zhHK, (path, hkValue) => {
    const enValue = getAt(en, path);
    const current = getAt(data, path);

    if (hkValue === enValue) {
      if (current === undefined) {
        setAt(data, path, hkValue);
        updated += 1;
      }
      return;
    }

    if (current === undefined || current === enValue) {
      setAt(data, path, converter(hkValue));
      updated += 1;
    }
  });

  return updated;
}

async function applyMachineTranslations(locale, data, cache) {
  const targetLang = TRANSLATE_LOCALES[locale];
  const jobs = [];

  deepWalkStrings(en, (path, enValue) => {
    const current = getAt(data, path);
    if (typeof current !== "string") return;
    if (current !== enValue) return;
    if (!enValue.trim()) return;

    const { text, placeholders } = protectPlaceholders(enValue);
    jobs.push({ path, enValue, protectedText: text, placeholders });
  });

  console.log(`  ${locale}: ${jobs.length} strings to translate`);

  const batchSize = 40;
  let translated = 0;

  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const texts = batch.map((job) => job.protectedText);
    const translatedTexts = await translateBatch(
      texts,
      targetLang,
      cache,
      `${locale}:en`
    );

    batch.forEach((job, index) => {
      const restored = restorePlaceholders(translatedTexts[index], job.placeholders);
      if (restored && restored !== job.enValue) {
        setAt(data, pathKey(job.path), restored);
        translated += 1;
      }
    });

    if ((i / batchSize) % 5 === 0) {
      console.log(`  ${locale}: ${Math.min(i + batchSize, jobs.length)}/${jobs.length}`);
    }
  }

  return translated;
}

function pathKey(path) {
  return path;
}

async function main() {
  const cache = loadCache();

  if (!localeArg || localeArg === "zh-CN") {
    const zhCNPath = resolve(dir, "zh-CN.json");
    const zhCN = JSON.parse(readFileSync(zhCNPath, "utf8"));
    const updated = applyZhCN(zhCN);
    console.log(`✓ zh-CN.json: updated ${updated} strings from zh-HK`);
    if (!dryRun) {
      writeFileSync(zhCNPath, `${JSON.stringify(zhCN, null, 2)}\n`, "utf8");
    }
  }

  const locales = localeArg
    ? [localeArg]
    : Object.keys(TRANSLATE_LOCALES);

  for (const locale of locales) {
    if (!TRANSLATE_LOCALES[locale]) continue;

    const filePath = resolve(dir, `${locale}.json`);
    const data = JSON.parse(readFileSync(filePath, "utf8"));
    const updated = await applyMachineTranslations(locale, data, cache);
    console.log(`✓ ${locale}.json: translated ${updated} strings`);
    if (!dryRun) {
      writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    }
  }

  console.log("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
