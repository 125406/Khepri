import sharp from 'sharp';

// banner_part4.jpg is 900 x 516
// Let's inspect the 8 cards in this section:
// Row 1 (Male Face):
//   1. 人間瑰寶
//   2. 咳咳～
//   3. 白眼和平的戴米安
//   4. 白眼好俏皮
// Row 2 (Female Face):
//   1. 人間瑰寶
//   2. 咳咳～
//   3. 白眼文靜的艾琳
//   4. 白眼好俏皮

// Let's extract the full row 1 and row 2 faces
// Total width 900, roughly 4 columns:
// col 0: ~15 to 225
// col 1: ~235 to 445
// col 2: ~455 to 665
// col 3: ~675 to 885

const meta = await sharp('banner_part4.jpg').metadata();
console.log('Part 4 dimensions:', meta.width, meta.height);

// Crop Row 1 (Male):
await sharp('banner_part4.jpg').extract({ left: 10, top: 0, width: 880, height: 180 }).toFile('faces_male_row.png');
// Crop Row 2 (Female):
await sharp('banner_part4.jpg').extract({ left: 10, top: 180, width: 880, height: 180 }).toFile('faces_female_row.png');

console.log('Saved faces_male_row.png and faces_female_row.png');
