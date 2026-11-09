// Génère les icônes PNG de la PWA à partir d'un dessin SVG (node scripts/icons.mjs)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // Playwright installé globalement
import { writeFileSync } from "node:fs";

const art = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs><clipPath id="r"><rect width="512" height="512" rx="${pad ? 0 : 112}"/></clipPath></defs>
  <g clip-path="url(#r)">
    <rect width="512" height="512" fill="#ffffff"/>
    <rect width="171" height="512" fill="#1f3fbf"/>
    <rect x="341" width="171" height="512" fill="#d5233b"/>
  </g>
  <g transform="translate(256 270) scale(${pad ? 0.78 : 1}) translate(-256 -270)">
    <rect x="126" y="206" width="260" height="190" rx="20" fill="#141a33"/>
    <g transform="rotate(-8 256 175)">
      <rect x="196" y="110" width="120" height="130" rx="10" fill="#ffffff" stroke="#141a33" stroke-width="14"/>
      <path d="M226 170 l20 22 l40 -46" fill="none" stroke="#d5233b" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <rect x="176" y="222" width="160" height="20" rx="10" fill="#ffffff"/>
  </g>
</svg>`;

const browser = await chromium.launch();
const page = await browser.newPage();
const out = [
  ["public/icons/icon-192.png", 192, false],
  ["public/icons/icon-512.png", 512, false],
  ["public/icons/icon-maskable-512.png", 512, true],
  ["public/icons/apple-touch-icon.png", 180, true],
];
for (const [file, size, pad] of out) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{width:${size}px;height:${size}px;display:block}</style>${art(pad)}`);
  writeFileSync(file, await page.screenshot({ omitBackground: true }));
}
writeFileSync("public/icons/icon.svg", art(false).trim() + "\n");
writeFileSync("app/icon.svg", art(false).trim() + "\n");
await browser.close();
console.log("icônes générées");
