import { AMBIENT_TIMEZONE } from "@/lib/chat-ambient-schedule";

export type AmbientTimeSlot = "lateNight" | "morning" | "afternoon" | "evening";

const LATE_NIGHT_RE =
  /凌晨|夜里|夜貓|不[睡瞓]|睡不着|瞓不着|awake at this hour|all nighter|打了一晚上|打咗成晚/i;
const EVENING_RE = /今晚|tonight|开黑|開黑/i;

export function getCurrentAmbientTimeSlot(
  timezone = AMBIENT_TIMEZONE,
  at: Date = new Date()
): AmbientTimeSlot {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(at)
  );

  if (hour >= 0 && hour < 6) return "lateNight";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function inferTimeSlots(text: string): AmbientTimeSlot[] | null {
  const slots = new Set<AmbientTimeSlot>();
  if (LATE_NIGHT_RE.test(text)) slots.add("lateNight");
  if (EVENING_RE.test(text)) {
    slots.add("evening");
    slots.add("lateNight");
  }
  if (slots.size === 0) return null;
  return [...slots];
}

export function isAmbientContentAllowedNow(
  text: string | string[],
  slot: AmbientTimeSlot = getCurrentAmbientTimeSlot()
): boolean {
  const joined = Array.isArray(text) ? text.join(" ") : text;
  const required = inferTimeSlots(joined);
  if (!required) return true;
  return required.includes(slot);
}

export function filterAmbientByTimeSlot<T>(
  pool: T[],
  slot: AmbientTimeSlot,
  getText: (item: T) => string | string[]
): T[] {
  return pool.filter((item) => isAmbientContentAllowedNow(getText(item), slot));
}
