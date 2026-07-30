# Sigil137 fork notes

This is a fork of [XRPL-Commons/xrpl-connect](https://github.com/XRPL-Commons/xrpl-connect) used to publish **`@sigil137/xrpl-connect`** to GitHub Packages for Sigil apps (Next.js / Vercel).

## Why

Upstream `develop` is a monorepo (`workspace:*`) with no installable git package for consumers. Sigil apps need a registry artifact, plus a small Next/Turbopack-safe patch for AMD `define(["./…"])` leftovers in the rolled crypto-js bundle.

## Fork fix

`packages/xrpl-connect` `publish:build` also runs `vp pack` for this package (upstream’s `{.}^...` filter only builds workspace dependencies). Without that, `build-types` fails because `dist/index.d.ts` is missing.


On push to `develop` (or `workflow_dispatch`), `.github/workflows/publish-sigil137.yml`:

1. Builds the publish facade (`pnpm --filter xrpl-connect publish:build`)
2. Runs `scripts/sigil137-finalize-publish.mjs` (rename, version `*-develop.<sha>`, AMD patch)
3. Publishes `@sigil137/xrpl-connect` to `https://npm.pkg.github.com`

Locally:

```bash
pnpm install
pnpm --filter xrpl-connect publish:sigil137
# requires NODE_AUTH_TOKEN with write:packages for npm.pkg.github.com
```

## Consumer

```ini
@sigil137:registry=https://npm.pkg.github.com
```

```json
"@sigil137/xrpl-connect": "0.8.2-develop.<sha>"
```

Sync upstream with:

```bash
git fetch upstream
git merge upstream/develop
```
