import fs from 'fs';
const html = fs.readFileSync('event_8369.html', 'utf8');

const regex = /<table[\s\S]*?<\/table>/gi;
const match = regex.exec(html);
if (match) {
  const tableHtml = match[0];
  const rows = [];
  const trs = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  for (const tr of trs) {
    const cells = (tr.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) || [])
      .map(c => c.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
    if (cells.length) rows.push(cells);
  }
  console.log('TABLE 0 FULL ITEMS (Total ' + rows.length + '):');
  let totalChance = 0;
  rows.slice(1).forEach(([name, chanceStr]) => {
    const chance = parseFloat(chanceStr.replace('%', ''));
    totalChance += chance;
    console.log(`{ name: '${name}', chance: ${chance} },`);
  });
  console.log('Total chance:', totalChance.toFixed(2));
}
