import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type TravelDocument,
} from "../content/documents";

export type DocumentsByCategory = Record<DocumentCategory, TravelDocument[]>;

export type DocumentSortMode = "day" | "name";

export function groupDocumentsByCategory(docs: readonly TravelDocument[]): DocumentsByCategory {
  const initial = DOCUMENT_CATEGORIES.reduce((acc, category) => {
    acc[category] = [];
    return acc;
  }, {} as DocumentsByCategory);

  return docs.reduce((acc, doc) => {
    acc[doc.category].push(doc);
    return acc;
  }, initial);
}

export function sortDocuments(
  docs: readonly TravelDocument[],
  mode: DocumentSortMode
): TravelDocument[] {
  const cloned = [...docs];
  if (mode === "day") {
    return cloned.sort((a, b) => {
      const leftDay = a.day ?? Number.POSITIVE_INFINITY;
      const rightDay = b.day ?? Number.POSITIVE_INFINITY;
      if (leftDay !== rightDay) {
        return leftDay - rightDay;
      }
      return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
    });
  }

  return cloned.sort((a, b) =>
    a.title.localeCompare(b.title, "fr", { sensitivity: "base" })
  );
}
