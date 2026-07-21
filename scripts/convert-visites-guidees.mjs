#!/usr/bin/env node
/**
 * Convertit les documents Word de docs/visites-guidees/*.docx en contenu
 * structuré exploitable par l'application, et extrait les photos embarquées
 * dans public/images/places/{id}/visite-guidee/.
 *
 * Convention de nommage : le nom du fichier (sans extension) doit être
 * l'identifiant du lieu tel qu'utilisé dans src/content/places.ts
 * (ex : docs/visites-guidees/topkapi.docx pour le lieu id: "topkapi").
 *
 * Détection des sections : le document ne doit PAS utiliser les styles
 * Word "Titre 1/2" — un paragraphe est considéré comme un titre de section
 * dès lors que tout son texte est en gras.
 *
 * Usage : node scripts/convert-visites-guidees.mjs
 * Appelé automatiquement avant le build via le script "prebuild" de package.json.
 */
import mammoth from "mammoth";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "docs", "visites-guidees");
const IMAGES_ROOT = path.join(ROOT, "public", "images", "places");
const OUTPUT_FILE = path.join(ROOT, "src", "content", "generated", "visites-guidees.ts");

function isFullyBoldParagraph(paragraph) {
  const runs = paragraph.children.filter((c) => c.type === "run");
  if (runs.length === 0) return false;
  return runs.every((run) => run.isBold);
}

function makeTransformDocument() {
  return mammoth.transforms.paragraph((element) => {
    if (element.type === "paragraph" && isFullyBoldParagraph(element)) {
      return { ...element, styleId: "Heading2", styleName: "Heading 2" };
    }
    return element;
  });
}

// Ajoute un id="section-N" à chaque titre détecté et construit le sommaire.
function extractSections(html) {
  let index = 0;
  const toc = [];
  const withIds = html.replace(/<h2><strong>(.*?)<\/strong><\/h2>/g, (_match, title) => {
    const id = `section-${index}`;
    toc.push({ id, title });
    index += 1;
    return `<h2 id="${id}">${title}</h2>`;
  });
  return { html: withIds, toc };
}

// Injecte des classes Tailwind pour que le HTML converti s'intègre visuellement
// au reste de l'application (le composant React ne fait que du dangerouslySetInnerHTML).
function applyStyling(html) {
  return html
    .replace(/<h2 /g, '<h2 class="text-base font-black text-foreground mt-6 mb-2 first:mt-0" ')
    .replace(/<p>/g, '<p class="mb-3">')
    .replace(/<img /g, '<img class="w-full rounded-2xl my-3 object-cover" loading="lazy" ')
    .replace(/<a /g, '<a class="text-primary underline break-all" target="_blank" rel="noopener noreferrer" ')
    .replace(/<ul>/g, '<ul class="list-disc pl-5 mb-3 space-y-1">')
    .replace(/<ol>/g, '<ol class="list-decimal pl-5 mb-3 space-y-1">');
}

async function convertOne(placeId, docxPath) {
  const imageDir = path.join(IMAGES_ROOT, placeId, "visite-guidee");
  fs.mkdirSync(imageDir, { recursive: true });
  let imageCounter = 0;

  const options = {
    transformDocument: makeTransformDocument(),
    convertImage: mammoth.images.imgElement(async (image) => {
      imageCounter += 1;
      const extension = image.contentType.split("/")[1] || "png";
      const filename = `image-${imageCounter}.${extension}`;
      const buffer = await image.read();
      fs.writeFileSync(path.join(imageDir, filename), buffer);
      return { src: `/images/places/${placeId}/visite-guidee/${filename}` };
    }),
  };

  const result = await mammoth.convertToHtml({ path: docxPath }, options);

  if (result.messages.some((m) => m.type === "error")) {
    console.error(`Guide de visite "${placeId}": erreurs de conversion`, result.messages);
  }

  const { html, toc } = extractSections(result.value);
  const styledHtml = applyStyling(html);

  if (toc.length === 0) {
    console.warn(
      `Guide de visite "${placeId}": aucune section détectée (aucun texte entièrement en gras trouvé). ` +
        `Le contenu sera affiché sans sommaire.`
    );
  }

  return { id: placeId, html: styledHtml, toc, imageCount: imageCounter };
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  if (!fs.existsSync(SOURCE_DIR)) {
    console.log(`Aucun dossier ${SOURCE_DIR} trouvé — aucun guide de visite à générer.`);
    fs.writeFileSync(OUTPUT_FILE, emptyOutput());
    return;
  }

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => f.endsWith(".docx") && !f.startsWith("~$"));

  if (files.length === 0) {
    console.log("Aucun document .docx trouvé dans docs/visites-guidees/.");
    fs.writeFileSync(OUTPUT_FILE, emptyOutput());
    return;
  }

  const entries = [];
  for (const file of files) {
    const placeId = path.basename(file, ".docx");
    const docxPath = path.join(SOURCE_DIR, file);
    console.log(`Conversion de ${file} → id "${placeId}"...`);
    try {
      const entry = await convertOne(placeId, docxPath);
      entries.push(entry);
      console.log(`  ✓ ${entry.toc.length} section(s), ${entry.imageCount} image(s) extraite(s).`);
    } catch (err) {
      console.error(`  ✗ Échec de la conversion de ${file}:`, err.message);
    }
  }

  const body = entries
    .map((e) => `  ${JSON.stringify(e.id)}: ${JSON.stringify({ id: e.id, html: e.html, toc: e.toc })},`)
    .join("\n");

  fs.writeFileSync(OUTPUT_FILE, wrapOutput(body));
  console.log(`\n${entries.length} guide(s) de visite généré(s) dans ${path.relative(ROOT, OUTPUT_FILE)}.`);
}

function emptyOutput() {
  return wrapOutput("");
}

function wrapOutput(body) {
  return `// Fichier généré automatiquement par scripts/convert-visites-guidees.mjs — ne pas éditer à la main.
// Régénéré à chaque build (voir "prebuild" dans package.json) à partir de docs/visites-guidees/*.docx

export type VisiteGuideeSection = { id: string; title: string };

export type VisiteGuideeContent = {
  id: string;
  html: string;
  toc: VisiteGuideeSection[];
};

export const VISITES_GUIDEES: Record<string, VisiteGuideeContent> = {
${body}
};
`;
}

main().catch((err) => {
  console.error("Échec du script de conversion des guides de visite:", err);
  process.exit(1);
});
