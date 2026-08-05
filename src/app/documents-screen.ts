import type { DocumentCategory, TravelDocument } from "../content/documents";

type PlaceLike = {
  tag?: string;
  history?: string;
};

type PlaceWithVolTag = PlaceLike & {
  tag: "Vol";
};

export function getVolPlaces<T extends PlaceLike>(places: readonly T[]): Array<T & PlaceWithVolTag> {
  return places.filter((place): place is T & PlaceWithVolTag => place.tag === "Vol");
}

export type DocumentsByCategory = Record<DocumentCategory, TravelDocument[]>;

export function groupDocumentsByCategory(docs: readonly TravelDocument[]): DocumentsByCategory {
  const initial: DocumentsByCategory = {
    "Hébergement": [],
    "Assurance/Santé": [],
    "Réservations diverses": [],
  };

  return docs.reduce((acc, doc) => {
    acc[doc.category].push(doc);
    return acc;
  }, initial);
}
