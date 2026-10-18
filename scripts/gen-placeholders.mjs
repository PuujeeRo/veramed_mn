// Generates the SAMPLE product images in public/products — placeholders
// until real product photos are uploaded from the dashboard.
//
// Transparent background on purpose: the site puts every product on its
// own colour (Showcase hero, catalog tile), so a photo — or this sample —
// should be just the product. Real photos work best the same way
// (a cut-out PNG or WebP).
//
// Run with: node scripts/gen-placeholders.mjs

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A supplement bottle (or wide jar), transparent background. */
function product({ hue, sat = 72, light = 46, name, dose, shape = "bottle", ink = "#fff" }) {
  const body = `hsl(${hue} ${sat}% ${light}%)`;
  const bodyDark = `hsl(${hue} ${sat}% ${Math.max(light - 16, 12)}%)`;
  const isJar = shape === "jar";
  const x = isJar ? 165 : 190;
  const w = isJar ? 270 : 220;
  const y = isJar ? 250 : 215;
  const h = isJar ? 250 : 300;
  const capW = isJar ? 250 : 150;
  const capX = 300 - capW / 2;
  const capY = y - (isJar ? 62 : 78);
  const capH = isJar ? 70 : 86;

  // Cropped close around the product (not the 600×600 drawing area) so it
  // fills its tile instead of floating small in the middle of it.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="130 115 340 445" width="340" height="445" role="img" aria-label="${name}">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${bodyDark}"/>
      <stop offset="0.35" stop-color="${body}"/>
      <stop offset="0.8" stop-color="${body}"/>
      <stop offset="1" stop-color="${bodyDark}"/>
    </linearGradient>
    <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e9e9e9"/>
      <stop offset="0.4" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#dcdcdc"/>
    </linearGradient>
  </defs>
  <ellipse cx="300" cy="${y + h + 14}" rx="${w * 0.62}" ry="18" fill="#000" opacity="0.14"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${isJar ? 34 : 42}" fill="url(#body)"/>
  <rect x="${capX}" y="${capY}" width="${capW}" height="${capH}" rx="12" fill="url(#cap)"/>
  <rect x="${capX}" y="${capY + capH - 10}" width="${capW}" height="10" rx="3" fill="#000" opacity="0.06"/>
  <rect x="${x + 18}" y="${y + 22}" width="14" height="${h - 60}" rx="7" fill="#fff" opacity="0.18"/>
  <g fill="${ink}" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" text-anchor="middle">
    <circle cx="300" cy="${y + (isJar ? 66 : 80)}" r="18" fill="none" stroke="${ink}" stroke-width="5" stroke-dasharray="9 7" opacity="0.9"/>
    <text x="300" y="${y + (isJar ? 128 : 150)}" font-size="${isJar ? 40 : 38}" font-weight="600" letter-spacing="-1">${name}</text>
    <text x="300" y="${y + (isJar ? 158 : 182)}" font-size="15" font-weight="500" opacity="0.8">by Veramed · sample</text>
    <text x="${x + 34}" y="${y + h - 30}" font-size="15" font-weight="600" text-anchor="start" opacity="0.85">${dose}</text>
  </g>
</svg>
`;
}

// Hues follow each sample product's colour theme (supabase/seed.json).
const files = {
  "public/products/b-complex.svg": product({ hue: 46, sat: 92, light: 52, name: "B-Complex", dose: "60 caps", ink: "#2e1e06" }),
  "public/products/b-complex-2.svg": product({ hue: 40, sat: 90, light: 50, name: "B-Complex", dose: "120 caps", shape: "jar", ink: "#2e1e06" }),
  "public/products/b-complex-3.svg": product({ hue: 50, sat: 88, light: 56, name: "B-Complex", dose: "30 caps", ink: "#2e1e06" }),
  "public/products/magnesium.svg": product({ hue: 352, sat: 70, light: 40, name: "Magnesium", dose: "60 caps" }),
  "public/products/magnesium-2.svg": product({ hue: 348, sat: 66, light: 34, name: "Magnesium", dose: "90 caps", shape: "jar" }),
  "public/products/vitamin-d3.svg": product({ hue: 22, sat: 86, light: 50, name: "D3", dose: "2000 IU" }),
  "public/products/probiotic.svg": product({ hue: 148, sat: 40, light: 36, name: "Probiotic", dose: "30 caps", shape: "jar" }),
  "public/products/probiotic-2.svg": product({ hue: 150, sat: 38, light: 42, name: "Probiotic", dose: "60 caps" }),
  "public/products/probiotic-3.svg": product({ hue: 146, sat: 36, light: 30, name: "Probiotic", dose: "90 caps", shape: "jar" }),
  "public/products/collagen.svg": product({ hue: 207, sat: 42, light: 48, name: "Collagen", dose: "300 g", shape: "jar" }),
  "public/products/collagen-2.svg": product({ hue: 210, sat: 40, light: 42, name: "Collagen", dose: "150 g" }),
};

for (const [rel, svg] of Object.entries(files)) {
  const abs = resolve(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, svg);
}
console.log(`wrote ${Object.keys(files).length} files`);
