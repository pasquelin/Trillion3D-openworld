<div align="center">

# Trillion3D Open World

### An 8 × 8 km world generated from one seed, compiled into one Trillion3D cache and played in the browser: on foot, by car or by plane.

[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-2b2d30?logo=typescript&logoColor=3178c6)](tsconfig.json)
[![WebGPU](https://img.shields.io/badge/WebGPU-Trillion3D%20engine-2b2d30?logo=webgpu&logoColor=6fa8dc)](https://github.com/pasquelin/Trillion3D)
[![Node 22](https://img.shields.io/badge/Node-%E2%89%A522.18-2b2d30?logo=node.js&logoColor=6da95f)](#quick-start)
[![pnpm](https://img.shields.io/badge/pnpm-11-2b2d30?logo=pnpm&logoColor=f69220)](#quick-start)
[![Quality](https://github.com/pasquelin/Trillion3D-openworld/actions/workflows/quality.yml/badge.svg)](https://github.com/pasquelin/Trillion3D-openworld/actions/workflows/quality.yml)
[![Site](https://github.com/pasquelin/Trillion3D-openworld/actions/workflows/site.yml/badge.svg)](https://github.com/pasquelin/Trillion3D-openworld/actions/workflows/site.yml)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-2b2d30)](#licence)

**[Play it ↗](https://www.trillion3d.com/openworld/)** · **[Trillion3D ↗](https://github.com/pasquelin/Trillion3D)** · **[Quick start](#quick-start)** · **[Commands](#commands)** · **[Structure](#structure)** · **[Deploy](#deploy)**

</div>

## What it is

Six regions packed around an airport — mountains, a city with its harbour, a desert, countryside
and a coast with islands — share one heightfield, so their borders have no seam. The generator
writes them as one glTF; the Trillion3D native compiler turns it into one cache of clustered
pages; the page streams what the frame reads under fixed memory budgets. The simulation (Jolt
physics, traffic, pedestrians) runs in a worker; the page only draws what the worker reports.

It lives apart from Trillion3D because its cook takes about forty minutes: the engine's own
checks stay fast, and this repository cooks only when its generator, its compiler or its engine
commit change.

## Quick start

Node ≥ 22.18, pnpm 11, git; Rust (stable) for the cook.

```sh
pnpm install
pnpm run engine:compiler   # check out the pinned engine, build its native compiler
pnpm run cook              # generate and compile the world into dist/assets/<key>/
pnpm run build             # bundle the page into dist/
pnpm run serve             # http://localhost:4180/
```

A browser with WebGPU plays it; the engine falls back to WebGL2 elsewhere.

## Commands

| Command                        | What it does                                                                |
| ------------------------------ | --------------------------------------------------------------------------- |
| `pnpm run engine`              | Checks out the pinned Trillion3D commit under `.engine/` (`packages/` only) |
| `pnpm run engine:compiler`     | The same, then builds the native compiler with Cargo                        |
| `pnpm run cook`                | Generates the world and compiles it (`--source-only` skips the compiler)    |
| `pnpm run build`               | Bundles the engine, the page, the kit and the physics worker into `dist/`   |
| `pnpm run serve`               | Serves `dist/` locally                                                      |
| `pnpm test`                    | The unit suite (`node --test`)                                              |
| `pnpm run validate`            | Every gate: `validate:quick`, `validate:typescript`, then the tests         |
| `pnpm run validate:quick`      | Format, lint, 200-line limit, unused code (knip)                            |
| `pnpm run validate:typescript` | Type-checks the page against the engine, then builds it                     |

## Structure

```text
generator/   the world: plan and terrain, the six regions, props, glTF writer, physics data
page/        the page: index.html, the play layer and its physics worker, the sky
page/kit/    the panel, counters and seeded numbers, copied from Trillion3D's example kit
scripts/     engine checkout, cook and its key, build, local server, line check
```

### The engine

The engine is consumed through its public entry points only, at the commit `package.json` pins
(`trillion3d.commit`): the page bundles `packages/sdk-browser/src/index.ts` and its workers, and
the cook runs the native compiler's command line. `pnpm run engine` checks that commit out under
`.engine/` (ignored by git); nothing of the engine is copied here. A pnpm git dependency cannot
carry it: pnpm packs a git dependency by its `files` field, which ships the built SDK only.
Moving to a newer engine is one change of `trillion3d.commit`, proved by `validate`.

## Deploy

On every push to `main`, `.github/workflows/site.yml` cooks the world (or restores it from the
cache under its key), builds the page, and transfers `dist/` with rsync. The cooked world is
published under `assets/<key>/`, a folder whose content never changes: it is served as immutable.
The page declares its own canonical address, https://www.trillion3d.com/openworld/, which the
workflow checks once the transfer is done. The page is served cross-origin isolated
(`Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Embedder-Policy: credentialless`), like
the portal: the page does not require it, it is a choice of consistency, and since
`crossOriginIsolated` is true there the engine uses its shared decoding.

What the server holds, installed once by an idempotent script that lives on the server,
`ssh -t gosecure 'sudo bash /data/pasquelin/setup/deploy-setup-trillion3d-openworld.sh'`:

- **The server folder**, `/data/pasquelin/trillion3d-openworld/`, next to the portal's web root
  `/data/pasquelin/trillion3d/` and apart from it, so that neither deploy ever deletes the
  other's files.
- **A deploy key restricted to that folder**, write-only, in the deploy user's `authorized_keys`:
  `command="/usr/bin/rrsync -wo /data/pasquelin/trillion3d-openworld",restrict ssh-ed25519 AAAA… github-actions-trillion3d-openworld`.
- **The nginx snippet** `/etc/nginx/snippets/trillion3d-openworld.conf`, picked up by the
  `www.trillion3d.com` server through `include /etc/nginx/snippets/trillion3d-*.conf;`:

  ```nginx
  location = /openworld { return 301 /openworld/; }

  location ^~ /openworld/ {
    alias /data/pasquelin/trillion3d-openworld/;
    index index.html;
    add_header Cross-Origin-Opener-Policy same-origin;
    add_header Cross-Origin-Embedder-Policy credentialless;
    add_header Cache-Control $openworld_cache;
  }
  ```

- **The cache map** `/etc/nginx/conf.d/trillion3d-openworld-cache.conf`, in the `http` block:
  the cooked world under `assets/` is immutable, the rest (html, json, runtime) is revalidated.

  ```nginx
  map $uri $openworld_cache {
    ~^/openworld/assets/ "public, max-age=31536000, immutable";
    default              "no-cache";
  }
  ```

- **Four repository secrets**, whose `gh secret set` commands the setup script prints:
  `DEPLOY_SSH_KEY` (the private key), `DEPLOY_KNOWN_HOSTS` (the server's host key line),
  `DEPLOY_TARGET` (`user@host`) and `DEPLOY_SSH_PORT`. Until they are set, the deploy job fails
  with the list of those missing; the checks and the build stay green. A run started before the
  secrets were set does not see them: rerun only its deploy job, `gh run rerun <id> --failed`.

## Contributing

The rules are Trillion3D's ([AGENTS.md](AGENTS.md)): one issue and one pull request per change,
on a branch `<issue>-<short-name>`, with `validate` and `pr-body` green. `pnpm install` installs
the tracked git hooks; `.github/ruleset.json` is the ruleset applied to `main`.

## Licence

Trillion3D Open World is published under the [PolyForm Noncommercial License 1.0.0](LICENSE):
free for noncommercial use, study, research and personal projects. **Commercial use requires a
separate licence** from the copyright holder — open an issue or contact the author.

Copyright © 2026 Alban Pasquelin.
