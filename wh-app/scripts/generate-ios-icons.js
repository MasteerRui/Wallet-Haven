const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Error: "sharp" package is required to generate iOS icons.');
  process.exit(1);
}

const logoPath = path.join(__dirname, '../src/assets/images/logo.png');
const outputDir = path.join(__dirname, '../ios/whApp/Images.xcassets/AppIcon.appiconset');

if (!fs.existsSync(logoPath)) {
  console.error(`❌ Logo not found at: ${logoPath}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const iconSizes = [
  { name: 'icon-20@2x.png', size: 40 },   
  { name: 'icon-20@3x.png', size: 60 },   
  { name: 'icon-29@2x.png', size: 58 },   
  { name: 'icon-29@3x.png', size: 87 },   
  { name: 'icon-40@2x.png', size: 80 },   
  { name: 'icon-40@3x.png', size: 120 }, 
  { name: 'icon-60@2x.png', size: 120 }, 
  { name: 'icon-60@3x.png', size: 180 }, 
  { name: 'icon-1024.png', size: 1024 }, 
];

async function generateIcons() {
  try {
    for (const icon of iconSizes) {
      const outputPath = path.join(outputDir, icon.name);
      await sharp(logoPath)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }, 
        })
        .png()
        .toFile(outputPath);
    }
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();

