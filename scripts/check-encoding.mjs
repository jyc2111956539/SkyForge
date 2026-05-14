#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT = process.cwd();

const SCAN_EXTENSIONS = new Set([
  ".md",
  ".json",
  ".js",
  ".mjs",
  ".cjs",
  ".ts",
  ".mts",
  ".cts",
  ".vue",
  ".yml",
  ".yaml",
  ".toml",
  ".txt",
]);

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "docs/.vuepress/.cache",
  "docs/.vuepress/.temp",
  "docs/.vuepress/dist",
]);

const SKIP_FILES = new Set(["scripts/check-encoding.mjs"]);

const SUSPECT_PATTERN =
  /�|Ã|ðŸ|鍏|闂|锛|锟|鈥|馃|鉂|瑙|鏂|璇|缁|妗|瀵|鎶|姝/;

const offenders = [];

function shouldSkip(path) {
  return [...SKIP_DIRS].some((skip) => path === skip || path.startsWith(skip + "/"));
}

function walk(dirRelative = "") {
  const dirAbsolute = join(ROOT, dirRelative);
  const entries = readdirSync(dirAbsolute);

  for (const name of entries) {
    const childRelative = dirRelative ? `${dirRelative}/${name}` : name;
    if (shouldSkip(childRelative)) {
      continue;
    }

    const childAbsolute = join(ROOT, childRelative);
    const info = statSync(childAbsolute);

    if (info.isDirectory()) {
      walk(childRelative);
      continue;
    }

    if (!SCAN_EXTENSIONS.has(extname(name).toLowerCase())) {
      continue;
    }

    if (SKIP_FILES.has(childRelative)) {
      continue;
    }

    const content = readFileSync(childAbsolute, "utf8");
    if (!SUSPECT_PATTERN.test(content)) {
      continue;
    }

    const firstLine = content.split(/\r?\n/).findIndex((line) => SUSPECT_PATTERN.test(line));
    offenders.push({
      file: childRelative,
      line: firstLine + 1,
    });
  }
}

walk();

if (offenders.length > 0) {
  console.error("Detected possible mojibake/encoding issues:");
  for (const item of offenders) {
    console.error(`- ${item.file}:${item.line}`);
  }
  console.error("Please fix the encoding (UTF-8) before commit.");
  process.exit(1);
}

console.log("Encoding check passed.");
