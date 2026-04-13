import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');

// Realistic jasmine flower - rounded white petals with prominent yellow stamens
// Based on real jasmine (Jasminum) appearance
const createJasmineFlower = (s, includeText = false, includeBackground = true) => {
  const cx = s / 2;
  const cy = includeText ? s * 0.44 : s * 0.5;

  // Rounded petal shape - more like real jasmine (broad at top, narrow at base)
  const roundedPetal = (angle, length, widthRatio = 0.7) => {
    const rad = angle * Math.PI / 180;
    const tipX = cx + Math.cos(rad) * length;
    const tipY = cy + Math.sin(rad) * length;
    const baseX = cx + Math.cos(rad) * (length * 0.12);
    const baseY = cy + Math.sin(rad) * (length * 0.12);
    const perpX = -Math.sin(rad);
    const perpY = Math.cos(rad);
    const w = length * widthRatio;

    // Wide rounded top, narrow base (like a rounded teardrop pointing outward)
    const topLeftX = tipX + perpX * w * 0.85;
    const topLeftY = tipY + perpY * w * 0.85;
    const topRightX = tipX - perpX * w * 0.85;
    const topRightY = tipY - perpY * w * 0.85;

    const sideLeftX = cx + Math.cos(rad) * length * 0.55 + perpX * w * 0.95;
    const sideLeftY = cy + Math.sin(rad) * length * 0.55 + perpY * w * 0.95;
    const sideRightX = cx + Math.cos(rad) * length * 0.55 - perpX * w * 0.95;
    const sideRightY = cy + Math.sin(rad) * length * 0.55 - perpY * w * 0.95;

    const baseLeftX = baseX + perpX * w * 0.25;
    const baseLeftY = baseY + perpY * w * 0.25;
    const baseRightX = baseX - perpX * w * 0.25;
    const baseRightY = baseY - perpY * w * 0.25;

    return `M ${baseLeftX.toFixed(2)},${baseLeftY.toFixed(2)}
            C ${sideLeftX.toFixed(2)},${sideLeftY.toFixed(2)} ${topLeftX.toFixed(2)},${topLeftY.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)}
            C ${topRightX.toFixed(2)},${topRightY.toFixed(2)} ${sideRightX.toFixed(2)},${sideRightY.toFixed(2)} ${baseRightX.toFixed(2)},${baseRightY.toFixed(2)}
            Z`;
  };

  // Leaf shape (pointed oval)
  const leaf = (startX, startY, angle, length, width) => {
    const rad = angle * Math.PI / 180;
    const tipX = startX + Math.cos(rad) * length;
    const tipY = startY + Math.sin(rad) * length;
    const perpX = -Math.sin(rad);
    const perpY = Math.cos(rad);
    const midX = startX + Math.cos(rad) * length * 0.5;
    const midY = startY + Math.sin(rad) * length * 0.5;
    const leftX = midX + perpX * width;
    const leftY = midY + perpY * width;
    const rightX = midX - perpX * width;
    const rightY = midY - perpY * width;
    return `M ${startX.toFixed(2)},${startY.toFixed(2)}
            Q ${leftX.toFixed(2)},${leftY.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)}
            Q ${rightX.toFixed(2)},${rightY.toFixed(2)} ${startX.toFixed(2)},${startY.toFixed(2)} Z`;
  };

  const petalLen = s * 0.33;
  const petals = [0, 1, 2, 3, 4].map(i => {
    const angle = i * 72 - 90;
    return roundedPetal(angle, petalLen, 0.38);
  }).join(' ');

  // Stamens - yellow lines radiating from center
  const stamens = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 15) * Math.PI / 180;
    const innerR = s * 0.025;
    const outerR = s * 0.075 + (i % 3) * s * 0.008;
    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const x2 = cx + Math.cos(angle) * outerR;
    const y2 = cy + Math.sin(angle) * outerR;
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"
            stroke="#F4B800" stroke-width="${(s * 0.0035).toFixed(2)}" stroke-linecap="round" opacity="0.85"/>
            <circle cx="${x2.toFixed(2)}" cy="${y2.toFixed(2)}" r="${(s * 0.007).toFixed(2)}" fill="#E89010"/>`;
  }).join('\n    ');

  const textPart = includeText ? `
  <text x="${cx}" y="${s * 0.88}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${s * 0.08}"
        font-weight="300"
        font-style="italic"
        fill="#FFFFFF"
        text-anchor="middle"
        opacity="0.97"
        letter-spacing="${s * 0.004}">aybalam</text>` : '';

  const bgPart = includeBackground ? `
  <rect x="0" y="0" width="${s}" height="${s}" rx="${s * 0.22}" ry="${s * 0.22}" fill="url(#bgGrad)"/>
  <circle cx="${s * 0.18}" cy="${s * 0.2}" r="${s * 0.05}" fill="#FFB3CB" opacity="0.25"/>
  <circle cx="${s * 0.85}" cy="${s * 0.15}" r="${s * 0.035}" fill="#FFB3CB" opacity="0.2"/>
  <circle cx="${s * 0.88}" cy="${s * 0.78}" r="${s * 0.04}" fill="#FFB3CB" opacity="0.22"/>
  <circle cx="${s * 0.12}" cy="${s * 0.75}" r="${s * 0.03}" fill="#FFB3CB" opacity="0.2"/>
  ` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#FFA5C3"/>
      <stop offset="50%" stop-color="#F272A5"/>
      <stop offset="100%" stop-color="#D13D7C"/>
    </radialGradient>

    <radialGradient id="petalGrad" cx="50%" cy="15%" r="90%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="55%" stop-color="#FFFBF5"/>
      <stop offset="90%" stop-color="#FFE8D4"/>
      <stop offset="100%" stop-color="#F5C8A8"/>
    </radialGradient>

    <radialGradient id="petalShade" cx="50%" cy="85%" r="55%">
      <stop offset="0%" stop-color="#D88B65" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#FFE8D4" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="centerGrad" cx="45%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#FFF4A0"/>
      <stop offset="50%" stop-color="#FFD93D"/>
      <stop offset="100%" stop-color="#D88010"/>
    </radialGradient>

    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8FD49A"/>
      <stop offset="50%" stop-color="#5BAE6E"/>
      <stop offset="100%" stop-color="#2E7040"/>
    </linearGradient>

    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${s * 0.01}"/>
      <feOffset dx="0" dy="${s * 0.005}" result="offsetblur"/>
      <feFlood flood-color="#8B1050" flood-opacity="0.4"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="petalDepth" x="-5%" y="-5%" width="110%" height="110%">
      <feGaussianBlur stdDeviation="${s * 0.002}"/>
    </filter>
  </defs>
${bgPart}
  <g filter="url(#dropShadow)">
    <!-- Leaves behind flower -->
    <path d="${leaf(cx - s * 0.08, cy + s * 0.05, 200, s * 0.28, s * 0.09)}"
          fill="url(#leafGrad)" opacity="0.92"/>
    <path d="${leaf(cx + s * 0.08, cy + s * 0.05, -20, s * 0.28, s * 0.09)}"
          fill="url(#leafGrad)" opacity="0.92"/>
    <path d="${leaf(cx - s * 0.04, cy + s * 0.12, 230, s * 0.22, s * 0.07)}"
          fill="url(#leafGrad)" opacity="0.8"/>
    <path d="${leaf(cx + s * 0.04, cy + s * 0.12, -50, s * 0.22, s * 0.07)}"
          fill="url(#leafGrad)" opacity="0.8"/>

    <!-- Leaf veins -->
    <line x1="${cx - s * 0.08}" y1="${cy + s * 0.05}" x2="${cx - s * 0.34}" y2="${cy - s * 0.05}"
          stroke="#2E5030" stroke-width="${s * 0.002}" opacity="0.4"/>
    <line x1="${cx + s * 0.08}" y1="${cy + s * 0.05}" x2="${cx + s * 0.34}" y2="${cy - s * 0.05}"
          stroke="#2E5030" stroke-width="${s * 0.002}" opacity="0.4"/>

    <!-- White petals -->
    <path d="${petals}" fill="url(#petalGrad)"
          stroke="#E0A080" stroke-width="${s * 0.003}" stroke-opacity="0.25"/>

    <!-- Petal shadow near center for depth -->
    <circle cx="${cx}" cy="${cy}" r="${s * 0.12}" fill="url(#petalShade)" opacity="0.6"/>

    <!-- Stamens radiating from center -->
    ${stamens}

    <!-- Center disc -->
    <circle cx="${cx}" cy="${cy}" r="${s * 0.038}" fill="url(#centerGrad)"/>
    <circle cx="${cx - s * 0.008}" cy="${cy - s * 0.01}" r="${s * 0.018}" fill="#FFF4B0" opacity="0.8"/>
    <circle cx="${cx - s * 0.012}" cy="${cy - s * 0.014}" r="${s * 0.008}" fill="#FFFFFF" opacity="0.9"/>
  </g>
${textPart}
</svg>`;
};

