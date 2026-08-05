/**
 * 簡易 Web Audio 音效掛鉤（無外部檔案）
 */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
  }
  return ctx;
}

function beep(
  freq: number,
  durationMs: number,
  type: OscillatorType = "square",
  gain = 0.04,
) {
  const ac = getCtx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ac.destination);
  const now = ac.currentTime;
  g.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000);
}

export const pokerSfx = {
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
