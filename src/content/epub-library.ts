export type EpubLibraryItem = {
  id: string;
  title: string;
  author?: string;
  url: string;
};

const RAW_EPUB_LIBRARY: EpubLibraryItem[] = [
  {
    id: "easy-turquie-recettes",
    title: "Easy Turquie - Les meilleures recettes",
    url: "/docs/Livres/Easy Turquie_ Les meilleures recettes.epub",
  },
  {
    id: "routard-turquie-2025-2026",
    title: "Guide du Routard Turquie 2025-2026",
    author: "Collectif",
    url: "/docs/Livres/Guide du Routard Turquie 202526 (Collectif).epub",
  },
  {
    id: "petit-fute-carnet-2025-2026",
    title: "Guide Turquie 2025-2026 Carnet Petit Fute",
    url: "/docs/Livres/Guide Turquie 20252026 Carnet Petit Futé.epub",
  },
  {
    id: "petit-fute-2025-2026",
    title: "Guide Turquie 2025-2026 Petit Fute",
    url: "/docs/Livres/Guide Turquie 20252026 Petit Futé.epub",
  },
];

export const EPUB_LIBRARY: EpubLibraryItem[] = RAW_EPUB_LIBRARY.map((book) => ({
  ...book,
  url: encodeURI(book.url),
}));
