import https from 'https';
import fs from 'fs';

const url = 'https://maplestory.beanfun.com/bulletin?bid=84116';
https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    fs.writeFileSync('b84116.html', data, 'utf8');
    const imgs = data.match(/https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg)/gi) || [];
    console.log('Images in 84116:', imgs);
    console.log('Preview:');
    console.log(data.slice(0, 1000));
  });
});
