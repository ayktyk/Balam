import sharp from 'sharp';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = join(__dirname, '..', 'assets');

// Jasmine flower petal path - elongated teardrop shape (like real jasmine)
// Jasmine has 5-6 long, narrow, pointed petals
const petalPath = (cx, cy, angle, length, width, s) => {
  // Create a pointed teardrop/leaf shape pointing outward
  const rad = angle * Math.PI / 180;
  const tipX = cx + Math.cos(rad) * length;
  const tipY = cy + Math.sin(rad) * length;
  const baseX = cx + Math.cos(rad) * (length * 0.1);
  const baseY = cy + Math.sin(rad) * (length * 0.1);

  // Perpendicular for width
  const perpX = -Math.sin(rad);
  const perpY = Math.cos(rad);

  // Control points for the curved petal sides
  const midDist = length * 0.45;
  const midX = cx + Math.cos(rad) * midDist;
  const midY = cy + Math.sin(rad) * midDist;

  const leftMidX = midX + perpX * width;
  const leftMidY = midY + perpY * width;
  const rightMidX = midX - perpX * width;
  const rightMidY = midY - perpY * width;

  // Base corners
  const baseLeftX = baseX + perpX * (width * 0.3);
  const baseLeftY = baseY + perpY * (width * 0.3);
  const baseRightX = baseX - perpX * (width * 0.3);
  const baseRightY = baseY - perpY * (width * 0.3);

  return `M ${baseLeftX.toFixed(2)},${baseLeftY.toFixed(2)}
          Q ${leftMidX.toFixed(2)},${leftMidY.toFixed(2)} ${tipX.toFixed(2)},${tipY.toFixed(2)}
          Q ${rightMidX.toFixed(2)},${rightMidY.toFixed(2)} ${baseRightX.toFixed(2)},${baseRightY.toFixed(2)}
          Z`;
};

