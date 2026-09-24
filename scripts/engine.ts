/**
 * The Trillion3D engine at the commit `package.json` pins (`trillion3d.commit`), checked out under
 * `.engine/` (ignored by git). Only its `packages/` are fetched: the page bundles the browser
 * engine from its public entry point (`packages/sdk-browser/src/index.ts`) and the cook runs its
 * native compiler, built here with `--compiler`. Nothing of the engine is copied into this
 * repository, and nothing outside it is read.
 *
 * A pnpm git dependency cannot carry it: pnpm packs a git dependency by its `files` field, which
 * ships the built SDK and neither the sources the page bundles nor the compiler's crate.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');

/** Where the engine is checked out. */
export const ENGINE = resolve(root, '.engine');

/** The native compiler the cook runs: `TRILLION3D_COMPILER_BIN`, else the one built here. */
export const compilerExecutable = () =>
  process.env.TRILLION3D_COMPILER_BIN ??
  resolve(
    ENGINE,
    'packages/asset-compiler-rust/target/release',
    `trillion3d-compiler${process.platform === 'win32' ? '.exe' : ''}`,
  );

/** The repository and commit `package.json` pins. */
export function pinnedEngine(): { repository: string; commit: string } {
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
    trillion3d: { repository: string; commit: string };
  };
  const { repository, commit } = manifest.trillion3d;
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`trillion3d.commit is not a full SHA`);
  return { repository, commit };
}

const git = (...args: string[]) =>
  execFileSync('git', ['-C', ENGINE, ...args], { encoding: 'utf8', stdio: 'pipe' }).trim();

/** Checks out the pinned commit under `.engine/`, unless it is already there. */
export async function checkoutEngine() {
  const { repository, commit } = pinnedEngine();
  if (existsSync(resolve(ENGINE, '.git')) && git('rev-parse', 'HEAD') === commit) return;
  await rm(ENGINE, { recursive: true, force: true });
  execFileSync('git', ['init', '--quiet', ENGINE]);
  git('remote', 'add', 'origin', repository);
  git('sparse-checkout', 'set', '--cone', 'packages');
  git('fetch', '--quiet', '--depth', '1', '--filter=blob:none', 'origin', commit);
  git('checkout', '--quiet', '--detach', 'FETCH_HEAD');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  await checkoutEngine();
  console.log(`engine: ${pinnedEngine().commit} in ${ENGINE}`);
  if (process.argv.includes('--compiler')) {
    const manifest = resolve(ENGINE, 'packages/asset-compiler-rust/Cargo.toml');
    execFileSync('cargo', ['build', '--release', '--locked', '--manifest-path', manifest], {
      stdio: 'inherit',
    });
    console.log(`compiler: ${compilerExecutable()}`);
  }
}
