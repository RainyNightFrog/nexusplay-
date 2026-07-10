import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, "public/brand/rainynightfrog-logo-source.png");
const brandDir = path.join(root, "public/brand");
const appDir = path.join(root, "app");
const localeDir = path.join(appDir, "[locale]");

const SITE_BG = { r: 9, g: 9, b: 11, alpha: 1 };
const KEY_MAX = 112;
const KEY_CHROMA = 82;

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function removeDarkBackground(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);

    if (max < KEY_MAX && chroma < KEY_CHROMA) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  }).trim();
}

async function buildFaviconPng(iconBuffer, size, outputPath) {
  const glowPad = Math.round(size * 0.12);
  const iconSize = size - glowPad * 2;

  const icon = await sharp(iconBuffer)
    .resize(iconSize, iconSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: SITE_BG,
    },
  })
    .composite([{ input: icon, left: glowPad, top: glowPad }])
    .png()
    .toFile(outputPath);
}

async function buildAssets() {
  await ensureDir(brandDir);

  const meta = await sharp(source).metadata();
  const width = meta.width ?? 1024;
  const height = meta.height ?? 434;

  const iconSize = Math.round(Math.min(width, height * 0.58));
  const iconLeft = Math.round((width - iconSize) / 2);
  const iconTop = 8;

  const iconSquareBuffer = await sharp(source)
    .extract({
      left: iconLeft,
      top: iconTop,
      width: iconSize,
      height: iconSize,
    })
    .png()
    .toBuffer();

  const logoTransparent = await removeDarkBackground(source);
  const iconTransparent = await removeDarkBackground(iconSquareBuffer);

  await logoTransparent
    .clone()
    .png({ compressionLevel: 9, quality: 95 })
    .toFile(path.join(brandDir, "rainynightfrog-logo.png"));

  await iconTransparent
    .clone()
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(brandDir, "rainynightfrog-icon-512.png"));

  await iconTransparent
    .clone()
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(brandDir, "rainynightfrog-icon-256.png"));

  const iconFavicon = await iconTransparent
    .clone()
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await buildFaviconPng(iconFavicon, 32, path.join(appDir, "icon.png"));
  await buildFaviconPng(iconFavicon, 180, path.join(appDir, "apple-icon.png"));

  const logoForOg = await logoTransparent
    .clone()
    .resize(1040, null, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();

  const ogLogoMeta = await sharp(logoForOg).metadata();
  const ogLogoWidth = ogLogoMeta.width ?? 1040;
  const ogLogoHeight = ogLogoMeta.height ?? 442;
  const ogWidth = 1200;
  const ogHeight = 630;
  const ogLeft = Math.round((ogWidth - ogLogoWidth) / 2);
  const ogTop = Math.round((ogHeight - ogLogoHeight) / 2);

  await sharp({
    create: {
      width: ogWidth,
      height: ogHeight,
      channels: 4,
      background: SITE_BG,
    },
  })
    .composite([{ input: logoForOg, left: ogLeft, top: ogTop }])
    .png()
    .toFile(path.join(localeDir, "opengraph-image.png"));

  console.log("Brand assets generated:");
  console.log(`  source: ${width}x${height}`);
  console.log(`  icon crop: ${iconSize}x${iconSize} @ (${iconLeft}, ${iconTop})`);
}

buildAssets().catch((error) => {
  console.error(error);
  process.exit(1);
});
