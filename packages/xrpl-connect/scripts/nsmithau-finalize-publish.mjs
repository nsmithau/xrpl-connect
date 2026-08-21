#!/usr/bin/env node
/**
 * nsmithau finalize step after `pnpm publish:build`.
 *
 * - Renames the facade to @nsmithau/xrpl-connect for GitHub Packages
 * - Pins a unique develop version (0.x.y-develop.<sha>)
 * - Neutralizes AMD define(["./…"]) so Next/Turbopack does not try to resolve
 *   crypto-js relative modules inside the rolled bundle
 * - Wraps `new globalThis?.X` for broader SWC/webpack parse safety
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "../dist-publish");
const pkgPath = path.join(distDir, "package.json");

if (!fs.existsSync(pkgPath)) {
  console.error("✗ dist-publish/package.json missing — run publish:build first");
  process.exit(1);
}

const shortSha = execSync("git rev-parse --short HEAD", {
  cwd: path.join(__dirname, "../../.."),
  encoding: "utf8",
}).trim();

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const baseVersion = String(pkg.version).split("-")[0];

pkg.name = "@nsmithau/xrpl-connect";
pkg.version = `${baseVersion}-develop.${shortSha}.2`;
pkg.publishConfig = {
  registry: "https://npm.pkg.github.com",
  access: "public",
};
pkg.repository = {
  type: "git",
  url: "git+https://github.com/nsmithau/xrpl-connect.git",
};
pkg.homepage = "https://github.com/nsmithau/xrpl-connect#readme";
pkg.bugs = {
  url: "https://github.com/nsmithau/xrpl-connect/issues",
};
pkg.nsmithau = {
  upstream: "XRPL-Commons/xrpl-connect",
  ref: "develop",
  sha: shortSha,
};

// Widen xrpl peer so Next apps on xrpl@5 install cleanly.
pkg.peerDependencies = {
  ...(pkg.peerDependencies || {}),
  xrpl: "^3.0.0 || ^4.0.0 || ^5.0.0",
};

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`✓ Manifest → ${pkg.name}@${pkg.version}`);

function patchBundle(file) {
  const full = path.join(distDir, file);
  if (!fs.existsSync(full)) {
    console.warn(`⚠ skip missing ${file}`);
    return;
  }
  let text = fs.readFileSync(full, "utf8");
  const amdBefore = (text.match(/define\.amd/g) || []).length;
  // Drop AMD branches that pass relative module ids (Turbopack TP1200).
  text = text.replace(
    /typeof define\s*==\s*"function"\s*&&\s*define\.amd\s*\?\s*define\(\[[^\]]*\]\s*,\s*[A-Za-z_$][\w$]*\s*\)\s*:\s*/g,
    "",
  );
  // Turbopack rejects `new foo?.bar` / `new (foo?.bar)` — drop optional chain on ctor.
  text = text.replace(
    /new\s+\(globalThis\?\.([A-Za-z0-9_]+)\)/g,
    "new (globalThis.$1)",
  );
  text = text.replace(
    /new\s+globalThis\?\.([A-Za-z0-9_]+)/g,
    "new (globalThis.$1)",
  );
  const amdAfter = (text.match(/define\.amd/g) || []).length;
  fs.writeFileSync(full, text);
  console.log(`✓ Patched ${file} (define.amd refs ${amdBefore} → ${amdAfter})`);
}

patchBundle("xrpl-connect.mjs");
patchBundle("xrpl-connect.umd.js");
console.log("✓ nsmithau finalize complete");
