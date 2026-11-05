import https from 'https';
import fs from 'fs';

const pageHtml = fs.readFileSync('b84116.html', 'utf8');
const tokenMatch = pageHtml.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/i);
const token = tokenMatch ? tokenMatch[1] : '';
console.log('Found verification token:', token ? token.slice(0, 20) + '...' : 'none');

const postData = 'Bid=84116';
const req = https.request('https://maplestory.beanfun.com/bulletin?handler=BulletinDetail', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-CSRF-TOKEN': token,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'X-Requested-With': 'XMLHttpRequest',
    'Origin': 'https://maplestory.beanfun.com',
    'Referer': 'https://maplestory.beanfun.com/bulletin?bid=84116'
  }
}, res => {
  console.log('Status:', res.statusCode);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Data length:', data.length);
    fs.writeFileSync('bulletin_84116_data.json', data, 'utf8');
    console.log('Data preview:', data.slice(0, 500));
  });
});
req.write(postData);
req.end();
