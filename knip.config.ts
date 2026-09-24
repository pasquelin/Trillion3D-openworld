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
  // Run from node_modules/.bin by scripts/build.ts, and loaded by page/styles.css.
  ignoreDependencies: ['@tailwindcss/cli', 'daisyui', 'tailwindcss'],
};

export default config;
