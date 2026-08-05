/**
 * 簡易 Web Audio 音效掛鉤（無外部檔案）
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let masterVolume = 0.75;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

function getMaster(): GainNode | null {
  const ac = getCtx();
  if (!ac) return null;
  if (!masterGain) {
    masterGain = ac.createGain();
    masterGain.gain.value = masterVolume;
    masterGain.connect(ac.destination);
  }
  return masterGain;
}

/** 0～1，由遊戲殼音量滑桿控制 */
export function setPokerMasterVolume(volume: number) {
  masterVolume = Math.max(0, Math.min(1, volume));
  const g = getMaster();
  if (g) g.gain.value = masterVolume;
}

export function getPokerMasterVolume() {
  return masterVolume;
}

function beep(
  freq: number,
  durationMs: number,
  type: OscillatorType = "square",
  gain = 0.04,
) {
  const ac = getCtx();
  const dest = getMaster();
  if (!ac || !dest) return;
  if (ac.state === "suspended") void ac.resume();
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(dest);
  const now = ac.currentTime;
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

export const pokerSfx = {
  setMasterVolume: setPokerMasterVolume,
  getMasterVolume: getPokerMasterVolume,
  check: () => beep(440, 80, "triangle"),
  call: () => beep(520, 100, "square"),
  raise: () => {
    beep(600, 60);
    setTimeout(() => beep(780, 80), 70);
  },
  fold: () => beep(220, 120, "sawtooth", 0.03),
  win: () => {
    beep(523, 80);
    setTimeout(() => beep(659, 80), 90);
    setTimeout(() => beep(784, 120), 180);
  },
  deal: () => beep(880, 40, "triangle", 0.025),
};
