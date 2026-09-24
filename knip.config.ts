import type { KnipConfig } from 'knip';

// The page's runtime entries (`scripts/build.ts`) and the scripts `package.json` runs.
const config: KnipConfig = {
  entry: [
    'page/index.ts',
    'page/kit/index.ts',
    'page/play/sim.worker.ts',
    'scripts/*.ts',
    '**/*.test.ts',
  ],
  project: ['generator/**/*.ts', 'page/**/*.ts', 'scripts/**/*.ts'],
  ignoreDependencies: [
    // Run from node_modules/.bin by scripts/build.ts, and loaded by page/styles.css.
    '@tailwindcss/cli',
    'daisyui',
    'tailwindcss',
    // The engine's own: its checkout (`pnpm run engine`) resolves `three` from here, and the page
    // names its entry point by the tsconfig path. Absent from the sources-only `quick` gates.
    'three',
    '@types/three',
    'trillion3d-engine',
  ],
};

export default config;
