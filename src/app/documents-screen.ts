import {
  DOCUMENT_CATEGORIES,
  type DocumentCategory,
  type TravelDocument,
} from "../content/documents";

export type DocumentsByCategory = Record<DocumentCategory, TravelDocument[]>;

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
