# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This file is scoped to `applications/conceptual-model-editor`. See the repo-root `CLAUDE.md` for
monorepo-wide commands and the `src/` (v1) architecture overview (data flow, state contexts, dialog
pattern, key modules). This file covers what the root doc does not: exact commands for this package,
the `src-v2` rewrite, the eslint boundary rules, and the shadcn/ui setup.

## Commands

```bash
npm run dev            # start Vite dev server
npx vite --force        # force-rebuild Vite cache (needed after changing local workspace packages)
npm run build            # tsc && vite build
npm run lint              # eslint . --fix
npm run lint:quiet         # eslint . --fix --quiet
npm run test                # vitest run --passWithNoTests
npm run test:watch           # vitest --passWithNoTests (watch mode)
```

Run a single test file:
```bash
npx vitest run src/path/to/file.spec.ts
```

Node/npm/npx are not on PATH — invoke them via the explicit path noted in the root `CLAUDE.md`.

Run `npm run lint` and `npm run test` before every commit (per `README.md`).

## Two parallel codebases

This package currently contains two separate frontends that share only the `@dataspecer/*` packages
and the `@user-interface` component library:

- **`src/`** — the current, feature-complete editor. Entry point `src/main.tsx`, served via
  `diagram.html`. This is the codebase the root `CLAUDE.md` architecture section describes
  (`page.tsx`, `ModelGraphContext`, `ClassesContext`, `ActionsContext`, dialog v1 pattern, etc.).
- **`src-v2/`** — an early-stage rewrite, entry point `src-v2/main.tsx`, served via `v2.html`. Very
  little is implemented yet (`application/`, `core/commands`, `features/*-model` providers,
  `shell/catalog`, `shell/header`). Design rationale is in `documentation/2026-07-16 Design.md`
  and `documentation/2026-05-09 Dialogs v2.md` — package-by-feature layout, commands/workflows
  layering inspired by DDD, and a `mode`-based visibility system for actions (à la VS Code
  contribution `when` clauses).

Do not assume code in one tree is reachable from the other; treat `src-v2` as a from-scratch
reimplementation, not an extension of `src/`.

### `src-v2` layering (enforced by `eslint-plugin-boundaries`)

`eslint.config.ts` defines these elements and defaults dependencies to **disallowed** unless a policy
explicitly permits them:

| Layer | Path | Rule |
|---|---|---|
| `core` | `src-v2/core/*` | Must never import from `features` |
| `features` | `src-v2/features/*` | Feature slices (`profile-model`, `visual-model`, `vocabulary-model`, ...) |
| `infrastructure` | `src-v2/infrastructure/*` | `logger`, `http`, `i18n`, `configuration`, dataspecer API client |
| `modes` | `src-v2/modes/*` | Predicates that gate command/UI visibility per editor mode |
| `shared` | `src-v2/shared/*` | Cross-cutting types/utilities with no feature ownership |
| `shell` | `src-v2/shell/*` | Composed UI shell (`catalog`, `header`, application root) |

When adding code to `src-v2`, place it by feature ownership first, not by which layer happens to
import it most.

## eslint conventions (`eslint.config.ts`)

Beyond standard recommended rules, this project enforces:
- Double quotes, 2-space indent, Unix linebreaks, max line length 120 (warn).
- `max-lines`: 666 per file (warn), `max-lines-per-function`: 70 (warn) — see tigerstyle.dev.
- Comments must start with a capital letter.
- `===`/`!==` required; no `alert`/`confirm`/`prompt`.
- `tailwind.config.js` is excluded from linting (uses `require`).

`typescript-eslint`'s recommended config is currently disabled (commented out) because
`typescript-eslint` does not yet support TypeScript 7; don't re-enable it without checking upstream
support first.

## shadcn/ui setup (`components.json`)

Style `base-nova`, base color `neutral`, icon library `lucide`. The alias root is `@user-interface`
(not the shadcn default `@/components/ui`), resolved in both `vite.config.ts` and `tsconfig.json`.
Structure mirrors the standard shadcn layout under that root:

```
src/user-interface/
  ui/                 # shadcn primitives — @user-interface/ui/<name>
  hooks/               # @user-interface/hooks/<name>
  lib/utils.ts          # cn() helper — @user-interface/lib/utils
  theme-provider.tsx     # app-specific, not a shadcn registry primitive — stays at the alias root
```

`components.json` aliases (`components`, `utils`, `ui`, `lib`, `hooks`) all point under
`@user-interface`; keep them in sync if the directory shape changes again.

## Known quirks

- All dependencies are declared under `dependencies` in `package.json`, not `devDependencies` —
  using `devDependencies` triggers a rollup/npm interaction bug (see `README.md`).
- Vite caches imports from workspace packages (`@dataspecer/*`); after changing code in
  `packages/`, run `npx vite --force` if the dev server doesn't pick up the change.
