import sharp from 'sharp';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
const iconSvgPath = join(root, 'assets', 'icon.svg');

if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

const svg = readFileSync(iconSvgPath);

async function gen() {
  // PWA standart boyutlari
  const sizes = [192, 512];
  for (const size of sizes) {
    await sharp(svg).resize(size, size).png().toFile(join(publicDir, `icon-${size}.png`));
    console.log(`public/icon-${size}.png created`);
  }

  // iOS apple-touch-icon (180x180)
  await sharp(svg).resize(180, 180).png().toFile(join(publicDir, 'apple-touch-icon.png'));
  console.log('public/apple-touch-icon.png created');

  // Maskable icon (safe zone padding) - 512x512 with extra padding
  const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <radialGradient id="bg" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stop-color="#FFA5C3"/>
        <stop offset="50%" stop-color="#F272A5"/>
        <stop offset="100%" stop-color="#D13D7C"/>
      </radialGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)"/>
    <image href="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"
           x="64" y="64" width="384" height="384"/>
  </svg>`;
  await sharp(Buffer.from(maskableSvg)).resize(512, 512).png().toFile(join(publicDir, 'icon-maskable.png'));
  console.log('public/icon-maskable.png created');

  // manifest.json
  const manifest = {
    name: 'aybalam - Aile Ani Gunlugu',
    short_name: 'aybalam',
    description: "Balam'in Yasemin icin tuttugu aile ani gunlugu",
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F5F0E8',
    theme_color: '#F272A5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  writeFileSync(join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('public/manifest.json created');

  console.log('\nPWA assets ready. Don\'t forget to link them from +html.tsx');
}

gen().catch(console.error);
