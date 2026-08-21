const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const srcLogo = path.join(rootDir, 'logo.png');

if (!fs.existsSync(srcLogo)) {
  console.error('Source logo does not exist:', srcLogo);
  process.exit(1);
}

async function createIco(inputPath, outputPath, sizes = [16, 32, 48, 64]) {
  const pngBuffers = [];
  for (const s of sizes) {
    const buf = await sharp(inputPath)
      .ensureAlpha()
      .resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ colorType: 6 })
      .toBuffer();
    pngBuffers.push({ size: s, buffer: buf });
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngBuffers.length, 4);

  let offset = 6 + 16 * pngBuffers.length;
  const dirEntries = [];
  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 0);
    entry.writeUInt8(item.size >= 256 ? 0 : item.size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(item.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += item.buffer.length;
    dirEntries.push(entry);
  }

  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const icoBuffer = Buffer.concat([header, ...dirEntries, ...pngBuffers.map(b => b.buffer)]);
  fs.writeFileSync(outputPath, icoBuffer);
  console.log('Saved ICO:', outputPath);
}

async function saveImage(inputPath, outputPath, width, height, format = 'png', options = {}) {
  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  let pipeline = sharp(inputPath).resize(width, height, {
    fit: options.fit || 'contain',
    background: options.background || { r: 0, g: 0, b: 0, alpha: 0 }
  });

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality: 95, lossless: false });
  } else if (format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  }

  await pipeline.toFile(outputPath);
  console.log(`Saved image (${width}x${height} ${format}):`, outputPath);
}

// Generates an adaptive icon with safe-zone padding (inner content ~70% of canvas)
async function saveAdaptiveForeground(inputPath, outputPath, canvasSize, format = 'png') {
  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const innerSize = Math.round(canvasSize * 0.70);
  const innerBuffer = await sharp(inputPath)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  let pipeline = sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  }).composite([
    {
      input: innerBuffer,
      gravity: 'center'
    }
  ]);

  if (format === 'webp') {
    pipeline = pipeline.webp({ quality: 95, lossless: false });
  } else if (format === 'png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  }

  await pipeline.toFile(outputPath);
  console.log(`Saved adaptive foreground (${canvasSize}x${canvasSize} ${format}):`, outputPath);
}

