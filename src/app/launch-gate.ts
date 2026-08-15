import type { Role } from "./owner-policy";
import type { TravelPhase } from "../types/cloud";

export type LaunchFallbackStep = {
  id: string;
  title: string;
  body: string;
  theme: "dark" | "blue";
  showPhotos?: boolean;
};

export const LAUNCH_VIDEO_SRC = "/voyage_istanbul.mp4";
export const VISITOR_LAUNCH_VIDEO_SRC = "/voyage_istanbul_visiteur.mp4";

export function getLaunchVideoSrc(role: Role | null): string {
  return role === "visiteur" ? VISITOR_LAUNCH_VIDEO_SRC : LAUNCH_VIDEO_SRC;
}

export const LAUNCH_FALLBACK_STEPS: LaunchFallbackStep[] = [
  {
    id: "step-1",
    title: "On est partis !",
    body: "Valises bouclées, sourires allumés : l'aventure en Turquie commence maintenant.",
    theme: "dark",
  },
  {
    id: "step-2",
    title: "Direction l'aéroport",
    body: "On respire, on vérifie les passeports, et on garde l'énergie du départ.",
    theme: "dark",
  },
  {
    id: "step-3",
    title: "Premier envol",
    body: "Chaque kilomètre nous rapproche d'Istanbul et de nos premières découvertes.",
    theme: "dark",
  },
  {
    id: "step-4",
    title: "En famille",
    body: "On partage tout : les surprises, les photos, les fous rires et les souvenirs.",
    theme: "dark",
  },
  {
    id: "step-5",
    title: "Istanbul nous attend",
    body: "Mosquées, bazars, Bosphore : on arrive au coeur du voyage.",
    theme: "dark",
  },
  {
    id: "step-6",
    title: "C'est parti pour de vrai",
    body: "Place au voyage : on avance ensemble vers notre première journée.",
    theme: "blue",
    showPhotos: true,
  },
];

export function getNextLaunchGateCycle(
  currentCycle: number,
  previousPhase: TravelPhase,
  nextPhase: TravelPhase
): number {
  if (previousPhase === "before" && nextPhase === "during") {
    return Math.max(0, Math.floor(currentCycle)) + 1;
  }
  return Math.max(0, Math.floor(currentCycle));
}

export function shouldForceLaunchGate(input: {
  role: Role | null;
  phase: TravelPhase;
  profileId: string;
  launchGateCycle: number;
  launchGateCompletedCycleByProfile: Record<string, number>;
  ownerReplayRequested: boolean;
}): boolean {
  const {
    role,
    phase,
    profileId,
    launchGateCycle,
    launchGateCompletedCycleByProfile,
    ownerReplayRequested,
  } = input;

  if (ownerReplayRequested) {
    return true;
  }

  if (role === "proprietaire") {
    return false;
  }

  if (phase === "before") {
    // Story 25.4 scope: before unlock, only visiteurs are forced through the
    // launch gate. Voyageurs keep the historical pre-unlock checklist flow.
    return role === "visiteur";
  }

  const normalizedCycle =
    Number.isFinite(launchGateCycle) && launchGateCycle > 0
      ? Math.floor(launchGateCycle)
      : 0;
  // If cycle is missing in a "during" snapshot, force a one-time launch
  // gate with a synthetic cycle so users still see the intermediary screen.
  const expectedCycle = normalizedCycle > 0 ? normalizedCycle : 1;

  const completedCycleRaw = launchGateCompletedCycleByProfile[profileId];
  const completedCycle =
    Number.isFinite(completedCycleRaw) && typeof completedCycleRaw === "number"
      ? Math.floor(completedCycleRaw)
      : -1;
  return completedCycle !== expectedCycle;
}
