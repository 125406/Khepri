import sharp from 'sharp';

// banner is 900 x 2316
// Let's crop into 4 vertical slices to inspect
const img = sharp('royal_banner_84116.jpg');
const meta = await img.metadata();
console.log('Metadata:', meta.width, meta.height);

// Section 1: 0 - 600
await sharp('royal_banner_84116.jpg').extract({ left: 0, top: 0, width: meta.width, height: 600 }).toFile('banner_part1.jpg');
// Section 2: 600 - 1200
await sharp('royal_banner_84116.jpg').extract({ left: 0, top: 600, width: meta.width, height: 600 }).toFile('banner_part2.jpg');
// Section 3: 1200 - 1800
await sharp('royal_banner_84116.jpg').extract({ left: 0, top: 1200, width: meta.width, height: 600 }).toFile('banner_part3.jpg');
// Section 4: 1800 - 2316
await sharp('royal_banner_84116.jpg').extract({ left: 0, top: 1800, width: meta.width, height: meta.height - 1800 }).toFile('banner_part4.jpg');

console.log('Done splitting banner!');
