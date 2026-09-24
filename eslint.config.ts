import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

// Trillion3D's rules, without its React and portal parts: this repository has neither.
export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', '.engine/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
