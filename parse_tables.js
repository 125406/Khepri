import fs from 'fs';
const html = fs.readFileSync('event_8369.html', 'utf8');

// extract table headers or captions or previous titles
const regex = /<table[\s\S]*?<\/table>/gi;
let match;
let count = 0;
while ((match = regex.exec(html)) !== null) {
  const tableHtml = match[0];
  const rows = [];
  const trs = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trs) {
    const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [])
      .map(c => c.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
    if (cells.length) rows.push(cells);
  }
  console.log(`=== TABLE ${count++} (${rows.length} rows) ===`);
  console.log('Sample rows:', rows.slice(0, 15));
}
