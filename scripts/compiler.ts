/**
 * The Trillion3D native compiler as the cook runs it: its command line, the public contract of
 * the executable `pnpm engine:compiler` builds from the pinned commit.
 */
import { spawnSync, type StdioOptions } from 'node:child_process';
import { compilerExecutable } from './engine.ts';

/** The triangle budget of a `full` cache, the one Trillion3D's published scenes use. */
const TRIANGLE_BUDGET = '150000';

/** One `full` compile of `source` into `cache`, both relative to `cwd`. */
interface FullCompile {
  cwd: string;
  source: string;
  threads: number;
  ramMb: number;
  simplification: 'none' | 'qem-endpoints';
  stdio: StdioOptions;
}

/** Compiles one full cache into `cache/` beside the source; throws when the compiler fails. Its
 *  resources are addressed relative to the manifest, so the cache is served from any folder. */
export function compileFullCache({
  cwd,
  source,
  threads,
  ramMb,
  simplification,
  stdio,
}: FullCompile) {
  const result = spawnSync(
    compilerExecutable(),
    [
      source,
      'cache',
      'full',
      TRIANGLE_BUDGET,
      String(threads),
      String(ramMb),
      '../../../../source/',
      simplification,
    ],
    { cwd, stdio },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`The native compiler failed on ${source} (status ${result.status}).`);
}
