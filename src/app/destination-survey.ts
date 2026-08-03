import type { Role } from "./owner-policy";

export const MAX_DESTINATION_PROPOSALS = 3;

export type DestinationSurveyVote = {
  profileId: string;
  proposals: string[];
  updatedAt: number;
  authorUid?: string;
};

export type DestinationSurveyParticipant = {
  profileId: string;
  surname: string;
  role: Role;
};

export type DestinationSurveyResultRow = {
  profileId: string;
  surname: string;
  role: Role;
  proposals: string[];
  updatedAt: number | null;
  isCorrect: boolean;
  eligibleForSharedScore: boolean;
  rank: number | null;
  basePoints: number;
  bonusPoints: number;
  points: number;
};

export type DestinationSurveyResults = {
  rows: DestinationSurveyResultRow[];
};

export function normalizeDestinationText(value: string): string {
  return value.trim().normalize("NFC");
}

export function destinationEquals(left: string, right: string): boolean {
  const normalizedLeft = normalizeDestinationText(left);
  const normalizedRight = normalizeDestinationText(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft.localeCompare(normalizedRight, "fr", { sensitivity: "base" }) === 0;
}

export function sanitizeDestinationProposals(proposals: string[]): string[] {
  return proposals
    .map((proposal) => normalizeDestinationText(proposal))
    .filter((proposal) => proposal.length > 0)
    .slice(0, MAX_DESTINATION_PROPOSALS);
}

export function validateDestinationProposals(proposals: string[]): {
  ok: boolean;
  message: string | null;
  proposals: string[];
} {
  const normalized = proposals
    .map((proposal) => normalizeDestinationText(proposal))
    .filter((proposal) => proposal.length > 0);

  if (normalized.length === 0) {
    return {
      ok: false,
      message: "Ajoutez au moins 1 destination.",
      proposals: [],
    };
  }

  if (normalized.length > MAX_DESTINATION_PROPOSALS) {
    return {
      ok: false,
      message: "Maximum 3 propositions par profil.",
      proposals: normalized,
    };
  }

  return {
    ok: true,
    message: null,
    proposals: normalized,
  };
}

export function computeDestinationSurveyResults(input: {
  destination: string;
  participants: DestinationSurveyParticipant[];
  votesByProfile: Record<string, DestinationSurveyVote>;
}): DestinationSurveyResults {
  const destination = normalizeDestinationText(input.destination);

  const rows: DestinationSurveyResultRow[] = input.participants.map((participant) => {
    const vote = input.votesByProfile[participant.profileId];
    const proposals = vote ? sanitizeDestinationProposals(vote.proposals) : [];
    const isCorrect = proposals.some((proposal) => destinationEquals(proposal, destination));
    const eligibleForSharedScore = participant.role === "utilisateur";

    return {
      profileId: participant.profileId,
      surname: participant.surname,
      role: participant.role,
      proposals,
      updatedAt: vote?.updatedAt ?? null,
      isCorrect,
      eligibleForSharedScore,
      rank: null,
      basePoints: 0,
      bonusPoints: 0,
      points: 0,
    };
  });

  const rankedEligibleRows = rows
    .filter((row) => row.isCorrect && row.eligibleForSharedScore && row.updatedAt !== null)
    .sort((left, right) => {
      if (left.updatedAt === right.updatedAt) {
        return left.surname.localeCompare(right.surname, "fr", { sensitivity: "base" });
      }
      return (left.updatedAt ?? 0) - (right.updatedAt ?? 0);
    });

  let previousTimestamp: number | null = null;
  let previousRank = 0;

  for (let index = 0; index < rankedEligibleRows.length; index += 1) {
    const row = rankedEligibleRows[index];
    const currentTimestamp = row.updatedAt as number;

    const rank =
      previousTimestamp !== null && currentTimestamp === previousTimestamp
        ? previousRank
        : index + 1;

    previousTimestamp = currentTimestamp;
    previousRank = rank;

    row.rank = rank;
    row.basePoints = 20;
    row.bonusPoints = rank === 1 ? 10 : rank === 2 ? 5 : 0;
    row.points = row.basePoints + row.bonusPoints;
  }

  return {
    rows,
  };
}
