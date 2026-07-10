const OWNER_CODE_HASH_PREFIX = "sha256:";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function isOwnerCodeHash(value: string): boolean {
  return value.startsWith(OWNER_CODE_HASH_PREFIX) && value.length === OWNER_CODE_HASH_PREFIX.length + 64;
}

export async function hashOwnerCode(code: string): Promise<string> {
  const normalized = code.trim();
  const input = new TextEncoder().encode(normalized);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return `${OWNER_CODE_HASH_PREFIX}${toHex(new Uint8Array(digest))}`;
}

export async function verifyOwnerCode(candidateCode: string, storedHashOrLegacyCode: string): Promise<boolean> {
  const normalizedCandidate = candidateCode.trim();
  const normalizedStored = storedHashOrLegacyCode.trim();

  if (!normalizedStored) {
    return false;
  }

  if (isOwnerCodeHash(normalizedStored)) {
    const candidateHash = await hashOwnerCode(normalizedCandidate);
    return candidateHash === normalizedStored;
  }

  // Legacy compatibility path while old clear-text values are migrating.
  return normalizedCandidate === normalizedStored;
}
