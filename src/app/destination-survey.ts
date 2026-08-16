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

const DESTINATION_PROPOSAL_SCORING = [
  { basePoints: 0, bonusPoints: 0 },
  { basePoints: 0, bonusPoints: 0 },
  { basePoints: 0, bonusPoints: 0 },
] as const;

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

  for (const row of rows) {
    if (!row.eligibleForSharedScore) {
      continue;
    }

    const matchingProposalIndex = row.proposals.findIndex((proposal) =>
      destinationEquals(proposal, destination)
    );

    if (matchingProposalIndex < 0 || matchingProposalIndex >= DESTINATION_PROPOSAL_SCORING.length) {
      continue;
    }

    const scoring = DESTINATION_PROPOSAL_SCORING[matchingProposalIndex];
    row.rank = matchingProposalIndex + 1;
    row.basePoints = scoring.basePoints;
    row.bonusPoints = scoring.bonusPoints;
    row.points = scoring.basePoints + scoring.bonusPoints;
  }

  return {
    rows,
  };
}
