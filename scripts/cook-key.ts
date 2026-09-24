/**
 * The cook's key: a hash of everything that decides the cooked bytes — the generator, the play
 * code it reads, the cook and compiler scripts, the locked dependencies and the pinned engine
 * commit that builds the compiler. The cook writes under `dist/assets/<key>/`, so a published
 * cache never changes under its address and is served as immutable; the CI caches it under the
 * same key. Run alone, it prints the key.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pinnedEngine } from './engine.ts';

const root = resolve(import.meta.dirname, '..');
const INPUTS = [
  'generator',
  'page/play',
  'scripts/cook.ts',
  'scripts/cook-key.ts',
  'scripts/compiler.ts',
  'scripts/engine.ts',
  'pnpm-lock.yaml',
];

export function cookKey(): string {
  const hash = createHash('sha256').update(pinnedEngine().commit);
  const files = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z', ...INPUTS], {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .sort();
  for (const file of files) hash.update(`\0${file}\0`).update(readFileSync(resolve(root, file)));
  return hash.digest('hex').slice(0, 16);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) console.log(cookKey());
