import fs from 'fs';
const html = fs.readFileSync('event_8369.html', 'utf8');
const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
console.log('Tables count:', tables.length);
tables.forEach((t, i) => {
  const text = t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 150);
  console.log(`Table ${i}: ${text}`);
});

// search for 金色寶箱
const idx = html.indexOf('金色寶箱');
console.log('Index of 金色寶箱:', idx);
if (idx !== -1) {
  console.log(html.slice(idx - 200, idx + 1000).replace(/<[^>]+>/g, ' '));
}
