# Trillion3D Open World — agent rules

This repository follows the rules of Trillion3D: its `AGENTS.md` and its roles `docs/roles/coder.md`
and `docs/roles/reviewer.md` (https://github.com/pasquelin/Trillion3D). What differs here:

- **The engine is consumed, never copied.** Only its public entry points, at the commit
  `package.json` pins (`trillion3d.commit`), checked out under `.engine/` by `pnpm run engine`.
  An engine defect is reported on Trillion3D, not patched here.
- **Nothing outside this repository is read**: no neighbouring folder, no host path.
- **The cooked world is never committed.** It is rebuilt by `pnpm run cook` and cached by the CI
  under its key (`scripts/cook-key.ts`).
- **Branches** are `<issue>-<short-name>`, cut from `main`; there is no `develop`. Every change
  reaches `main` through a pull request with `validate` and `pr-body` green.
- Gates: `pnpm run validate:quick`, then `validate:typescript`, then `pnpm test`.
- All wording in the repository is in English; every source file fits 200 lines.
