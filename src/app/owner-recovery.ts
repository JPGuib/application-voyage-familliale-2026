/**
 * Owner recovery phrase utilities
 * Provides hashing and verification for owner recovery phrases
 * Mirrors owner-code.ts pattern but specifically for recovery phrases
 */

const OWNER_RECOVERY_HASH_PREFIX = "sha256:";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function isOwnerRecoveryHash(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  if (!value.startsWith(OWNER_RECOVERY_HASH_PREFIX)) return false;
  if (value.length !== OWNER_RECOVERY_HASH_PREFIX.length + 64) return false;
  // Validate remaining 64 chars are valid hex digits
  const hexPart = value.slice(OWNER_RECOVERY_HASH_PREFIX.length);
  return /^[a-f0-9]{64}$/i.test(hexPart);
}

export async function hashOwnerRecoveryPhrase(phrase: string): Promise<string> {
  if (!phrase || typeof phrase !== 'string') {
    throw new Error('Phrase must be a non-empty string');
  }
  const normalized = phrase.trim();
  if (normalized.length === 0) {
    throw new Error('Phrase cannot be empty after trimming');
  }
  const input = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `${OWNER_RECOVERY_HASH_PREFIX}${toHex(new Uint8Array(digest))}`;
}

export async function verifyOwnerRecoveryPhrase(
  candidatePhrase: string,
  storedHashOrLegacyPhrase: string
): Promise<boolean> {
  if (!candidatePhrase || typeof candidatePhrase !== 'string') {
    return false;
  }
  if (!storedHashOrLegacyPhrase || typeof storedHashOrLegacyPhrase !== 'string') {
    return false;
  }

  const normalizedCandidate = candidatePhrase.trim();
  const normalizedStored = storedHashOrLegacyPhrase.trim();

  if (!normalizedStored || !isOwnerRecoveryHash(normalizedStored)) {
    return false;
  }

  try {
    const candidateHash = await hashOwnerRecoveryPhrase(normalizedCandidate);
    return candidateHash === normalizedStored;
  } catch {
    return false;
  }
}
