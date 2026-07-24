#!/usr/bin/env node
/**
 * Convertit docs/jours-destinations.csv en un fichier TS exploitable par
 * l'application (story 14.2). Tolère les colonnes supplémentaires (elles sont
 * conservées telles quelles, sans faire planter le parsing) et signale (sans
 * bloquer le build) les jours dupliqués ou manquants dans la séquence.
 *
 * Usage : node scripts/convert-jours-destinations.mjs
 * Appelé automatiquement avant le build via le script "prebuild" de package.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SOURCE_FILE = path.join(ROOT, "docs", "jours-destinations.csv");
const OUTPUT_FILE = path.join(ROOT, "src", "content", "generated", "jours-destinations.ts");

// Parseur CSV minimal mais robuste aux champs entre guillemets contenant des
// virgules (ex: "Istanbul, Palais de Topkapi"), sans dépendance externe.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function buildEntries(csvText) {
  const rows = parseCsv(csvText);
  if (rows.length === 0) return [];

  const headers = rows[0].map((h) => h.trim());
  const jourIndex = headers.indexOf("jour");

  if (jourIndex === -1) {
    console.error('Colonne "jour" introuvable dans docs/jours-destinations.csv — fichier ignoré.');
    return [];
  }

  const entries = [];
  for (const row of rows.slice(1)) {
    const jourRaw = (row[jourIndex] ?? "").trim();
    const jour = Number.parseInt(jourRaw, 10);
    if (!Number.isFinite(jour)) {
      console.warn(`Ligne ignorée (jour invalide: "${jourRaw}").`);
      continue;
    }

    const entry = { jour };
    headers.forEach((header, i) => {
      if (header === "jour") return;
      entry[header] = (row[i] ?? "").trim();
    });
    entries.push(entry);
  }

  return entries.sort((a, b) => a.jour - b.jour);
}

function validate(entries) {
  const seen = new Map();
  for (const entry of entries) {
    seen.set(entry.jour, (seen.get(entry.jour) ?? 0) + 1);
  }
  for (const [jour, count] of seen) {
    if (count > 1) {
      console.warn(`⚠ Jour ${jour} apparaît ${count} fois dans docs/jours-destinations.csv — vérifiez le fichier.`);
    }
  }

  const days = [...seen.keys()].sort((a, b) => a - b);
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] - days[i - 1] > 1) {
      console.warn(
        `⚠ Trou dans la séquence des jours : ${days[i - 1]} puis ${days[i]} (jour(s) manquant(s) entre les deux).`
      );
    }
  }
}

function main() {
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });

  let entries = [];
  if (!fs.existsSync(SOURCE_FILE)) {
    console.log(`Aucun fichier ${path.relative(ROOT, SOURCE_FILE)} trouvé — aucune destination de jour chargée.`);
  } else {
    const csvText = fs.readFileSync(SOURCE_FILE, "utf-8");
    entries = buildEntries(csvText);
    validate(entries);
    console.log(`${entries.length} jour(s) chargé(s) depuis ${path.relative(ROOT, SOURCE_FILE)}.`);
  }

  const output = `// Fichier généré automatiquement par scripts/convert-jours-destinations.mjs — ne pas éditer à la main.
// Régénéré à chaque build (voir "prebuild" dans package.json) à partir de docs/jours-destinations.csv

export type JourDestination = {
  jour: number;
  destination: string;
  visites_prevues: string;
  [key: string]: string | number;
};

export const JOURS_DESTINATIONS: JourDestination[] = ${JSON.stringify(entries, null, 2)};
`;

  fs.writeFileSync(OUTPUT_FILE, output);
}

main();
