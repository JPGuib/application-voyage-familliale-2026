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
 * Blocs audio TTS : dans le Word, encadrez le texte à synthétiser entre deux
 * paragraphes contenant uniquement [🎧]. Le script génère un MP3 via Microsoft
 * Neural TTS (fr-FR-DeniseNeural) et l'insère en lecteur audio dans le HTML.
 * Les MP3 sont mis en cache dans public/audio/visites-guidees/{id}/ par hash
 * de contenu — un bloc dont le texte n'a pas changé n'est pas régénéré.
 *
 * Usage : node scripts/convert-visites-guidees.mjs
 * Appelé automatiquement avant le build via le script "prebuild" de package.json.
 */
import mammoth from "mammoth";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_DIR = path.join(ROOT, "docs", "visites-guidees");
const IMAGES_ROOT = path.join(ROOT, "public", "images", "places");
const AUDIO_ROOT = path.join(ROOT, "public", "audio", "visites-guidees");
const PUBLIC_GUIDES_ROOT = path.join(ROOT, "public", "visites-guidees");
const OUTPUT_FILE = path.join(ROOT, "src", "content", "generated", "visites-guidees.ts");

const TTS_VOICE = "fr-FR-HenriNeural";
// Regex correspondant à un paragraphe marqueur [🎧] seul (avec espaces optionnels).
const TTS_MARKER_RE = /<p[^>]*>\[🎧\]\s*<\/p>/;

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

function isExternalHref(href) {
  return /^(?:[a-z]+:)?\/\//i.test(href) || href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:");
}

