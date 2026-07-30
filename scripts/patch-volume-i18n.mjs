import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "messages");
const entries = {
  "zh-HK": { gameVolume: "遊戲音量", gameVolumeMute: "靜音", gameVolumeUnmute: "取消靜音" },
  "zh-CN": { gameVolume: "游戏音量", gameVolumeMute: "静音", gameVolumeUnmute: "取消静音" },
  en: { gameVolume: "Game volume", gameVolumeMute: "Mute", gameVolumeUnmute: "Unmute" },
  es: { gameVolume: "Volumen del juego", gameVolumeMute: "Silenciar", gameVolumeUnmute: "Activar sonido" },
  ja: { gameVolume: "ゲーム音量", gameVolumeMute: "ミュート", gameVolumeUnmute: "ミュート解除" },
  ko: { gameVolume: "게임 볼륨", gameVolumeMute: "음소거", gameVolumeUnmute: "음소거 해제" },
  fr: { gameVolume: "Volume du jeu", gameVolumeMute: "Muet", gameVolumeUnmute: "Son activé" },
  de: { gameVolume: "Spiel-Lautstärke", gameVolumeMute: "Stumm", gameVolumeUnmute: "Ton an" },
  pt: { gameVolume: "Volume do jogo", gameVolumeMute: "Silenciar", gameVolumeUnmute: "Ativar som" },
  th: { gameVolume: "ระดับเสียงเกม", gameVolumeMute: "ปิดเสียง", gameVolumeUnmute: "เปิดเสียง" },
  vi: { gameVolume: "Âm lượng game", gameVolumeMute: "Tắt tiếng", gameVolumeUnmute: "Bật tiếng" },
};

for (const [loc, t] of Object.entries(entries)) {
  const f = path.join(dir, loc + ".json");
  let j = fs.readFileSync(f, "utf8");
  if (j.includes('"gameVolume"')) {
    console.log("skip", loc);
    continue;
  }
  const marker = '"backToGameMenuFailed"';
  const i = j.indexOf(marker);
  if (i < 0) {
    console.log("no key", loc);
    continue;
  }
  const lineEnd = j.indexOf("\n", i);
  const line = j.slice(i, lineEnd);
  const insert =
    ",\n    \"gameVolume\": " +
    JSON.stringify(t.gameVolume) +
    ",\n    \"gameVolumeMute\": " +
    JSON.stringify(t.gameVolumeMute) +
    ",\n    \"gameVolumeUnmute\": " +
    JSON.stringify(t.gameVolumeUnmute);
  j = j.slice(0, i) + line + insert + j.slice(lineEnd);
  fs.writeFileSync(f, j);
  console.log("ok", loc);
}
