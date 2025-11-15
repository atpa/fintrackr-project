/**
 * Generate PWA PNG icons from SVG
 * Run: node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');

// Размеры иконок для PWA
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Простая SVG иконка FinTrackr (замените на вашу)
const SVG_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="128" fill="#4f46e5"/>
  <path d="M256 128c-70.7 0-128 57.3-128 128s57.3 128 128 128 128-57.3 128-128-57.3-128-128-128zm0 216c-48.5 0-88-39.5-88-88s39.5-88 88-88 88 39.5 88 88-39.5 88-88 88z" fill="white"/>
  <path d="M256 216c-22.1 0-40 17.9-40 40s17.9 40 40 40 40-17.9 40-40-17.9-40-40-40z" fill="#fbbf24"/>
  <text x="256" y="320" font-family="Arial, sans-serif" font-size="120" font-weight="bold" text-anchor="middle" fill="white">₽</text>
</svg>`;

console.log('⚠️  ВАЖНО: Для генерации PNG из SVG требуется библиотека sharp');
console.log('Установите: npm install --save-dev sharp');
console.log('');
console.log('Альтернатива: используйте онлайн-сервис (https://realfavicongenerator.net/)');
console.log('или создайте PNG вручную в графическом редакторе.');
console.log('');

// Создаём директорию для иконок если её нет
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Сохраняем SVG как основу
const svgPath = path.join(iconsDir, 'icon-base.svg');
fs.writeFileSync(svgPath, SVG_ICON);
console.log(`✅ Создан базовый SVG: ${svgPath}`);

// Проверяем наличие sharp
let sharp;
try {
  sharp = require('sharp');
  console.log('✅ Библиотека sharp найдена, генерируем PNG...\n');
} catch (err) {
  console.log('❌ Библиотека sharp не найдена.');
  console.log('\nИнструкция по ручной генерации:');
  console.log('1. Откройте ' + svgPath);
  console.log('2. Экспортируйте в PNG следующих размеров:');
  ICON_SIZES.forEach(size => {
    console.log(`   - icon-${size}x${size}.png (${size}x${size}px)`);
  });
  console.log('3. Сохраните все файлы в public/icons/');
  process.exit(0);
}

// Генерируем PNG иконки разных размеров
async function generateIcons() {
  const svgBuffer = Buffer.from(SVG_ICON);
  
  for (const size of ICON_SIZES) {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✅ Создано: icon-${size}x${size}.png`);
    } catch (err) {
      console.error(`❌ Ошибка при создании icon-${size}x${size}.png:`, err.message);
    }
  }
  
  console.log('\n🎉 Генерация иконок завершена!');
  console.log('📁 Иконки сохранены в: ' + iconsDir);
}

generateIcons().catch(err => {
  console.error('Ошибка:', err);
  process.exit(1);
});