// Generates legacy full launcher icon on clean white background with safe padding
async function saveLegacyLauncher(inputPath, outputPath, size, isRound = false) {
  const targetDir = path.dirname(outputPath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const innerSize = Math.round(size * (isRound ? 0.72 : 0.80));
  const innerBuffer = await sharp(inputPath)
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  let pipeline;
  if (isRound) {
    const circleSvg = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="#ffffff"/></svg>`
    );
    pipeline = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    }).composite([
      { input: circleSvg, top: 0, left: 0 },
      { input: innerBuffer, gravity: 'center' }
    ]);
  } else {
    pipeline = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    }).composite([
      { input: innerBuffer, gravity: 'center' }
    ]);
  }

  await pipeline.webp({ quality: 95, lossless: false }).toFile(outputPath);
  console.log(`Saved legacy launcher (${size}x${size} webp, round=${isRound}):`, outputPath);
}

async function run() {
  console.log('--- Generating Admin Panel Assets ---');
  await saveImage(srcLogo, path.join(rootDir, 'admin-panel/public/logo.png'), 512, 512, 'png');
  await saveImage(srcLogo, path.join(rootDir, 'admin-panel/public/logo.webp'), 512, 512, 'webp');
  await saveImage(srcLogo, path.join(rootDir, 'admin-panel/public/ds-8.webp'), 512, 512, 'webp');
  await saveImage(srcLogo, path.join(rootDir, 'admin-panel/public/favicon.png'), 64, 64, 'png');
  await createIco(srcLogo, path.join(rootDir, 'admin-panel/public/favicon.ico'), [16, 32, 48, 64]);
  await createIco(srcLogo, path.join(rootDir, 'admin-panel/src/app/favicon.ico'), [16, 32, 48, 64]);
  await saveImage(srcLogo, path.join(rootDir, 'admin-panel/src/app/icon.png'), 192, 192, 'png');
  await saveImage(srcLogo, path.join(rootDir, 'admin-panel/src/app/apple-icon.png'), 180, 180, 'png');

  console.log('--- Generating RepairShopApp Assets (App Icon & Adaptive Icon) ---');
  await saveImage(srcLogo, path.join(rootDir, 'RepairShopApp/assets/logo.png'), 512, 512, 'png');
  await saveImage(srcLogo, path.join(rootDir, 'RepairShopApp/assets/logo.webp'), 512, 512, 'webp');
  await saveImage(srcLogo, path.join(rootDir, 'RepairShopApp/assets/ds-8.webp'), 512, 512, 'webp');
  
  // App Icon (1024x1024 for iOS and Expo)
  await saveImage(srcLogo, path.join(rootDir, 'RepairShopApp/assets/icon.png'), 1024, 1024, 'png');
  
  // Adaptive Icon Foreground (1024x1024 with safe-zone margin for Android)
  await saveAdaptiveForeground(srcLogo, path.join(rootDir, 'RepairShopApp/assets/adaptive-icon.png'), 1024, 'png');
  
  // Android Icon Foreground (432x432)
  await saveAdaptiveForeground(srcLogo, path.join(rootDir, 'RepairShopApp/assets/android-icon-foreground.png'), 432, 'png');
  
  // Splash Icon (512x512)
  await saveImage(srcLogo, path.join(rootDir, 'RepairShopApp/assets/splash-icon.png'), 512, 512, 'png');
  await saveImage(srcLogo, path.join(rootDir, 'RepairShopApp/assets/favicon.png'), 48, 48, 'png');
  await createIco(srcLogo, path.join(rootDir, 'RepairShopApp/assets/favicon.ico'), [16, 32, 48]);

  console.log('--- Generating Android Native Drawables & Mipmaps ---');
  const splashSizes = {
    'mdpi': 288,
    'hdpi': 432,
    'xhdpi': 576,
    'xxhdpi': 864,
    'xxxhdpi': 1152
  };
  for (const [density, sz] of Object.entries(splashSizes)) {
    const p = path.join(rootDir, 'RepairShopApp/android/app/src/main/res', `drawable-${density}`, 'splashscreen_logo.png');
    await saveImage(srcLogo, p, sz, sz, 'png');
  }

  const notifSizes = {
    'mdpi': 24,
    'hdpi': 36,
    'xhdpi': 48,
    'xxhdpi': 72,
    'xxxhdpi': 96
  };
  for (const [density, sz] of Object.entries(notifSizes)) {
    const p = path.join(rootDir, 'RepairShopApp/android/app/src/main/res', `drawable-${density}`, 'notification_icon.png');
    await saveImage(srcLogo, p, sz, sz, 'png');
  }

  const launcherSizes = {
    'mdpi': { launcher: 48, foreground: 108 },
    'hdpi': { launcher: 72, foreground: 162 },
    'xhdpi': { launcher: 96, foreground: 216 },
    'xxhdpi': { launcher: 144, foreground: 324 },
    'xxxhdpi': { launcher: 192, foreground: 432 }
  };
  for (const [density, cfg] of Object.entries(launcherSizes)) {
    const resDir = path.join(rootDir, 'RepairShopApp/android/app/src/main/res', `mipmap-${density}`);
    await saveLegacyLauncher(srcLogo, path.join(resDir, 'ic_launcher.webp'), cfg.launcher, false);
    await saveLegacyLauncher(srcLogo, path.join(resDir, 'ic_launcher_round.webp'), cfg.launcher, true);
    await saveAdaptiveForeground(srcLogo, path.join(resDir, 'ic_launcher_foreground.webp'), cfg.foreground, 'webp');
  }

  console.log('--- Generating Base64 Logo for Edge Functions ---');
  const b64Buf = await sharp(srcLogo)
    .resize(150, 150, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const b64String = 'data:image/png;base64,' + b64Buf.toString('base64');

  const svgAssetsPath = path.join(rootDir, 'supabase/functions/generate-invoice/svgAssets.ts');
  if (fs.existsSync(svgAssetsPath)) {
    let content = fs.readFileSync(svgAssetsPath, 'utf8');
    content = content.replace(/export const LOGO_B64 = "data:image\/[^"]+";/, `export const LOGO_B64 = "${b64String}";`);
    fs.writeFileSync(svgAssetsPath, content, 'utf8');
    console.log('Updated supabase/functions/generate-invoice/svgAssets.ts with new base64 logo!');
  }

  console.log('All logo and favicon assets successfully generated and synced!');
}

run().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
