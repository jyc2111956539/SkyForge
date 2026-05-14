#!/usr/bin/env node

import { chmodSync } from "node:fs";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const preferredGit = "D:/Program Files/Git/cmd/git.exe";
const gitCommand = existsSync(preferredGit) ? `"${preferredGit}"` : "git";

execSync(`${gitCommand} config core.hooksPath .githooks`, { stdio: "inherit" });

try {
  chmodSync(".githooks/pre-commit", 0o755);
} catch {
  // Ignore chmod failures on restricted filesystems.
}

console.log("Git hooks installed: core.hooksPath=.githooks");
