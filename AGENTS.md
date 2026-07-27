# AGENTS.md

Guidance for AI agents working in this repository.

## What this project is

**System Design Quest** — a browser-based educational game for learning system design. Players read real-world problems, gather functional/non-functional requirements, draw 3D architecture diagrams with animated data-flow connections, and receive detailed AI judgment with improvement suggestions.

Inspired by [System Design Playground](https://system-design-playground.replit.app/) and the 3D patterns from nj-mmo.

## How we work

Features are built with **TLC Spec-Driven Development** (`tlc-spec-driven` skill):

1. **Specify** → `.specs/features/[feature]/spec.md`
2. **Design** → `.specs/features/[feature]/design.md` (Large/Complex only)
3. **Tasks** → `.specs/features/[feature]/tasks.md`
4. **Execute** → implement + test + atomic commit per task
5. **Verify** → independent Verifier sub-agent (author ≠ verifier)

Read `.specs/STATE.md` before any architectural decision. Active `AD-NNN` entries are constraints.

## Branch strategy

- `main` = production
- `feature/<story-slug>` = development branch per story/phase
- Merge to `main` only after Verify PASS

## Testing principles

1. **Tests derive from spec acceptance criteria** — never mirror implementation
2. **WebGL is not testable in Vitest** — assert via `window.__GAME_STATE__` and serialized `ArchitectureGraph`
3. **One atomic commit per task** — never batch
4. **Gate must pass** before task is done — test runner decides, not self-assessment
5. **Deterministic tests** — no wall-clock sleeps; inject time for animations
6. **Fast tests** — >10s per test file is a defect

## Project structure (target)

```
client/          # Vite + Three.js canvas + DOM UI panels
server/          # Fastify API (judge, leaderboard)
libs/shared/     # Types, problem definitions, validation
.specs/          # Spec-driven docs
docs/            # Roadmap, component catalog
```

## Key patterns (from nj-mmo)

- `createCanvasRenderer()` + `startRenderLoop()` for Three.js
- Manifest-driven component assets (`component-manifest.ts`)
- `window.__GAME_STATE__` test hook
- Raycast for component selection/drag
- `component-lab.html` for asset iteration

## Current phase

**Foundation complete** — active feature: `mvp-canvas` (sub-phase 1a). See `.specs/STATE.md` Handoff section for details.
