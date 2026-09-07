import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const workspaceRoot = process.cwd();
const batchSize = 8;

function collectTestFiles(directory) {
  const files = [];

  for (const entry of readdirSync(join(workspaceRoot, directory), { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(entryPath));
    } else if (/\.test\.(ts|tsx)$/.test(entry.name)) {
      files.push(relative(workspaceRoot, join(workspaceRoot, entryPath)).replaceAll("\\", "/"));
    }
  }

  return files;
}

const testFiles = ["src", "firebase"]
  .flatMap(collectTestFiles)
  .sort((first, second) => first.localeCompare(second));

const vitestCommand = "node_modules/vitest/vitest.mjs";

for (let start = 0; start < testFiles.length; start += batchSize) {
  const batch = testFiles.slice(start, start + batchSize);
  const batchNumber = Math.floor(start / batchSize) + 1;
  const batchCount = Math.ceil(testFiles.length / batchSize);

  console.log(`\nRunning Vitest batch ${batchNumber}/${batchCount} (${batch.length} files)`);
  const result = spawnSync(process.execPath, [vitestCommand, "run", ...batch], {
    cwd: workspaceRoot,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`\nAll ${testFiles.length} Vitest files passed.`);