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
