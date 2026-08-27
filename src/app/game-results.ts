export type GameHistoryEntry = {
  day: number;
  location: string;
  quizScore: number;
  correctCount: number;
  riddleSolved: boolean;
  // Réponse (texte brut) donnée par le joueur à l'énigme du jour, pour
  // pouvoir l'afficher plus tard dans le détail des résultats aux côtés de
  // la réponse attendue (cf. RIDDLES_BY_DAY). Facultatif pour rester
  // compatible avec les entrées enregistrées avant l'ajout de ce champ.
  riddleAnswer?: string;
  challengeDone: boolean;
  challengeResponse?: string;
  durationSec: number;
  totalScore: number;
  completedAt: string;
};

type Badge = {
  icon: string;
  name: string;
  desc: string;
  earned: boolean;
};

// Progression en cours (session non terminée) pour le jour donné : "playing"
// pendant le quiz (survit à un rechargement/fermeture de l'appli, pour
// reprendre exactement à la question en cours), "riddle" une fois le quiz
// soumis (on ne peut plus revenir en arrière dessus), puis "challenge" une
// fois l'énigme validée. Jamais "done"/"intro" : le récap du quiz n'est
// visible qu'une fois (on bascule directement vers l'énigme si on quitte
// l'écran). `quizStartedAt` n'est utile que pendant "playing" (null sinon).
export type GameProgress = {
  day: number;
  phase: "playing" | "riddle" | "challenge";
  answers: number[];
  quizStartedAt: number | null;
  quizDurationSec: number;
  riddleValidated: boolean;
  riddleSolved: boolean;
  challengeDraft?: string;
};

export function parseGameProgress(raw: string | null): GameProgress | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.day === "number" &&
      (parsed?.phase === "playing" || parsed?.phase === "riddle" || parsed?.phase === "challenge") &&
      Array.isArray(parsed?.answers) &&
      parsed.answers.every((value: unknown) => typeof value === "number") &&
      (parsed?.quizStartedAt === null || typeof parsed?.quizStartedAt === "number") &&
      typeof parsed?.quizDurationSec === "number" &&
      typeof parsed?.riddleValidated === "boolean" &&
      typeof parsed?.riddleSolved === "boolean" &&
      (parsed?.challengeDraft === undefined || typeof parsed?.challengeDraft === "string")
    ) {
      return {
        ...(parsed as GameProgress),
        challengeDraft: typeof parsed.challengeDraft === "string" ? parsed.challengeDraft : "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function parseGameHistory(raw: string | null): GameHistoryEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry) => {
      const isValid =
        typeof entry?.day === "number" &&
        typeof entry?.location === "string" &&
        typeof entry?.quizScore === "number" &&
        typeof entry?.correctCount === "number" &&
        typeof entry?.riddleSolved === "boolean" &&
        (entry?.riddleAnswer === undefined || typeof entry?.riddleAnswer === "string") &&
        typeof entry?.challengeDone === "boolean" &&
        (entry?.challengeResponse === undefined || typeof entry?.challengeResponse === "string") &&
        typeof entry?.durationSec === "number" &&
        typeof entry?.totalScore === "number" &&
        typeof entry?.completedAt === "string";

      if (!isValid) {
        return [];
      }

      return [{
        ...(entry as GameHistoryEntry),
        riddleAnswer:
          typeof entry.riddleAnswer === "string" ? entry.riddleAnswer : "",
        challengeResponse:
          typeof entry.challengeResponse === "string" ? entry.challengeResponse : "",
      }];
    });
  } catch {
    return [];
  }
}

export function upsertGameHistory(
  previous: GameHistoryEntry[],
  entry: GameHistoryEntry
): GameHistoryEntry[] {
  const filtered = previous.filter((item) => item.day !== entry.day);
  return [...filtered, entry].sort((a, b) => a.day - b.day);
}

export function computeBadges(
  history: GameHistoryEntry[],
  getQuestionCountForDay: (day: number) => number
): Badge[] {
  return [
    {
      icon: "🏛️",
      name: "Maître Culture",
      desc: "5 quiz complétés",
      earned: history.length >= 5,
    },
    {
      icon: "🗺️",
      name: "Grand Explorateur",
      desc: "4 lieux découverts",
      earned: new Set(history.map((entry) => entry.location)).size >= 4,
    },
    {
      icon: "⚡",
      name: "Éclair",
      desc: "Quiz en moins de 2 min",
      earned: history.some((entry) => entry.durationSec > 0 && entry.durationSec <= 120),
    },
    {
      icon: "🎯",
      name: "Sans faute !",
      desc: "Score parfait",
      earned: history.some(
        (entry) => entry.correctCount === getQuestionCountForDay(entry.day)
      ),
    },
  ];
}
