# EV Battery Pack: Anatomy Jig (Remotion + React Three Fiber)

**Live preview:** https://mizcausevic-dev.github.io/ev-pack-anatomy-jig/

A 34-second (1,020 frames @ 30 fps, 1920×1080) cutaway of an EV battery pack under fast-charge load.
Everything is procedural geometry driven by `useCurrentFrame()`, so any frame can be scrubbed or re-rendered with the same result.

## Shot map

| Frames | Shot | What moves |
|---|---|---|
| 0–150 | Exterior | 15° orbital sweep (az 26° → 41°) around the sealed, die-cast frame |
| 151–300 | Mechanical cutaway | Ballistic shield springs +Z (Three.js +Y), camera descends into module group 2 |
| 301–510 | Thermal | Module 2 cells ghost out, serpentine cold-plate channel lights orange, velocity arrows travel the loop |
| 511–750 | Cell macro | Hero cell (M2·C4·R12) lifts out, casing wedge-cuts, 32 jelly-roll wraps (cathode / separator / anode / separator) peel in a staircase, BMS sense traces light green |
| 751–1020 | Exploded isometric | Log-space dolly-out to a true isometric angle (35.264°), layers explode, the cyan series busbar front spreads from the module 2→3 link to both contactor terminals, contactors close |

## Palette

`#111318` base · `#3A3F4D` structure wireframe · `#00E5FF` HV busbars · `#FF6B35` coolant · `#76FF03` BMS telemetry.

## Structure

- `src/timeline.ts`: shot table, the camera path (spherical keyframes with log-lerped radius), and `sceneAt(frame)`, the single source of truth for every animated value.
- `src/geometry.ts`: pack layout, the serpentine curve, the exploded-view transforms, and the HV series chain.
- `src/Scene.tsx`: the R3F scene (instanced cells, cold plates, busbars, BMS, the hero cell, the junction box).
- `src/Hud.tsx`: the HTML overlay. Callouts project the same 3D points through the same camera math, so leader lines stay locked to the geometry.

## Run

```bash
npm install
npm run studio                    # preview
npx remotion render EVPackJig out/ev-pack-anatomy-jig-Cursor.mp4 --gl=angle     # GPU machine
npx remotion render EVPackJig out/ev-pack-anatomy-jig-Cursor.mp4 --gl=swangle   # headless / no GPU
```

## Repo layout

- `site/`: the GitHub Pages preview (published to the `gh-pages` branch by `scripts/publish-pages.sh`).
- `docs/`: the Medium article draft and the 2400×1260 hero image (`npx remotion still HeroImage docs/hero-ev-pack-anatomy-jig-Cursor.png --gl=swangle`).

## Data honesty

The telemetry numbers on screen (cell V, °C, SoC, 398.4 V pack bus) are illustrative, time-compressed values, and the overlay labels them that way. They do not come from any real pack.

## Safety

The video has no strobing or full-frame flashing. The contactor-close glow ramps up over 17 frames and stays localized.
