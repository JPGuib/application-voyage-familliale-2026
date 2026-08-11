import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type TravelDocument,
} from "../content/documents";

export type DocumentsByCategory = Record<DocumentCategory, TravelDocument[]>;

export function normalizeDocumentDays(value: number | number[] | undefined): number[] {
  if (Array.isArray(value)) {
    const uniqueDays = Array.from(
      new Set(
        value
          .map((day) => Number(day))
          .filter((day) => Number.isFinite(day) && day > 0)
          .map((day) => Math.trunc(day))
      )
    );
    uniqueDays.sort((a, b) => a - b);
    return uniqueDays;
  }

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return [Math.trunc(value)];
  }

  return [];
}

export function groupDocumentsByCategory(docs: readonly TravelDocument[]): DocumentsByCategory {
  const initial = DOCUMENT_CATEGORIES.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, {} as DocumentsByCategory);

  return docs.reduce((acc, doc) => {
    if (!acc[doc.category]) {
      acc[doc.category] = [];
    }
    acc[doc.category].push(doc);
    return acc;
  }, initial);
}

export function filterDocuments(
  docs: readonly TravelDocument[],
  filters: {
    days?: readonly number[];
    title?: string;
  }
): TravelDocument[] {
  const normalizedTitle = filters.title?.trim().toLocaleLowerCase("fr-FR") ?? "";
  const normalizedDays = Array.from(new Set((filters.days ?? []).filter((day) => day > 0)));

  return docs.filter((doc) => {
    const docDays = normalizeDocumentDays(doc.day);
    const matchesDay =
      normalizedDays.length === 0 || normalizedDays.some((day) => docDays.includes(day));
    const matchesTitle =
      !normalizedTitle || doc.title.toLocaleLowerCase("fr-FR").includes(normalizedTitle);

    return matchesDay && matchesTitle;
  });
}
