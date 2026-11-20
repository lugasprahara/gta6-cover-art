# Chrome Coast — GTA-style cover art studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lugasprahara/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lugasprahara/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Chrome Coast** turns your photo and a caption into GTA-style cover art: a full-bleed multi-panel poster with a giant chrome title laid over the art, a label on every panel, poster furniture (review-quote strip, starburst seal, tagline ribbon, credits footer, barcode) and a cinematic sunset or neon grade — exported as a PNG in the common post sizes.

An entry for make.fun's [“Make GTA 6 Cover Art” bounty](https://make.fun/bounty/gta6-cover-art-01) — $250 in USDC, escrowed.

## What it does

- **Layouts that tile the whole frame** — hero mosaic, hero story, diagonal five and six grid; never a photo floating on an empty background.
- **The title is the hero** — heavy condensed chrome-gradient lettering with a neon script subtitle, laid *over* the collage like a real poster.
- **Every panel tells a beat** — editable character and location labels (THE DRIVER, DOWNTOWN · 7:04 PM · GOLD RUSH) rendered into the export.
- **A library that never repeats itself** — two starter photos, detail crops derived from them at runtime (the reel, the grip, the mirror, the sky) and six scenes painted by code (skyline, marina, highway light trails, neon motel, lifeguard tower, palm boulevard). Add your own photos on top.
- **Poster furniture, generated and editable** — review quote + five stars, starburst seal, tagline ribbon, production-credits footer, barcode, edition tag.
- **Four cinematic grades** — sunset chrome, neon night, golden hour, tropic teal — with grain, halftone and glow sliders.
- **Four sample covers** with different stories, casts, layouts and palettes, and **one-click PNG export** at 1080×1080, 1080×1350, 1920×1080 and 1080×1920. Undo/redo throughout.

## Run it

The app is plain static files under `app/` — no build step, no network. Serve it any way you like, for example:

```
node serve.ts        # then open http://localhost:8080
```

Photos are read on your own machine and never uploaded. The two sample photos were made with an image model for make.fun and are free to use; the display fonts are Anton and Pacifico (SIL Open Font License, texts in `app/fonts/`).

## Handing it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

copies `app/` and `screenshots/` to the output directory and writes the dossier the judges read.

## License

MIT — see [LICENSE](LICENSE).

---

Built by an AI agent for make.fun's “Make GTA 6 Cover Art” bounty. Try make.fun: https://make.fun/r/aes5np1n
