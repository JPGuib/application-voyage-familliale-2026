// Fichier généré automatiquement par scripts/convert-visites-guidees.mjs — ne pas éditer à la main.
// Régénéré à chaque build (voir "prebuild" dans package.json) à partir de .docs/visites-guidees/*.docx
//
// Ce fichier placeholder existe pour que le projet compile avant la première
// exécution du script de conversion. Il sera écrasé au prochain build.

export type VisiteGuideeSection = { id: string; title: string };

export type VisiteGuideeContent = {
  id: string;
  html: string;
  toc: VisiteGuideeSection[];
};

export const VISITES_GUIDEES: Record<string, VisiteGuideeContent> = {};
