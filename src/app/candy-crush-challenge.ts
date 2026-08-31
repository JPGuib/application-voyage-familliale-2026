/**
 * Mode "Défi" de Bazar Crush (Candy Crush) : configuration figée (grille 9x9,
 * 6 types de pions, niveau 1, timer 120s inchangé) dont le but est de battre
 * son propre record. Ce module gère le record individuel (persistance locale
 * + cloud, cf. CandyCrushScreen.tsx et App.tsx) et le podium familial — tout
 * le monde y compte, y compris propriétaire et visiteurs, contrairement au
 * podium du quiz (cf. podium.ts) : ce classement n'a aucun lien avec le
 * scoring familial, c'est un simple "qui bat qui" au Candy Crush.
 */

export type CandyCrushChallengeRecord = { bestScore: number; updatedAt: number };

export function parseCandyCrushChallengeRecord(
  raw: unknown
): CandyCrushChallengeRecord | null {
  if (raw === null || raw === undefined) return null;

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as Record<string, unknown>).bestScore === "number" &&
      Number.isFinite((parsed as Record<string, unknown>).bestScore) &&
      (parsed as Record<string, unknown>).bestScore >= 0 &&
      typeof (parsed as Record<string, unknown>).updatedAt === "number" &&
      Number.isFinite((parsed as Record<string, unknown>).updatedAt)
    ) {
      return {
        bestScore: (parsed as Record<string, unknown>).bestScore as number,
        updatedAt: (parsed as Record<string, unknown>).updatedAt as number,
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Ne régresse jamais un record déjà connu : garde toujours le bestScore le
 * plus élevé entre les deux sources (local vs cloud), quel que soit l'ordre
 * d'arrivée des mises à jour — même précaution que pour gameHistory face aux
 * courses de synchro cloud (hydratation partielle/à la traîne).
 */
export function mergeCandyCrushChallengeRecord(
  a: CandyCrushChallengeRecord | null,
  b: CandyCrushChallengeRecord | null
): CandyCrushChallengeRecord | null {
  if (!a) return b;
  if (!b) return a;
  return b.bestScore > a.bestScore ? b : a;
}

export type CandyCrushPodiumInput = {
  profileId: string;
  surname: string;
  bestScore: number;
};

export type CandyCrushPodiumEntry = {
  profileId: string;
  surname: string;
  bestScore: number;
  rank: number;
};

/**
 * Classement du mode Défi, tout profil confondu (pas de filtre de rôle).
 * Rangs partagés en cas d'égalité, tronqué aux `limit` premiers, et les
 * profils qui n'ont jamais joué en Défi (bestScore <= 0) n'apparaissent pas.
 */
export function computeCandyCrushPodium(
  entries: ReadonlyArray<CandyCrushPodiumInput>,
  { limit = 5 }: { limit?: number } = {}
): CandyCrushPodiumEntry[] {
  const sorted = entries
    .filter((entry) => entry.bestScore > 0)
    .slice()
    .sort((left, right) => right.bestScore - left.bestScore);

  let rank = 0;
  let previousScore: number | null = null;

  const ranked = sorted.map((entry, index) => {
    if (previousScore === null || entry.bestScore !== previousScore) {
      rank = index + 1;
      previousScore = entry.bestScore;
    }

    return { ...entry, rank };
  });

  return ranked.slice(0, limit);
}
