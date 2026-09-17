import type { PlaceDayOrderOverrideMap, PlaceDayOverrideMap } from "../types/cloud";

// Regroupement d'un lieu par jour du voyage (jour(s) de base depuis
// `Place.jour`, éventuellement remplacé par un override propriétaire). Extrait
// de src/app/App.tsx (utilisé par le PlanningScreen et par la parsing des
// lieux ajoutés par le propriétaire) pour être réutilisable côté album souvenir
// (src/services/album-source.ts), qui a besoin de la même règle pour savoir à
// quel(s) jour(s) rattacher chaque lieu dans le planning du PDF.

export function normalizePlaceDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return Array.from(
    new Set(
      raw
        .map((day) => (typeof day === "number" && Number.isFinite(day) ? Math.trunc(day) : Number.NaN))
        .filter((day) => Number.isFinite(day) && day > 0)
    )
  ).sort((left, right) => left - right);
}

export function getBasePlaceDays(place: { jour?: number[] }): number[] {
  return normalizePlaceDays(place.jour ?? []);
}

export function getEffectivePlaceDays(
  place: { id: string; jour?: number[] },
  overrideMap: PlaceDayOverrideMap
): number[] {
  const overrideDays = overrideMap[place.id];
  return overrideDays && overrideDays.length > 0 ? overrideDays : getBasePlaceDays(place);
}

export function getPlaceOrderPositionForDay(
  placeId: string,
  day: number,
  orderMap: PlaceDayOrderOverrideMap
): number | null {
  const perDay = orderMap[placeId];
  if (!perDay) {
    return null;
  }
  const value = perDay[day];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : null;
}

export function sortPlacesForDay<T extends { id: string }>(
  places: T[],
  day: number,
  orderMap: PlaceDayOrderOverrideMap,
  fallbackIndexMap: Record<string, number>
): T[] {
  const base = [...places].sort(
    (left, right) =>
      (fallbackIndexMap[left.id] ?? Number.MAX_SAFE_INTEGER) -
      (fallbackIndexMap[right.id] ?? Number.MAX_SAFE_INTEGER)
  );

  const positioned = base
    .map((item) => ({
      item,
      desiredPosition: getPlaceOrderPositionForDay(item.id, day, orderMap),
      fallbackIndex: fallbackIndexMap[item.id] ?? Number.MAX_SAFE_INTEGER,
    }))
    .filter((entry): entry is { item: T; desiredPosition: number; fallbackIndex: number } =>
      entry.desiredPosition !== null
    )
    .sort((left, right) => {
      if (left.desiredPosition !== right.desiredPosition) {
        return left.desiredPosition - right.desiredPosition;
      }
      return left.fallbackIndex - right.fallbackIndex;
    });

  const ordered = [...base];
  for (const entry of positioned) {
    const currentIndex = ordered.findIndex((item) => item.id === entry.item.id);
    if (currentIndex === -1) {
      continue;
    }
    const [moved] = ordered.splice(currentIndex, 1);
    const targetIndex = Math.max(0, Math.min(entry.desiredPosition - 1, ordered.length));
    ordered.splice(targetIndex, 0, moved);
  }

  return ordered;
}
