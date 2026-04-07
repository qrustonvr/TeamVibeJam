# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173/TeamVibeJam/
npm run build      # TypeScript check + Vite production build → dist/
npm run preview    # Serve the dist/ build locally
npm run deploy     # Build + push dist/ to the gh-pages branch (GitHub Pages)
```

There are no tests. There is no linter configured beyond TypeScript strict mode.

## Architecture

Single-page React app — no router, no external state library.

**State flow:**
`useGameState.ts` owns a `useReducer` with `gameReducer`. `GameContext.tsx` wraps it in a React context and re-exports a `useGame()` hook. Every component that needs state calls `useGame()` — do not prop-drill.

**Adding a game:** Replace `<Placeholder />` in `App.tsx` with your game component inside `<GameTable>`. That's the only change needed to mount a game. The `GameProvider` at the top of `App.tsx` is already in place.

**Dispatching outcomes:** Call `dispatch({ type: 'WIN', payout: amount })`, `dispatch({ type: 'LOSE' })`, or `dispatch({ type: 'PUSH' })` from your game component. The reducer handles balance math, round history, and phase transitions automatically. `WIN` payout is the **net gain** (not total returned).

**Phase lifecycle:** `BETTING → PLAYING → RESOLVING → BETTING` (or `GAME_OVER` if balance hits 0). Advance phases with `dispatch({ type: 'SET_PHASE', phase: GamePhase.X })`.

**Audio:** `useSound.ts` returns `{ play, stop, setVolume, preload }`. Call `preload('name', '/TeamVibeJam/audio/file.mp3')` on mount, then `play('name')` on events. Handles browser autoplay restrictions silently — no files are bundled yet, the `src/assets/audio/` folder is the drop zone.

## Key conventions

- Path alias `@/` maps to `src/` — use it for all internal imports.
- CSS custom properties (`--felt-green`, `--gold`, `--gold-dim`, chip colors, `--font-display`, `--font-body`) are defined in `src/index.css` and consumed via `style={{ color: 'var(--gold)' }}` or the Tailwind color extensions in `tailwind.config.js`.
- Fonts (Playfair Display, JetBrains Mono) are loaded via Google Fonts CDN in `index.html`, not npm. Use `font-display` / `font-body` Tailwind classes or the CSS vars.
- The Vite `base` is `/TeamVibeJam/` — all asset paths and the favicon href must include this prefix.
- `noUnusedLocals` and `noUnusedParameters` are enforced by TypeScript — the build will fail on unused variables.

## Config to change before shipping

- `GAME_CONFIG.GAME_NAME` in `src/utils/constants.ts` — rename from "CASINO GAME JAM"
- `base` in `vite.config.ts` — update if the repo is ever renamed
- `homepage` in `package.json` — matches the GH Pages URL
