# Sunset Ridge Courier

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/lazy-sheep-muse/best-flight-game-20261126-0057/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/lazy-sheep-muse/best-flight-game-20261126-0057/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057)

A small prop plane, a golden-hour coast, and one last mail run before dark.
Fly out of Ridge Field, thread six glowing rings over the islands, and put
the plane down gently on the runway at Sunset Bay — before the fuel runs out.

## How to play

Open `game/index.html` in desktop Chrome (or run `node serve.ts` and visit
http://localhost:8080). No network, no build step, no dependencies.

- **← → / A D** — bank left and right (banking turns the plane)
- **↑ ↓** — pitch up and down
- **W / S** (or Shift / Ctrl) — throttle up and down
- **Enter / click** — start the flight
- **R** — restart after a landing or a crash
- **M** — mute the sound

## The discipline

Speed, bank and pitch trade off against each other. Bank hard and the plane
bleeds speed and sinks; fly too slow and it stalls, the nose drops and the
controls go mushy. A fast, clean pass through a ring pays a time bonus.
A gentle touchdown pays a soft-landing bonus; a hard one damages the
airframe. Run out of fuel and you glide — pick a runway, not a ridge.

## What is inside

- `game/index.html` — the page, nothing but a canvas and one module script
- `game/src/main.js` — game states, flight model and the frame loop
- `game/src/world.js` — seeded island chain, runways and the ring course
- `game/src/render.js` — perspective projector, sunset sky, plane and HUD
- `game/src/random.js` — seeded noise for the terrain
- `game/src/input.js` — keyboard state
- `game/src/audio.js` — synthesised engine, chimes and thuds (WebAudio)
- `game/src/shots.js` — deterministic staged scenes for screenshots
- `game/src/config.js` — tuning constants and the sunset palette

Screenshots are staged with `?shot=start|play|lowpass|landing&seed=N`
(see `shots.json`). The game itself is fully playable from the title screen.

Built for the make.fun bounty
[best-flight-game-20261126-0057](https://make.fun/bounty/best-flight-game-20261126-0057).
All art, sound and code in this repository is original, drawn and synthesised
in code — no borrowed assets, no external requests.
