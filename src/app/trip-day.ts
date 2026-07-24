// Logique de calcul du "jour du voyage" (story 14.1).
//
// Le calcul se base sur la date système de l'appareil (pas un fuseau horaire
// canonique unique), en comparant deux dates locales "sans heure".

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidTripStartDate(value: string | null | undefined): value is string {
  return typeof value === "string" && DATE_PATTERN.test(value);
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
