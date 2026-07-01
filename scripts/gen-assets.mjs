// Rasterize the branding SVGs into the PNGs that app.json points at.
// Reproducible: tweak assets/branding/*.svg, then `npm run gen:assets`.
//
//   assets/branding/icon.svg     -> assets/icon.png            (1024, full-bleed)
//   assets/branding/adaptive.svg -> assets/adaptive-icon.png   (1024, fg only)
//   assets/branding/splash.svg   -> assets/splash-icon.png     (1024, mark only)

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SIZE = 1024;

const jobs = [
  { src: "assets/branding/icon.svg", out: "assets/icon.png" },
  { src: "assets/branding/adaptive.svg", out: "assets/adaptive-icon.png" },
  { src: "assets/branding/splash.svg", out: "assets/splash-icon.png" },
];

for (const { src, out } of jobs) {
  const svg = readFileSync(resolve(root, src), "utf8");
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: SIZE },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  writeFileSync(resolve(root, out), png);
  console.log(`${src} -> ${out} (${SIZE}x${SIZE})`);
}