function extractFileName(href) {
  const withoutQuery = href.split(/[?#]/)[0] ?? href;
  const segments = withoutQuery.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? withoutQuery;
}

function toGuideHref(href) {
  return `/visites-guidees/${href.replace(/^\.\//, "")}`;
}

function humanizeFileStem(stem) {
  return stem
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getGuideLinkLabel(href) {
  const fileName = extractFileName(href);
  const stem = fileName.replace(/\.html$/i, "");
  const lowerStem = stem.toLowerCase();

  if (lowerStem.includes("carte") || lowerStem.includes("map")) {
    return "Ouvrir la carte interactive";
  }

  const humanized = humanizeFileStem(stem);
  return humanized ? `Ouvrir ${humanized}` : "Ouvrir le document";
}

function shouldReplaceAnchorText(anchorText, href) {
  const normalizedText = anchorText.replace(/\s+/g, " ").trim().toLowerCase();
  if (!normalizedText) return true;

  const fileName = extractFileName(href).toLowerCase();
  const normalizedHref = href.replace(/^\.\//, "").toLowerCase();
  return normalizedText === fileName || normalizedText === normalizedHref;
}

function rewriteGuideLinks(html) {
  const linkedAnchors = html.replace(/<a\b([^>]*?)href="([^"]+)"([^>]*)>(.*?)<\/a>/gis, (match, beforeHref, href, afterHref, content) => {
    if (isExternalHref(href)) return match;

    let nextContent = content;
    if (!/<[^>]+>/.test(content) && shouldReplaceAnchorText(content, href)) {
      nextContent = getGuideLinkLabel(href);
    }

    return `<a${beforeHref}href="${toGuideHref(href)}"${afterHref}>${nextContent}</a>`;
  });

  return linkedAnchors.replace(/>([^<>]*)</g, (_match, textContent) => {
    const linkedText = textContent.replace(/\b(?:\.\/)?[A-Za-z0-9_./-]+\.html\b/g, (filename) => {
      return `<a href="${toGuideHref(filename)}">${getGuideLinkLabel(filename)}</a>`;
    });

    return `>${linkedText}<`;
  });
}

function syncPublicHtmlAssets() {
  fs.mkdirSync(PUBLIC_GUIDES_ROOT, { recursive: true });

  const htmlFiles = fs
    .readdirSync(SOURCE_DIR)
    .filter((file) => file.toLowerCase().endsWith(".html"));

  for (const file of htmlFiles) {
    fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(PUBLIC_GUIDES_ROOT, file));
  }
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

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function convertImageToWebp(sourcePath, targetPath) {
  const result = spawnSync(
    "ffmpeg",
    ["-y", "-loglevel", "error", "-i", sourcePath, "-c:v", "libwebp", "-q:v", "80", "-compression_level", "6", targetPath],
    { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }
  );

  if (result.error || result.status !== 0 || !fs.existsSync(targetPath) || fs.statSync(targetPath).size === 0) {
    return false;
  }

  return true;
}

async function generateTts(text, outputPath) {
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(TTS_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = await tts.toStream(text);
    await pipeline(audioStream, fs.createWriteStream(outputPath));
    return true;
  } catch (err) {
    console.warn(`  ⚠ TTS échoué (${path.basename(outputPath)}): ${err.message}`);
    return false;
  }
}

// Détecte les paires [🎧]...[🎧], génère les MP3 et insère les lecteurs audio.
async function processTtsBlocks(html, placeId) {
  const parts = html.split(TTS_MARKER_RE);
  // Nombre impair requis : [avant, bloc1, après] ou [avant, bloc1, entre, bloc2, après]
  if (parts.length < 3 || parts.length % 2 === 0) return { html, audioCount: 0 };

  const audioDir = path.join(AUDIO_ROOT, placeId);
  fs.mkdirSync(audioDir, { recursive: true });

  let result = "";
  let audioCount = 0;

  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) {
      result += parts[i];
    } else {
      const blockHtml = parts[i];
      const text = stripHtml(blockHtml);

      if (text.length > 10) {
        const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
        const filename = `${hash}.mp3`;
        const absPath = path.join(audioDir, filename);
        const relPath = `/audio/visites-guidees/${placeId}/${filename}`;

        const exists = fs.existsSync(absPath);
        const ok = exists || (await generateTts(text, absPath));

        if (ok) {
          const cached = exists ? " (cache)" : "";
          console.log(`    🎧 bloc audio${cached} → ${filename}`);
          result += `<audio controls class="w-full my-3 rounded-xl" src="${relPath}"></audio>`;
          audioCount++;
        }
      }

      result += blockHtml;
    }
  }

  return { html: result, audioCount };
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
      const filename = `image-${imageCounter}.webp`;
      const rawFilename = `image-${imageCounter}.${extension}`;
      const buffer = await image.read();
      const rawPath = path.join(imageDir, rawFilename);
      const webpPath = path.join(imageDir, filename);
      fs.writeFileSync(rawPath, buffer);

      const converted = convertImageToWebp(rawPath, webpPath);
      if (converted) {
        fs.unlinkSync(rawPath);
      } else {
        // Fallback if ffmpeg is unavailable or conversion fails for a specific image.
        fs.renameSync(rawPath, webpPath);
      }

      return { src: `/images/places/${placeId}/visite-guidee/${filename}` };
    }),
  };

  const result = await mammoth.convertToHtml({ path: docxPath }, options);

  if (result.messages.some((m) => m.type === "error")) {
    console.error(`Guide de visite "${placeId}": erreurs de conversion`, result.messages);
  }

  const { html, toc } = extractSections(result.value);
  const linkedHtml = rewriteGuideLinks(html);
  const styledHtml = applyStyling(linkedHtml);
  const { html: finalHtml, audioCount } = await processTtsBlocks(styledHtml, placeId);

  if (toc.length === 0) {
    console.warn(
      `Guide de visite "${placeId}": aucune section détectée (aucun texte entièrement en gras trouvé). ` +
        `Le contenu sera affiché sans sommaire.`
    );
  }

  return { id: placeId, html: finalHtml, toc, imageCount: imageCounter, audioCount };
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  if (!fs.existsSync(SOURCE_DIR)) {
    console.log(`Aucun dossier ${SOURCE_DIR} trouvé — aucun guide de visite à générer.`);
    fs.writeFileSync(OUTPUT_FILE, emptyOutput());
    return;
  }

  syncPublicHtmlAssets();

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
      console.log(`  ✓ ${entry.toc.length} section(s), ${entry.imageCount} image(s), ${entry.audioCount} bloc(s) audio.`);
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
