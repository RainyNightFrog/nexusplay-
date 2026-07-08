export function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function pickWithoutRepeat<T>(
  pool: T[],
  recent: Set<string>,
  getText: (item: T) => string | string[]
): T {
  if (pool.length === 0) {
    throw new Error("empty ambient pool");
  }

  const available = pool.filter((item) => {
    const texts = getText(item);
    const lines = Array.isArray(texts) ? texts : [texts];
    return !lines.some((line) => recent.has(line));
  });

  return pickRandom(available.length > 0 ? available : pool);
}
