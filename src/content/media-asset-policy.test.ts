import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "..", "..");
const CONTENT_ROOT = path.join(ROOT, "src", "content");
const IMAGES_ROOT = path.join(ROOT, "public", "images");

const IMAGE_REF_REGEX = /(?<src>\/images\/[\w\s\-À-ÿ()._/]+?\.(png|jpg|jpeg|webp))/g;

function walkFiles(dir: string, extension: string, bucket: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, extension, bucket);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(extension)) {
      bucket.push(fullPath);
    }
  }
  return bucket;
}

function normalizeImageRef(src: string): string {
  return src.replace(/^\/images\//, "");
}

describe("media asset policy", () => {
  it("does not keep local /images refs with png/jpg/jpeg extensions", () => {
    const offenders: string[] = [];
    const files = walkFiles(CONTENT_ROOT, ".ts");

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf8");
      const matches = content.matchAll(IMAGE_REF_REGEX);
      for (const match of matches) {
        const src = match.groups?.src;
        if (!src) {
          continue;
        }
        if (!src.endsWith(".webp")) {
          offenders.push(`${path.relative(ROOT, filePath)} -> ${src}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps local /images refs that exist on disk", () => {
    const missing: string[] = [];
    const files = walkFiles(CONTENT_ROOT, ".ts");

    for (const filePath of files) {
      const content = fs.readFileSync(filePath, "utf8");
      const matches = content.matchAll(IMAGE_REF_REGEX);
      for (const match of matches) {
        const src = match.groups?.src;
        if (!src) {
          continue;
        }
        const diskPath = path.join(IMAGES_ROOT, normalizeImageRef(src));
        if (!fs.existsSync(diskPath)) {
          missing.push(`${path.relative(ROOT, filePath)} -> ${src}`);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});
