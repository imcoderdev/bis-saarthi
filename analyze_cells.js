const fs = require('fs');
const cheerio = require('cheerio');

// Re-fetch and analyze the rich cell content
async function main() {
  console.log('Fetching ISWISE portal...');
  const res = await fetch('http://164.100.105.198:8096/bis_access/iswise_query_v2.asp?txtIS=302&View=View', {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
    signal: AbortSignal.timeout(15000)
  });
  const html = await res.text();
  fs.writeFileSync('iswise_raw.html', html);
  const $ = cheerio.load(html);

  // Find first data table and show raw HTML of the name cell (column 1)
  let count = 0;
  $('table').each((ti, tableEl) => {
    if (count >= 2) return;
    const tbl = $(tableEl);
    const headerText = tbl.find('tr').first().text().trim().toLowerCase();
    if (!headerText.includes('name of the recognized laboratory')) return;
    count++;

    console.log(`\n=== Table ${ti} — first 3 data rows (raw cell HTML) ===`);
    tbl.find('tr').slice(1, 4).each((ri, row) => {
      const cells = $(row).find('td');
      if (cells.length < 2) return;

      console.log(`\n--- Row ${ri} ---`);
      // Column 1: Lab name cell (rich content)
      const nameCell = cells.eq(1);
      console.log('CELL HTML:');
      console.log(nameCell.html().substring(0, 600));
      console.log('\nCELL TEXT (split by newlines):');
      const lines = nameCell.text().split('\n').map(l => l.trim()).filter(Boolean);
      lines.forEach((l, i) => console.log(`  [${i}] "${l}"`));

      // Bold tag content
      const bold = nameCell.find('b').text().trim();
      console.log(`\nBOLD: "${bold}"`);

      // Column 3: Testing charges
      if (cells.length >= 4) {
        console.log(`CHARGES: "${cells.eq(3).text().trim().replace(/\s+/g, ' ')}"`);
      }
    });
  });
}

main().catch(e => console.error('Error:', e.message));
