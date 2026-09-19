// Logique de calcul du "jour du voyage" (story 14.1).
//
// Le calcul se base sur la date système de l'appareil (pas un fuseau horaire
// canonique unique), en comparant deux dates locales "sans heure".

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidTripStartDate(value: string | null | undefined): value is string {
  if (typeof value !== "string") return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return (
    parsed.getFullYear() === Number(year) &&
    parsed.getMonth() === Number(month) - 1 &&
    parsed.getDate() === Number(day)
  );
}

function parseLocalDate(value: string): Date | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function localCalendarDayNumber(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

/**
 * Resolves the challenge available in the local window [day J 18:00, day J+1 18:00).
 * Returns null before the first window and after the final one.
 */
export function computeActiveGameDay(
  tripStartDate: string | null | undefined,
  lastDefinedDay: number | null,
  now: Date = new Date()
): number | null {
  if (!isValidTripStartDate(tripStartDate) || lastDefinedDay === null || lastDefinedDay < 1) {
    return null;
  }

  const start = parseLocalDate(tripStartDate);
  if (!start) return null;

  const gameWindowDate = new Date(now);
  if (now.getHours() < 18) {
    gameWindowDate.setDate(gameWindowDate.getDate() - 1);
  }

  const activeDay = localCalendarDayNumber(gameWindowDate) - localCalendarDayNumber(start) + 1;
  return activeDay >= 1 && activeDay <= lastDefinedDay ? activeDay : null;
}

/**
 * Calcule le numéro de jour du voyage (story 14.1) :
 * - tant que la date courante est <= date de début, retourne 1
 * - sinon, incrémente de 1 par jour calendaire écoulé
 * - une date de début invalide/absente, ou dans le futur, retourne 1
 */
export function computeCurrentDay(
  tripStartDate: string | null | undefined,
  now: Date = new Date()
): number {
  if (!isValidTripStartDate(tripStartDate)) return 1;

  const start = parseLocalDate(tripStartDate);
  if (!start) return 1;

  const today = startOfLocalDay(now);
  const startDay = startOfLocalDay(start);
  const diffDays = Math.round((today.getTime() - startDay.getTime()) / 86_400_000);

  return diffDays <= 0 ? 1 : diffDays + 1;
}

/** Le voyage est terminé si le jour calculé dépasse le dernier jour défini. */
export function isTripFinished(currentDay: number, lastDefinedDay: number | null): boolean {
  if (lastDefinedDay === null) return false;
  return currentDay > lastDefinedDay;
}

/** Jour à utiliser pour l'affichage : ne dépasse jamais le dernier jour défini. */
export function clampToLastDefinedDay(currentDay: number, lastDefinedDay: number | null): number {
  if (lastDefinedDay === null) return currentDay;
  return Math.min(currentDay, lastDefinedDay);
}

/**
 * Nombre de jours restants avant le départ (compte à rebours "J-x").
 * Retourne null si la date de début est invalide/absente, ou si la date
 * courante a atteint/dépassé la date de début (le voyage a commencé,
 * plus de compte à rebours à afficher).
 */
export function computeDaysUntilStart(
  tripStartDate: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!isValidTripStartDate(tripStartDate)) return null;

  const start = parseLocalDate(tripStartDate);
  if (!start) return null;

  const today = startOfLocalDay(now);
  const startDay = startOfLocalDay(start);
  const diffDays = Math.round((startDay.getTime() - today.getTime()) / 86_400_000);

  return diffDays > 0 ? diffDays : null;
}
