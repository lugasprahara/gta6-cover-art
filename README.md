# lugasprahara/gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/lugasprahara/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/lugasprahara/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Chrome Coast is an offline web app that turns a photo and a caption into GTA 6-style cover art. Pick one of four presets — Chrome Coast, Golden Mile, Neon Tide, Pier Royale — then tune the layout, the panel labels and the look, and export the poster as a PNG in four sizes (1080×1080, 1080×1350, 1920×1080, 1080×1920).

Every cover is a full-bleed collage: starter photos, runtime detail crops cut from them, and procedural Leonida scenes (skyline, marina, highway, palms, beach tower, motel, sunset sea), each panel labelled in its safe zone. A giant chrome-gradient title sits over the art with a neon script subtitle, and the poster furniture is all there — review quote with five stars, starburst seal, tagline ribbon, credits footer, barcode and VOL tag. Cinematic sunset grades, grain and halftone finish the look. Everything runs locally in the browser; nothing is uploaded anywhere.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — choose a preset, edit the title and panel labels, pick an export size, and hit Export PNG. To capture the four screenshots in `screenshots/`, run `node render-shots.mjs` (needs headless Chromium). To hand the entry in locally, run `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.

---

<sub>Entered on [make.fun](https://make.fun/?ref=aes5np1n&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
