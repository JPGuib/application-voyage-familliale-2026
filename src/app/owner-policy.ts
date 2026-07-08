export type Role = "proprietaire" | "utilisateur";

export type PersistedProfile = {
  id: string;
  role: Role;
};

export type SharedFamilyState = {
  version: number;
  ownerProfileId: string | null;
  profiles: PersistedProfile[];
};

export const SHARED_FAMILY_STATE_VERSION = 1;

export const DEFAULT_SHARED_FAMILY_STATE: SharedFamilyState = {
  version: SHARED_FAMILY_STATE_VERSION,
  ownerProfileId: null,
  profiles: [],
};

export function createProfileId(): string {
  return `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function parseSharedFamilyState(raw: string | null): SharedFamilyState {
  if (!raw) {
    return DEFAULT_SHARED_FAMILY_STATE;
  }

  try {
    const parsed = JSON.parse(raw);
    const ownerProfileId = typeof parsed?.ownerProfileId === "string" ? parsed.ownerProfileId : null;
    const profiles = Array.isArray(parsed?.profiles)
      ? parsed.profiles
          .filter((profile) => {
            return (
              profile &&
              typeof profile.id === "string" &&
              (profile.role === "proprietaire" || profile.role === "utilisateur")
            );
          })
          .map((profile) => ({ id: profile.id, role: profile.role as Role }))
      : [];

    return {
      version:
        typeof parsed?.version === "number" && Number.isFinite(parsed.version)
          ? parsed.version
          : SHARED_FAMILY_STATE_VERSION,
      ownerProfileId,
      profiles,
    };
  } catch {
    return DEFAULT_SHARED_FAMILY_STATE;
  }
}

export function upsertProfile(
  state: SharedFamilyState,
  profile: PersistedProfile
): SharedFamilyState {
  const withoutCurrent = state.profiles.filter((existing) => existing.id !== profile.id);
  return {
    ...state,
    profiles: [...withoutCurrent, profile],
  };
}

export function assignRoleOnProfileCreation(
  state: SharedFamilyState
): Role {
  return state.ownerProfileId ? "utilisateur" : "proprietaire";
}

export function canPromoteToOwner(
  state: SharedFamilyState,
  actorProfileId: string
): boolean {
  return !state.ownerProfileId || state.ownerProfileId === actorProfileId;
}

export function canUpdateOwnerCode(
  state: SharedFamilyState,
  actorProfileId: string
): boolean {
  return state.ownerProfileId === actorProfileId;
}

export function enforceOwnerUniqueness(state: SharedFamilyState): SharedFamilyState {
  const profilesById = new Map<string, PersistedProfile>();
  for (const profile of state.profiles) {
    profilesById.set(profile.id, profile);
  }

  let ownerId = state.ownerProfileId && profilesById.has(state.ownerProfileId) ? state.ownerProfileId : null;

  if (!ownerId) {
    const ownerCandidate = state.profiles.find((profile) => profile.role === "proprietaire");
    ownerId = ownerCandidate ? ownerCandidate.id : null;
  }

  const normalizedProfiles = state.profiles.map((profile) => {
    if (ownerId && profile.id === ownerId) {
      return { ...profile, role: "proprietaire" as const };
    }
    return { ...profile, role: "utilisateur" as const };
  });

  return {
    version: SHARED_FAMILY_STATE_VERSION,
    ownerProfileId: ownerId,
    profiles: normalizedProfiles,
  };
}

function normalizeProfilesForCompare(profiles: PersistedProfile[]): PersistedProfile[] {
  return [...profiles].sort((a, b) => a.id.localeCompare(b.id));
}

export function areSharedFamilyStatesEqual(
  left: SharedFamilyState,
  right: SharedFamilyState
): boolean {
  if (left.ownerProfileId !== right.ownerProfileId) {
    return false;
  }

  const leftProfiles = normalizeProfilesForCompare(left.profiles);
  const rightProfiles = normalizeProfilesForCompare(right.profiles);

  if (leftProfiles.length !== rightProfiles.length) {
    return false;
  }

  for (let i = 0; i < leftProfiles.length; i += 1) {
    if (
      leftProfiles[i].id !== rightProfiles[i].id ||
      leftProfiles[i].role !== rightProfiles[i].role
    ) {
      return false;
    }
  }

  return true;
}
