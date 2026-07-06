/** True when the string is a user-facing Chinese message without Latin technical details. */
export function isUserFacingChineseMessage(message: string) {
  return /[\u4e00-\u9fff]/.test(message) && !/[a-zA-Z]/.test(message);
}

export function extractErrorMessage(error: unknown) {
  if (typeof error === "string") return error.trim();
  if (error instanceof Error) return error.message.trim();
  return "";
}

export function resolveUserFacingError(
  error: unknown,
  options: {
    translate?: (message: string) => string | null;
    fallback: string;
  }
) {
  const raw = extractErrorMessage(error);
  if (!raw) return options.fallback;

  const translated = options.translate?.(raw);
  if (translated) return translated;

  if (isUserFacingChineseMessage(raw)) return raw;

  return options.fallback;
}
