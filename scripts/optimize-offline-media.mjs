#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMAGES_ROOT = path.join(ROOT, "public", "images");
const AUDIO_ROOT = path.join(ROOT, "public", "audio");
const CONTENT_ROOT = path.join(ROOT, "src", "content");
const DIAGNOSTICS_ROOT = path.join(ROOT, "docs", "diagnostics");

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg"]);
const CONTENT_EXT = ".ts";
const AUDIO_THRESHOLD_BITRATE = 128000;
const AUDIO_TARGET_BITRATE = "96k";

function walkFiles(dir, filter, bucket = []) {
  if (!fs.existsSync(dir)) {
    return bucket;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, filter, bucket);
      continue;
    }
    if (entry.isFile() && filter(fullPath)) {
      bucket.push(fullPath);
    }
  }
  return bucket;
}

function sumSizes(paths) {
  return paths.reduce((total, filePath) => total + fs.statSync(filePath).size, 0);
}

function formatMiB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function runCommand(command, args) {
  const result = spawnSync(command, args, { stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" });
  if (result.error) {
    throw result.error;
  }
  return result;
}

function fileRefFromDiskPath(diskPath) {
  const relativeToImages = path.relative(IMAGES_ROOT, diskPath).split(path.sep).join("/");
  return `/images/${relativeToImages}`;
}

function diskPathFromRef(ref) {
  return path.join(IMAGES_ROOT, ref.replace(/^\/images\//, "").split("/").join(path.sep));
}

function replaceImageRefs(refMap) {
  const contentFiles = walkFiles(CONTENT_ROOT, (p) => p.endsWith(CONTENT_EXT));
  let updatedFiles = 0;

  for (const filePath of contentFiles) {
    let content = fs.readFileSync(filePath, "utf8");
    let next = content;
    for (const [oldRef, newRef] of refMap.entries()) {
      next = next.split(oldRef).join(newRef);
    }
    if (next !== content) {
      fs.writeFileSync(filePath, next, "utf8");
      updatedFiles += 1;
    }
  }

  return updatedFiles;
}

function ffprobeBitrate(filePath) {
  const result = runCommand("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=bit_rate",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);

  if (result.status !== 0) {
    return null;
  }

  const value = Number((result.stdout || "").trim());
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

function optimizeImages() {
  const imageSources = walkFiles(IMAGES_ROOT, (p) => IMAGE_EXTS.has(path.extname(p).toLowerCase()));
  const conversions = [];
  const refMap = new Map();

  for (const source of imageSources) {
    const target = source.replace(/\.(png|jpg|jpeg)$/i, ".webp");
    const sourceRef = fileRefFromDiskPath(source);
    const targetRef = fileRefFromDiskPath(target);

    const result = runCommand("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      source,
      "-c:v",
      "libwebp",
      "-q:v",
      "80",
      "-compression_level",
      "6",
      target,
    ]);

    if (result.status !== 0 || !fs.existsSync(target) || fs.statSync(target).size === 0) {
      continue;
    }

    conversions.push({
      source,
      target,
      sourceSize: fs.statSync(source).size,
      targetSize: fs.statSync(target).size,
    });
    refMap.set(sourceRef, targetRef);
  }

  const updatedContentFiles = replaceImageRefs(refMap);

  let removedOriginals = 0;
  for (const conversion of conversions) {
    if (fs.existsSync(conversion.source)) {
      fs.unlinkSync(conversion.source);
      removedOriginals += 1;
    }
  }

  return {
    sourceCount: imageSources.length,
    convertedCount: conversions.length,
    removedOriginals,
    updatedContentFiles,
    conversions,
  };
}

function optimizeAudio() {
  const mp3Files = walkFiles(AUDIO_ROOT, (p) => p.toLowerCase().endsWith(".mp3"));
  const audited = [];
  const reencoded = [];

  for (const filePath of mp3Files) {
    const bitrate = ffprobeBitrate(filePath);
    if (!bitrate) {
      continue;
    }

    audited.push({ filePath, bitrate });

    if (bitrate <= AUDIO_THRESHOLD_BITRATE) {
      continue;
    }

    const tempPath = `${filePath}.tmp.mp3`;
    const result = runCommand("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      "-i",
      filePath,
      "-ac",
      "1",
      "-b:a",
      AUDIO_TARGET_BITRATE,
      tempPath,
    ]);

    if (result.status !== 0 || !fs.existsSync(tempPath) || fs.statSync(tempPath).size === 0) {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      continue;
    }

    const sourceSize = fs.statSync(filePath).size;
    const targetSize = fs.statSync(tempPath).size;
    if (targetSize >= sourceSize) {
      fs.unlinkSync(tempPath);
      continue;
    }

    fs.renameSync(tempPath, filePath);
    reencoded.push({ filePath, sourceSize, targetSize, bitrate });
  }

  return {
    mp3Count: mp3Files.length,
    auditedCount: audited.length,
    reencodedCount: reencoded.length,
    reencoded,
  };
}

function collectStats() {
  const imagesAll = walkFiles(IMAGES_ROOT, () => true);
  const audioAll = walkFiles(AUDIO_ROOT, () => true);

  const imageFiles = imagesAll.filter((p) => fs.statSync(p).isFile());
  const audioFiles = audioAll.filter((p) => fs.statSync(p).isFile());

  return {
    imageBytes: sumSizes(imageFiles),
    imageCount: imageFiles.length,
    audioBytes: sumSizes(audioFiles),
    audioCount: audioFiles.length,
    totalBytes: sumSizes([...imageFiles, ...audioFiles]),
  };
}

function writeReport(before, after, imageResult, audioResult) {
  fs.mkdirSync(DIAGNOSTICS_ROOT, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const reportPath = path.join(DIAGNOSTICS_ROOT, `media-optimization-27-1-${date}.md`);
  const reductionPercent = before.totalBytes > 0
    ? (((before.totalBytes - after.totalBytes) / before.totalBytes) * 100).toFixed(2)
    : "0.00";

  const lines = [
    "# Story 27.1 - Media optimization report",
    "",
    `Date: ${new Date().toISOString()}`,
    "",
    "## Inventory and optimization summary",
    `- Image conversions attempted scope: ${imageResult.sourceCount}`,
    `- Images converted to WebP: ${imageResult.convertedCount}`,
    `- Original PNG/JPEG removed: ${imageResult.removedOriginals}`,
    `- Content files updated: ${imageResult.updatedContentFiles}`,
    `- MP3 files audited: ${audioResult.auditedCount}/${audioResult.mp3Count}`,
    `- MP3 files re-encoded: ${audioResult.reencodedCount}`,
    "",
    "## Size measurements",
    "| Metric | Before | After | Delta |",
    "|---|---:|---:|---:|",
    `| public/images | ${formatMiB(before.imageBytes)} MiB | ${formatMiB(after.imageBytes)} MiB | ${formatMiB(after.imageBytes - before.imageBytes)} MiB |`,
    `| public/audio | ${formatMiB(before.audioBytes)} MiB | ${formatMiB(after.audioBytes)} MiB | ${formatMiB(after.audioBytes - before.audioBytes)} MiB |`,
    `| total (images+audio) | ${formatMiB(before.totalBytes)} MiB | ${formatMiB(after.totalBytes)} MiB | ${formatMiB(after.totalBytes - before.totalBytes)} MiB |`,
    "",
    `Overall reduction: ${reductionPercent}%`,
    "",
    "## Notes",
    "- Remote external URLs were not modified.",
    "- Re-encoding of MP3 was limited to files above the configured bitrate threshold and only kept when resulting file size decreased.",
  ];

  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  return reportPath;
}

function main() {
  const before = collectStats();
  const imageResult = optimizeImages();
  const audioResult = optimizeAudio();
  const after = collectStats();
  const reportPath = writeReport(before, after, imageResult, audioResult);

  console.log("Media optimization complete");
  console.log(`Report: ${path.relative(ROOT, reportPath)}`);
  console.log(`Images converted: ${imageResult.convertedCount}`);
  console.log(`Audio re-encoded: ${audioResult.reencodedCount}`);
  console.log(`Total reduction: ${(((before.totalBytes - after.totalBytes) / before.totalBytes) * 100).toFixed(2)}%`);
}

main();
