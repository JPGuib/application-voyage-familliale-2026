import { isValidTripStartDate } from "./trip-day";

type TripDayLabelFormat = "short" | "long";

type TripDayLabelOptions = {
  locale?: string;
  format?: TripDayLabelFormat;
  fallbackPrefix?: string;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseLocalDate(value: string): Date | null {
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function addLocalDays(date: Date, daysToAdd: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + daysToAdd);
  return next;
}

export function getTripDateForDay(
  day: number,
  tripStartDate: string | null | undefined
): Date | null {
  if (!Number.isFinite(day) || day < 1) return null;
  if (!isValidTripStartDate(tripStartDate)) return null;

  const start = parseLocalDate(tripStartDate);
  if (!start) return null;

  return addLocalDays(start, day - 1);
}

export function formatTripDayLabel(
  day: number,
  tripStartDate: string | null | undefined,
  options: TripDayLabelOptions = {}
): string {
  const { locale = "fr-FR", format = "short", fallbackPrefix = "Jour" } = options;
  const date = getTripDateForDay(day, tripStartDate);

  if (!date) {
    return `${fallbackPrefix} ${day}`;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    weekday: format === "long" ? "long" : "short",
    day: "numeric",
    month: "long",
    ...(format === "long" ? { year: "numeric" as const } : {}),
  });

  return formatter.format(date);
}

/**
 * Étiquette du jour "principal" (le plus tôt) d'un lieu pouvant couvrir
 * plusieurs jours (`Place.jour`/`AlbumSourcePlaceEntry.jour`), pour l'album
 * souvenir (chapitres triés chronologiquement, cf. buildEligiblePlaces dans
 * album-source.ts) : rappelle le jour de visite à côté du titre du chapitre
 * et en pied de page du PDF (retour utilisateur : "on perd rapidement le
 * jour de la visite").
 *
 * Cas limite : aucun jour connu pour ce lieu -> pas d'étiquette (`null`),
 * plutôt qu'un jour inventé.
 */
export function formatPrimaryTripDayLabel(
  jour: number[],
  tripStartDate: string | null | undefined,
  options: TripDayLabelOptions = {}
): string | null {
  if (!jour || jour.length === 0) {
    return null;
  }
  return formatTripDayLabel(Math.min(...jour), tripStartDate, options);
}
