const PROFILE_PASSWORD_HASH_PREFIX = "sha256:";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function isProfilePasswordHash(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  if (!value.startsWith(PROFILE_PASSWORD_HASH_PREFIX)) return false;
  if (value.length !== PROFILE_PASSWORD_HASH_PREFIX.length + 64) return false;

  const hexPart = value.slice(PROFILE_PASSWORD_HASH_PREFIX.length);
  return /^[a-f0-9]{64}$/i.test(hexPart);
}

export async function hashProfilePassword(password: string): Promise<string> {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }

  const normalized = password.trim();
  if (normalized.length === 0) {
    throw new Error("Password cannot be empty after trimming");
  }

  const input = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `${PROFILE_PASSWORD_HASH_PREFIX}${toHex(new Uint8Array(digest))}`;
}

export async function verifyProfilePassword(
  candidatePassword: string,
  storedHashOrLegacyPassword: string
): Promise<boolean> {
  if (!candidatePassword || typeof candidatePassword !== "string") {
    return false;
  }
  if (!storedHashOrLegacyPassword || typeof storedHashOrLegacyPassword !== "string") {
    return false;
  }

  const normalizedCandidate = candidatePassword.trim();
  const normalizedStored = storedHashOrLegacyPassword.trim();

  if (!normalizedStored || !isProfilePasswordHash(normalizedStored)) {
    return false;
  }

  try {
    const candidateHash = await hashProfilePassword(normalizedCandidate);
    return candidateHash === normalizedStored;
  } catch {
    return false;
  }
}
