# Palette Drop Lifecycle — Bug-Fix Specification

**Branch:** `fix/palette-drop-duplicates`  
**Complexity:** Small

## Problem

The blueprint canvas persists while design sessions remount. Each palette mount added a new native
`drop` listener to that canvas, but session teardown never detached it. After five session visits,
one drag/drop therefore emitted five placement events and created five identical nodes.

## Acceptance Criteria

1. WHEN a user drops one palette component on the canvas THEN exactly one placement event SHALL be emitted.
2. WHEN a design session is destroyed THEN its palette SHALL detach its native canvas drop listeners.
3. WHEN five design sessions mount and are destroyed before a new session THEN one subsequent drop SHALL still emit exactly one placement event.
4. WHEN the palette is destroyed THEN its locale listener and DOM chrome SHALL also be removed.

## Verification

- `client/src/ui/palette.test.ts`: direct palette lifecycle regression.
- `client/src/session/phase-navigation.test.ts`: production session mount/destroy lifecycle regression.
- Gate: `npx nx run-many -t lint test --skip-nx-cache`.
