import type { GuideSection } from "../types/cloud";

/**
 * Extrait le contenu texte (titres, paragraphes, listes à puces) du HTML d'un
 * guide de visite détaillé généré par scripts/convert-visites-guidees.mjs
 * (cf. src/content/generated/visites-guidees.ts, VISITES_GUIDEES[placeId].html),
 * pour l'inclure dans l'album souvenir (story 30.6).
 *
 * Structure attendue en sortie du générateur : une suite de <h2> (titre de
 * section), <p> (paragraphe), <ul>/<li> (liste), <img>/<audio> (média). Seuls
 * les 3 premiers ont un sens en PDF (les photos du lieu sont déjà affichées
 * dans sa galerie) : <img>/<audio> sont ignorés silencieusement.
 *
 * Utilise DOMParser (disponible côté navigateur, même contexte que le
 * `dangerouslySetInnerHTML` déjà utilisé pour ce contenu dans
 * VisiteGuideeScreen) plutôt qu'un parsing regex maison, pour rester robuste
 * à la structure HTML réelle.
 *
 * Cas limite : HTML vide/absent, ou parsing impossible, retourne [] plutôt
 * que de faire échouer l'export de l'album.
 */
export function extractGuideSections(html: string | null | undefined): GuideSection[] {
  if (!html || typeof html !== "string" || !html.trim()) {
    return [];
  }

  let root: HTMLElement;
  try {
    root = new DOMParser().parseFromString(html, "text/html").body;
  } catch {
    return [];
  }

  const sections: GuideSection[] = [];
  let current: GuideSection | null = null;

  for (const node of Array.from(root.children)) {
    const tag = node.tagName.toLowerCase();

    if (tag === "h2") {
      const title = (node.textContent ?? "").trim();
      if (!title) continue;
      current = { title, paragraphs: [], bullets: [] };
      sections.push(current);
      continue;
    }

    if (!current) {
      // Contenu avant le premier titre (cas limite non prévu par le
      // générateur actuel, mais on ne le perd pas silencieusement).
      current = { title: "", paragraphs: [], bullets: [] };
      sections.push(current);
    }

    if (tag === "p") {
      const text = (node.textContent ?? "").trim();
      if (text) {
        current.paragraphs.push(text);
      }
    } else if (tag === "ul" || tag === "ol") {
      for (const item of Array.from(node.querySelectorAll("li"))) {
        const text = (item.textContent ?? "").trim();
        if (text) {
          current.bullets.push(text);
        }
      }
    }
    // <img>, <audio>, ou toute autre balise : ignorés volontairement.
  }

  return sections;
}
