# Orbit Keeper

A one-button arcade game. Flip your satellite between two orbits to collect energy orbs and dodge debris. Built with React, TypeScript and a hand-written Canvas engine (no game library).

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview
```

## Deploy (Vercel)
Push to GitHub, import the repo in Vercel. Framework preset: **Vite**, build command `npm run build`, output `dist`. No config needed.

## Controls
Space / arrow keys / click / tap: switch orbit. P or Esc: pause. The game also auto-pauses when the tab loses focus.

## Features
Combo multiplier (up to x5), shield / slow-time / magnet power-ups, 10 difficulty levels, 3 lives, screen shake and particles, local high score, synthesized sound (Web Audio, no asset files) with mute, responsive canvas scaled for devicePixelRatio, keyboard and touch input, reduced-motion support.

## Structure
- `src/game/engine.ts`: fixed-timestep loop, entities, collisions, rendering
- `src/game/audio.ts`: Web Audio synth
- `src/App.tsx`: HUD, menus, input wiring
- `src/styles.css`: design tokens and responsive layout

## Portfolio entry
```typescript
{
  title: "Orbit Keeper",
  description:
    "A one-button arcade game where you flip a satellite between orbits to collect energy and dodge debris. Built with React, TypeScript and Vite, with a hand-written Canvas 2D engine, a fixed-timestep game loop and Web Audio sound effects.",
  image: "/images/orbit-keeper.webp",
  stack: ["React", "TypeScript", "Vite", "Canvas"],
  liveUrl: "https://your-orbit-keeper.vercel.app/",
  accent: "#7c5cff",
},
```

## Interview talking points
- Fixed-timestep loop with an accumulator keeps physics identical at 60Hz and 144Hz.
- The engine is a plain class; React only renders the HUD from throttled snapshots, so the canvas never re-renders through React.
- Canvas is drawn in a fixed 600x600 logical space and scaled by size and DPR, so one code path covers phones to desktops.
- Audio is synthesized with oscillators, so the build has zero binary assets.
- Difficulty is derived from score (spawn rate, speed, debris ratio), which makes tuning a one-line change.
