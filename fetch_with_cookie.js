import https from 'https';
import fs from 'fs';

// Step 1: GET page to obtain Set-Cookie headers
https.get('https://maplestory.beanfun.com/bulletin?bid=84116', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
}, res => {
  const setCookie = res.headers['set-cookie'] || [];
  const cookieStr = setCookie.map(c => c.split(';')[0]).join('; ');
  console.log('Cookies:', cookieStr);

  let html = '';
  res.on('data', d => html += d);
  res.on('end', () => {
    const tokenMatch = html.match(/name="__RequestVerificationToken"\s+type="hidden"\s+value="([^"]+)"/i);
    const token = tokenMatch ? tokenMatch[1] : '';
    console.log('Token:', token ? token.slice(0, 15) : 'none');

    const postData = 'Bid=84116';
    const req = https.request('https://maplestory.beanfun.com/bulletin?handler=BulletinDetail', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-TOKEN': token,
        'Cookie': cookieStr,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://maplestory.beanfun.com',
        'Referer': 'https://maplestory.beanfun.com/bulletin?bid=84116'
      }
    }, res2 => {
      console.log('Status 2:', res2.statusCode);
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log('Data length:', data2.length);
        fs.writeFileSync('b84116_detail.json', data2, 'utf8');
        console.log('Preview:', data2.slice(0, 300));
      });
    });
    req.write(postData);
    req.end();
  });
});