async function generateIcons() {
  console.log('Generating realistic jasmine flower icons...\n');

  const iconSvg = createJasmineFlower(1024, true, true);
  writeFileSync(join(assetsDir, 'icon.svg'), iconSvg);
  await sharp(Buffer.from(iconSvg)).png().toFile(join(assetsDir, 'icon.png'));
  console.log('icon.png (1024x1024) created');

  const faviconSvg = createJasmineFlower(256, false, true);
  await sharp(Buffer.from(faviconSvg)).resize(48, 48).png().toFile(join(assetsDir, 'favicon.png'));
  console.log('favicon.png (48x48) created');

  const splashSvg = createJasmineFlower(512, false, true);
  await sharp(Buffer.from(splashSvg)).resize(200, 200).png().toFile(join(assetsDir, 'splash-icon.png'));
  console.log('splash-icon.png (200x200) created');

  const fgSvg = createJasmineFlower(512, false, false);
  await sharp(Buffer.from(fgSvg)).resize(512, 512).png().toFile(join(assetsDir, 'android-icon-foreground.png'));
  console.log('android-icon-foreground.png (512x512) created');

  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
    <defs>
      <radialGradient id="bg" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stop-color="#FFA5C3"/>
        <stop offset="50%" stop-color="#F272A5"/>
        <stop offset="100%" stop-color="#D13D7C"/>
      </radialGradient>
    </defs>
    <rect width="512" height="512" fill="url(#bg)"/>
    <circle cx="90" cy="100" r="25" fill="#FFB3CB" opacity="0.25"/>
    <circle cx="430" cy="80" r="18" fill="#FFB3CB" opacity="0.2"/>
    <circle cx="450" cy="400" r="20" fill="#FFB3CB" opacity="0.22"/>
    <circle cx="60" cy="380" r="15" fill="#FFB3CB" opacity="0.2"/>
  </svg>`;
  await sharp(Buffer.from(bgSvg)).png().toFile(join(assetsDir, 'android-icon-background.png'));
  console.log('android-icon-background.png (512x512) created');

  // Monochrome
  const monoSvg = createJasmineFlower(512, false, false)
    .replace(/url\(#petalGrad\)/g, '#000')
    .replace(/url\(#leafGrad\)/g, '#000')
    .replace(/url\(#centerGrad\)/g, '#000')
    .replace(/url\(#petalShade\)/g, 'none')
    .replace(/#F4B800/g, '#000')
    .replace(/#E89010/g, '#000');
  await sharp(Buffer.from(monoSvg)).png().toFile(join(assetsDir, 'android-icon-monochrome.png'));
  console.log('android-icon-monochrome.png (512x512) created');

  console.log('\nAll realistic jasmine icons generated!');
}

generateIcons().catch(console.error);
