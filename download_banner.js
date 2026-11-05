import https from 'https';
import fs from 'fs';

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', reject);
  });
}

await download('https://tw.hicdn.beanfun.com/beanfun/WebImage/1793707023453.jpg', 'royal_banner_84116.jpg');
console.log('Downloaded royal_banner_84116.jpg, size:', fs.statSync('royal_banner_84116.jpg').size);
