# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root unless noted.

```bash
# Development
npm run dev:client     # Vite dev server at http://localhost:5173/TeamVibeJam/
npm run dev:server     # WebSocket server via tsx watch (port 3001)

# Build
npm run build:client   # tsc -b + vite build → client/dist/
npm run build:server   # tsc --noEmit (type-check only, server runs via tsx)

# Deploy (client only — GH Pages)
npm run deploy         # build:client + gh-pages -d dist → gh-pages branch
```

No tests. No linter beyond TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters` — the build fails on unused variables).

The `VITE_WS_URL` env var overrides the WebSocket server URL (default `ws://localhost:3001`).

## Monorepo Structure

Three npm workspaces:

- **`shared/`** — Types, constants, and pure logic consumed by both client and server. Key files: `gameTypes.ts` (all domain types), `protocol.ts` (WS message union types), `handEvaluator.ts`, `constants.ts`. Import as `@shared/gameTypes` etc.
- **`client/`** — React SPA (Vite + Tailwind). Path alias `@/` → `client/src/`.
- **`server/`** — Node.js WebSocket server (`ws` library, no framework). Runs via `tsx` directly from TypeScript.

## The Drop — Game Architecture

The only game currently mounted is **The Offering** (internally "The Drop"), a 6-seat poker variant with a sacrifice mechanic.

### Client state — two parallel paths

**Solo (singleplayer):**  
`useDropGame.ts` owns a full `useReducer`-based game engine that runs entirely in the browser. It includes the AI (`client/src/ai/dropAI.ts`), brew/omen resolution, hand evaluation, and all phase transitions. Returns `{ state, isYourTurn, isYourDropTurn, yourCards, playerAction, dropCard, nextHand, ... }`.

**Multiplayer:**  
`useSocket.ts` manages a WebSocket connection and translates `ServerMessage` events into a `MultiplayerState` object (`gameState: RoomSnapshot | null`). `RoomSnapshot` (defined in `shared/gameTypes.ts`) is the canonical snapshot the server pushes after every state change.

Both paths feed into the same `<TableView>` component — `DropGame.tsx` bridges them, normalising solo state into the same prop shapes TableView expects.

### Phase lifecycle

```
lobby → deal → omens-reveal → betting_1 → flop → betting_2
→ drop → brew_reveal → betting_3 → turn → betting_4
→ river → betting_5 → showdown → payout → (next hand)
```

The server drives multiplayer phase transitions; the client drives solo ones via a chain of `useEffect` + `schedulePhase()` calls inside `useDropGame.ts`.

### Server architecture

`server/src/index.ts` — HTTP server + WebSocket server. One `/health` endpoint.  
`roomManager.ts` — creates/looks up rooms, delegates to `room.ts`.  
`room.ts` — per-room state machine; all game logic delegated to `gameEngine.ts` and `brewEngine.ts`.  
`sessionStore.ts` — maps sessionToken → `{ roomCode, seatIndex }` for reconnection. Client stores the token in `localStorage` keyed `the-drop:session:<roomCode>`.

### Key client files

| File | Role |
|------|------|
| `DropGame.tsx` | Top-level mode switcher (idle / solo / multiplayer). Bridges hooks → TableView. |
| `TableView.tsx` | Main game canvas. Absolute-positioned overlays on `PlayerTable.png` / `PlayerTableClosed.png`. All SFX triggers live here. |
| `FiendSidebar.tsx` | Left panel — sacrifice circle cards, active fiend portrait, player list with timer bar. |
| `BrewSidebar.tsx` | Right panel — rite reference (all omen triggers). Slides open/closed. |
| `Showdown.tsx` | Full-table overlay for hand reveal. Single master timer chain keyed on locked player count — do not add cascading `useEffect` stages. |
| `useDropGame.ts` | Solo game engine. `schedulePhase(fn, ms)` queues phase transitions via a single cancellable timer ref. |
| `useSocket.ts` | Multiplayer WebSocket client with exponential-backoff reconnection. |
| `brewResolver.ts` | `BREW_DEFS`, `BREW_MODIFIER_COLORS` — canonical omen metadata used across client. |
| `OmensDisplay.tsx` | Exports `OMEN_IMAGES` — the PNG artwork map for all 10 omens. Import from here when showing omen art. |

### Audio

Two separate volume systems:
- **BGM** — `BGMContext.tsx` controls `BGM.mp3` via an `<audio>` element.
- **SFX** — `SFXContext.tsx` stores volume preference; `TableView.tsx` reads it and calls `useSound().setVolume()` to set the Web Audio gain. Effective volume is `sfxVolume × 0.1` (slider runs 0–100% but gain tops out at 10%).

All SFX are preloaded in a single `useEffect` in `TableView.tsx`. Sound triggers: `your-turn`, `others-turn-1/2` (betting phases only), `fold`, `check`, `all-in`, `betraise`, `drop`, `fiend-spawn`, `win`/`lose` (fired once on `payout` phase entry).

## Key Conventions

- Vite `base` is `/TeamVibeJam/` — all asset paths must include this prefix (images, audio, favicon).
- Static assets: images in `client/public/assets/`, audio in `client/public/audio/`.
- CSS custom properties (`--gold`, `--gold-dim`, `--font-display`, `--font-body`) defined in `client/src/index.css`. Use inline `style={{ color: 'var(--gold)' }}` — Tailwind is used for layout utilities, CSS vars for theme tokens.
- `GAME_CONFIG` in `client/src/utils/constants.ts` — game name (`THE OFFERING`) and currency symbol (`◆`).
- The global casino balance/phase (`BETTING → PLAYING → RESOLVING`) lives in `GameContext.tsx` / `useGameState.ts`. Dispatch `WIN`, `LOSE`, or `PUSH` from any game component to record outcomes. This is separate from the per-hand phase machine in `useDropGame.ts`.
