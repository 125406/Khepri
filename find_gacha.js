import fs from 'fs';
const text = fs.readFileSync('src/components/GachaSimulator.vue', 'utf8');
const lines = text.split('\n');
lines.forEach((l, i) => {
  if (l.includes('高濃縮') || l.includes('GOLDEN_BOX') || l.includes('goldenBox') || l.includes('金色寶箱') || l.includes('戴米安') || l.includes('咳咳') || l.includes('人間瑰寶')) {
    console.log(`Line ${i+1}: ${l}`);
  }
});
