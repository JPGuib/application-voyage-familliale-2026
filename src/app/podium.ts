import type { Role } from "./owner-policy";

export type PodiumProfileInput = {
  profileId: string;
  surname: string;
  role: Role;
  gameResults: ReadonlyArray<{ day: number; totalScore: number }>;
};

export type PodiumEntry = {
  profileId: string;
  surname: string;
  total: number;
  rank: number;
};

/**
 * Classement cumulé des profils non-propriétaires (story 19.2). Le
 * propriétaire n'apparaît jamais, même s'il a lui-même joué. Les égalités
 * partagent le même rang (pas de départage automatique).
 */
export function computePodium(profiles: ReadonlyArray<PodiumProfileInput>): PodiumEntry[] {
  const totals = profiles
    .filter((profile) => profile.role !== "proprietaire")
    .map((profile) => ({
      profileId: profile.profileId,
      surname: profile.surname,
      total: profile.gameResults.reduce((sum, entry) => sum + entry.totalScore, 0),
    }))
    .sort((left, right) => right.total - left.total);

  let rank = 0;
  let previousTotal: number | null = null;

  return totals.map((entry, index) => {
    if (previousTotal === null || entry.total !== previousTotal) {
      rank = index + 1;
      previousTotal = entry.total;
    }

    return { ...entry, rank };
  });
}
