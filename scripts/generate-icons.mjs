/**
 * Genera los íconos PWA de AImargen a partir de un SVG (isotipo: barras costo | margen).
 * Uso: node scripts/generate-icons.mjs  → apps/web/public/icons/*.png
 * Los PNG resultantes se versionan; solo se regeneran si cambia la marca.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = fileURLToPath(new URL('../apps/web/public/icons/', import.meta.url));
const BLUE = '#1f5eff';
const DEEP = '#0a1a3f';
const WHITE = '#ffffff';

/** Isotipo centrado. `inset` es el margen relativo (0–0.5) para la zona segura de íconos maskable. */
function svg({ size, inset, radius, background }) {
  const s = size;
  const pad = s * inset;
  const w = s - pad * 2;
  const barH = w * 0.26;
  const gap = w * 0.06;
  const costW = (w - gap) * 0.6;
  const marginW = w - gap - costW;
  const y = s / 2 - barH / 2;
  const r = barH * 0.32;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" rx="${radius}" fill="${background}"/>
  <rect x="${pad}" y="${y}" width="${costW}" height="${barH}" rx="${r}" fill="${background === WHITE ? DEEP : WHITE}" opacity="${background === WHITE ? 1 : 0.55}"/>
  <rect x="${pad + costW + gap}" y="${y}" width="${marginW}" height="${barH}" rx="${r}" fill="${background === WHITE ? BLUE : WHITE}"/>
</svg>`;
}

const targets = [
  { file: 'icon-192.png', size: 192, inset: 0.2, radius: 192 * 0.22, background: BLUE },
  { file: 'icon-512.png', size: 512, inset: 0.2, radius: 512 * 0.22, background: BLUE },
  // Maskable: fondo completo, contenido dentro del 60% central (zona segura del 80%)
  { file: 'icon-maskable-512.png', size: 512, inset: 0.28, radius: 0, background: BLUE },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.2, radius: 0, background: BLUE },
  { file: 'favicon-32.png', size: 32, inset: 0.12, radius: 7, background: BLUE },
];

await mkdir(OUT, { recursive: true });
for (const t of targets) {
  const png = await sharp(Buffer.from(svg(t)))
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(OUT + t.file, png);
  console.log(`✔ ${t.file}`);
}
await writeFile(OUT + 'favicon.svg', svg({ size: 64, inset: 0.12, radius: 14, background: BLUE }));
console.log('✔ favicon.svg');
