export const AMBIENT_LOCAL_DOMAINS = [
  "rainynightfrog.local",
  "nexusplay.local",
] as const;

export function isAmbientLocalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return AMBIENT_LOCAL_DOMAINS.some((domain) => email.endsWith(`@${domain}`));
}

export function ambientLocalDomain() {
  return AMBIENT_LOCAL_DOMAINS[0];
}

export function legacyAmbientLocalDomain() {
  return AMBIENT_LOCAL_DOMAINS[1];
}

export function ambientEmailAliases(
  localPart: string
): [string, string] {
  return [
    `${localPart}@${ambientLocalDomain()}`,
    `${localPart}@${legacyAmbientLocalDomain()}`,
  ];
}