// Main jasmine flower SVG - 5 distinct pointed petals like a real jasmine
const createJasmineFlower = (s, includeText = false, includeBackground = true) => {
  const cx = s / 2;
  const cy = includeText ? s * 0.44 : s / 2;
  const flowerSize = s * 0.38; // petal length from center

  // 5 main petals at 72° apart, starting from top
  const mainPetals = [0, 1, 2, 3, 4].map(i => {
    const angle = i * 72 - 90; // -90 to start from top
    return petalPath(cx, cy, angle, flowerSize, s * 0.095, s);
  }).join(' ');

  // 5 secondary petals behind, rotated 36°
  const backPetals = [0, 1, 2, 3, 4].map(i => {
    const angle = i * 72 + 36 - 90;
    return petalPath(cx, cy, angle, flowerSize * 0.85, s * 0.075, s);
  }).join(' ');

  const textPart = includeText ? `
  <text x="${cx}" y="${s * 0.86}"
        font-family="Georgia, 'Times New Roman', serif"
        font-size="${s * 0.078}"
        font-weight="300"
        font-style="italic"
        fill="#FFFFFF"
        text-anchor="middle"
        opacity="0.97"
        letter-spacing="${s * 0.004}">aybalam</text>` : '';

  const bgPart = includeBackground ? `
  <rect x="0" y="0" width="${s}" height="${s}" rx="${s * 0.22}" ry="${s * 0.22}" fill="url(#bgGrad)"/>

  <!-- Soft decorative circles for premium feel -->
  <circle cx="${s * 0.18}" cy="${s * 0.2}" r="${s * 0.05}" fill="#FFB3CB" opacity="0.25"/>
  <circle cx="${s * 0.85}" cy="${s * 0.15}" r="${s * 0.035}" fill="#FFB3CB" opacity="0.2"/>
  <circle cx="${s * 0.88}" cy="${s * 0.78}" r="${s * 0.04}" fill="#FFB3CB" opacity="0.22"/>
  <circle cx="${s * 0.12}" cy="${s * 0.75}" r="${s * 0.03}" fill="#FFB3CB" opacity="0.2"/>
  ` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
  <defs>
    <!-- Premium pink gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#FFA5C3"/>
      <stop offset="50%" stop-color="#F272A5"/>
      <stop offset="100%" stop-color="#D13D7C"/>
    </radialGradient>

    <!-- Petal gradient - soft cream with depth -->
    <radialGradient id="petalGrad" cx="50%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="#FFFAF5"/>
      <stop offset="80%" stop-color="#FFE4D1"/>
      <stop offset="100%" stop-color="#FFD0B3"/>
    </radialGradient>

    <!-- Back petal gradient - slightly darker -->
    <radialGradient id="backPetalGrad" cx="50%" cy="20%" r="80%">
      <stop offset="0%" stop-color="#FFF5EC"/>
      <stop offset="60%" stop-color="#FFDDC0"/>
      <stop offset="100%" stop-color="#FFBE95"/>
    </radialGradient>

    <!-- Center gradient -->
    <radialGradient id="centerGrad" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#FFF0A0"/>
      <stop offset="40%" stop-color="#FFD93D"/>
      <stop offset="100%" stop-color="#E89020"/>
    </radialGradient>

    <!-- Subtle petal shadow at base -->
    <radialGradient id="petalShade" cx="50%" cy="90%" r="50%">
      <stop offset="0%" stop-color="#E8A080" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#FFE4D1" stop-opacity="0"/>
    </radialGradient>

    <!-- Flower drop shadow -->
    <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="${s * 0.008}"/>
      <feOffset dx="0" dy="${s * 0.004}" result="offsetblur"/>
      <feFlood flood-color="#A02050" flood-opacity="0.35"/>
      <feComposite in2="offsetblur" operator="in"/>
      <feMerge>
        <feMergeNode/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Petal outline/glow -->
    <filter id="petalGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="${s * 0.003}" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#7BC88A"/>
      <stop offset="100%" stop-color="#3A8050"/>
    </linearGradient>
  </defs>
${bgPart}
  <g filter="url(#dropShadow)">
    <!-- Decorative leaves at bottom -->
    <path d="M ${cx - s * 0.1},${cy + s * 0.32}
             Q ${cx - s * 0.22},${cy + s * 0.3} ${cx - s * 0.26},${cy + s * 0.22}
             Q ${cx - s * 0.18},${cy + s * 0.25} ${cx - s * 0.1},${cy + s * 0.32} Z"
          fill="url(#leafGrad)" opacity="0.9"/>
    <path d="M ${cx + s * 0.1},${cy + s * 0.32}
             Q ${cx + s * 0.22},${cy + s * 0.3} ${cx + s * 0.26},${cy + s * 0.22}
             Q ${cx + s * 0.18},${cy + s * 0.25} ${cx + s * 0.1},${cy + s * 0.32} Z"
          fill="url(#leafGrad)" opacity="0.9"/>

    <!-- Back petals (offset by 36°) -->
    <path d="${backPetals}" fill="url(#backPetalGrad)" opacity="0.92"
          stroke="#E8A080" stroke-width="${s * 0.002}" stroke-opacity="0.3"/>

    <!-- Main petals -->
    <path d="${mainPetals}" fill="url(#petalGrad)" opacity="1"
          stroke="#D88060" stroke-width="${s * 0.0025}" stroke-opacity="0.35"
          filter="url(#petalGlow)"/>

    <!-- Petal shading at base for depth -->
    <circle cx="${cx}" cy="${cy}" r="${s * 0.13}" fill="url(#petalShade)" opacity="0.5"/>

    <!-- Center disc -->
    <circle cx="${cx}" cy="${cy}" r="${s * 0.065}" fill="url(#centerGrad)"/>

    <!-- Stamens (tiny dots around center) -->
    ${[0, 45, 90, 135, 180, 225, 270, 315].map(a => {
      const rad = a * Math.PI / 180;
      const r = s * 0.038;
      const x = cx + Math.cos(rad) * r;
      const y = cy + Math.sin(rad) * r;
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${(s * 0.009).toFixed(2)}" fill="#E89020" opacity="0.85"/>`;
    }).join('\n    ')}

    <!-- Center highlight -->
    <circle cx="${cx - s * 0.015}" cy="${cy - s * 0.018}" r="${s * 0.028}" fill="#FFF4B0" opacity="0.7"/>
    <circle cx="${cx - s * 0.02}" cy="${cy - s * 0.022}" r="${s * 0.012}" fill="#FFFFFF" opacity="0.8"/>
  </g>
${textPart}
</svg>`;
};

async function generateIcons() {
  console.log('Generating premium jasmine flower icons...\n');

  // Main app icon (1024x1024) - with text, pink background
  const iconSvg = createJasmineFlower(1024, true, true);
  writeFileSync(join(assetsDir, 'icon.svg'), iconSvg);
  await sharp(Buffer.from(iconSvg))
    .png()
    .toFile(join(assetsDir, 'icon.png'));
  console.log('icon.png (1024x1024) created');

  // Favicon (48x48) - simple, no text, pink bg
  const faviconSvg = createJasmineFlower(256, false, true);
  await sharp(Buffer.from(faviconSvg))
    .resize(48, 48)
    .png()
    .toFile(join(assetsDir, 'favicon.png'));
  console.log('favicon.png (48x48) created');

  // Splash icon - no text, no background (splash has its own bg color)
  const splashSvg = createJasmineFlower(512, false, true);
  await sharp(Buffer.from(splashSvg))
    .resize(200, 200)
    .png()
    .toFile(join(assetsDir, 'splash-icon.png'));
  console.log('splash-icon.png (200x200) created');

  // Android adaptive foreground - flower only, no bg (66% safe zone)
  const fgSvg = createJasmineFlower(512, false, false);
  await sharp(Buffer.from(fgSvg))
    .resize(512, 512)
    .png()
    .toFile(join(assetsDir, 'android-icon-foreground.png'));
  console.log('android-icon-foreground.png (512x512) created');

  // Android adaptive background - solid pink gradient
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
  await sharp(Buffer.from(bgSvg))
    .png()
    .toFile(join(assetsDir, 'android-icon-background.png'));
  console.log('android-icon-background.png (512x512) created');

  // Monochrome for Android themed icons
  const s = 512;
  const cx = s / 2;
  const cy = s / 2;
  const flowerSize = s * 0.38;

  const mainPetalsMono = [0, 1, 2, 3, 4].map(i => {
    const angle = i * 72 - 90;
    return petalPath(cx, cy, angle, flowerSize, s * 0.095, s);
  }).join(' ');

  const backPetalsMono = [0, 1, 2, 3, 4].map(i => {
    const angle = i * 72 + 36 - 90;
    return petalPath(cx, cy, angle, flowerSize * 0.85, s * 0.075, s);
  }).join(' ');

  const monoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}">
    <path d="${backPetalsMono}" fill="#000" opacity="0.5"/>
    <path d="${mainPetalsMono}" fill="#000" opacity="0.85"/>
    <circle cx="${cx}" cy="${cy}" r="${s * 0.065}" fill="#000"/>
  </svg>`;
  await sharp(Buffer.from(monoSvg))
    .png()
    .toFile(join(assetsDir, 'android-icon-monochrome.png'));
  console.log('android-icon-monochrome.png (512x512) created');

  console.log('\nAll premium jasmine icons generated!');
}

generateIcons().catch(console.error);
