type LoginCandidateLike = {
  id: string;
  surname: string;
};

function normalizeProfileSurname(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function findDuplicateProfileBySurname<T extends LoginCandidateLike>(
  candidates: readonly T[],
  surname: string
): T | null {
  const normalizedTarget = normalizeProfileSurname(surname);
  if (!normalizedTarget) {
    return null;
  }

  for (const candidate of candidates) {
    if (normalizeProfileSurname(candidate.surname) === normalizedTarget) {
      return candidate;
    }
  }

  return null;
}
