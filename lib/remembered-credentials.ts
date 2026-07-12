const STORAGE_KEY = "rainynightfrog-remembered-credentials";

type RememberedCredentials = {
  email: string;
  password: string;
};

export function readRememberedCredentials(): RememberedCredentials | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RememberedCredentials>;
    if (!parsed.email?.trim()) return null;

    return {
      email: parsed.email.trim(),
      password: parsed.password ?? "",
    };
  } catch {
    return null;
  }
}

export function saveRememberedCredentials(email: string, password: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ email: email.trim(), password })
    );
  } catch {
    // ignore quota errors
  }
}

export function clearRememberedCredentials() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
