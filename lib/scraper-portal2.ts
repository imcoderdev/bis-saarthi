import * as cheerio from 'cheerio';

// ──────────────── In-memory cache ────────────────
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours

function getCached(key: string) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ──────────────── Types ────────────────
export interface Lab {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  phone: string;
  email: string;
  labCode: string;
  testingCharges: string;
  price: number;         // parsed numeric price in INR
  remarks: string;
  exclusionCount: number;
  hasFullCoverage: boolean;
  section: string;
}

export interface LabsData {
  labs: Lab[];
  total: number;
  sections: string[];
  states: string[];
  error: false;
  directUrl: string;
}

export interface LabsError {
  error: true;
  total: 0;
  labs: Lab[];
  sections: string[];
  states: string[];
  directUrl: string;
}

// ──────────────── Helpers ────────────────

/**
 * Parse Indian Rupee price from a string like "Rs. 53000/-", "Rs.1,05,000/-"
 */
function parsePrice(charges: string): number {
  if (!charges) return 0;
  const match = charges.match(/Rs\.?\s*([\d,]+)/i);
  if (!match) return 0;
  // Indian format: "1,05,000" → remove commas → 105000
  return parseInt(match[1].replace(/,/g, ''), 10) || 0;
}

/**
 * Count exclusion clauses in remarks text.
 * Looks for patterns like "Cl.19.11.4.1", "Cl. 24", "Clause 32" etc.
 */
function countExclusions(remarks: string): number {
  if (!remarks) return 0;
  const lower = remarks.toLowerCase();
  if (!lower.includes('exclu') && !lower.includes('scope restricted')) return 0;

  // Count distinct clause references
  const clauseMatches = remarks.match(/Cl\.?\s*[\d.]+/gi);
  if (clauseMatches && clauseMatches.length > 0) return clauseMatches.length;

  // Fallback: count "exclusion" keywords
  const exclMatches = remarks.match(/exclu/gi);
  return exclMatches ? exclMatches.length : 0;
}

/**
 * Parse the rich lab name cell which contains:
 * - Lab name (in <b> tag)
 * - Address lines
 * - City-Pincode (e.g., "Palghar-401404")
 * - State (e.g., "Maharashtra")
 * - Contact person, Tel, Email
 */
function parseLabCell(cellText: string, boldText: string): {
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  phone: string;
  email: string;
} {
  const lines = cellText.split('\n').map(l => l.trim()).filter(Boolean);

  const name = boldText || lines[0] || '';
  let address = '';
  let city = '';
  let state = '';
  let pincode = '';
  let contactPerson = '';
  let phone = '';
  let email = '';

  // Known Indian states/UTs for matching
  const indianStates = new Set([
    'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
    'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
    'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
    'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
    'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
    'delhi', 'chandigarh', 'puducherry', 'jammu and kashmir', 'ladakh',
    'andaman and nicobar islands', 'dadra and nagar haveli', 'daman and diu',
    'lakshadweep', 'new delhi',
  ]);

  const addressLines: string[] = [];
  let foundCity = false;
  let foundContact = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lower = line.toLowerCase();

    // Skip the lab name (first line or matches bold)
    if (i === 0 && lower === name.toLowerCase()) continue;
    if (line === boldText) continue;

    // Check for city-pincode pattern (e.g., "Palghar-401404", "New Delhi-110042")
    const cityPinMatch = line.match(/^(.+?)[-–\s]+(\d{6})\s*$/);
    if (cityPinMatch && !foundCity) {
      city = cityPinMatch[1].trim().replace(/,+$/, '');
      pincode = cityPinMatch[2];
      foundCity = true;
      continue;
    }

    // Check for state
    if (indianStates.has(lower) || indianStates.has(lower.replace(/\s+/g, ' '))) {
      state = line;
      continue;
    }

    // Contact section
    if (lower.startsWith('contact')) {
      foundContact = true;
      // Sometimes the contact name is on the same line: "Contact : John Doe"
      const contactInline = line.match(/Contact\s*:\s*(.+)/i);
      if (contactInline && contactInline[1].trim()) {
        contactPerson = contactInline[1].trim();
      }
      continue;
    }

    // If we're past "Contact :" and haven't found tel yet
    if (foundContact && !phone) {
      if (lower.startsWith('tel')) {
        const telInline = line.match(/Tel\s*:\s*(.+)/i);
        if (telInline && telInline[1].trim()) {
          phone = telInline[1].trim();
        } else if (i + 1 < lines.length) {
          // Phone is on the next line
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && /\d/.test(nextLine) && !nextLine.toLowerCase().startsWith('fax')) {
            phone = nextLine;
          }
        }
        continue;
      }
      if (lower.startsWith('fax')) continue;
      if (lower.startsWith('email')) {
        const emailInline = line.match(/Email\s*:\s*(.+)/i);
        if (emailInline && emailInline[1].trim()) {
          email = emailInline[1].trim();
        } else if (i + 1 < lines.length) {
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && nextLine.includes('@')) {
            email = nextLine;
          }
        }
        continue;
      }
      // If the line looks like a person's name (no digits, not a keyword)
      if (!contactPerson && !lower.startsWith('tel') && !lower.startsWith('fax') && !lower.startsWith('email') && !/\d{4}/.test(line)) {
        contactPerson = line;
        continue;
      }
      // If it looks like a phone number
      if (!phone && /[\d\s-]{7,}/.test(line)) {
        phone = line;
        continue;
      }
      // If it looks like an email
      if (!email && line.includes('@')) {
        email = line;
        continue;
      }
    }

    // Address lines (before city/contact)
    if (!foundCity && !foundContact) {
      addressLines.push(line);
    }
  }

  address = addressLines.join(', ').replace(/,+/g, ',').replace(/,\s*$/, '');

  return { name, address, city, state, pincode, contactPerson, phone, email };
}

// ──────────────── Scraper ────────────────
export async function scrapeLabs(isNum: string): Promise<LabsData | LabsError> {
  const cacheKey = `labs-${isNum}`;
  const cached = getCached(cacheKey);
  if (cached) return cached as LabsData | LabsError;

  const fetchUrl = `http://164.100.105.198:8096/bis_access/iswise_query_v2.asp?txtIS=${isNum}&View=View`;
  const directUrl = 'http://164.100.105.198:8096/bis_access/iswise_v2.html';

  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-IN,en;q=0.9',
  };

  try {
    const res = await fetch(fetchUrl, {
      headers,
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    const allLabs: Lab[] = [];
    const sectionsSet = new Set<string>();

    $('table').each((_tableIdx: number, tableEl) => {
      const tbl = $(tableEl);
      const headerRow = tbl.find('tr').first();
      const headerText = headerRow.text().trim().toLowerCase();

      // Only process tables with the expected lab data header
      if (!headerText.includes('name of the recognized laboratory')) return;

      // Find section header from preceding <b> elements
      let section = '';
      let prev = tbl.prev();
      for (let lookback = 0; lookback < 10 && prev.length; lookback++) {
        const prevText = prev.text().trim();
        if (prevText.match(/IS\s*Number\s*:-/i) || prevText.match(/IS\s*\d+/i)) {
          const match = prevText.match(/IS\s*\d+[^\n]*/i);
          if (match) {
            section = match[0].trim().substring(0, 150);
          }
          break;
        }
        prev = prev.prev();
      }

      if (!section) {
        let parentEl = tbl.parent();
        for (let lookback = 0; lookback < 5 && parentEl.length; lookback++) {
          const prevSibling = parentEl.prev();
          if (prevSibling.length) {
            const prevText = prevSibling.text().trim();
            const match = prevText.match(/IS\s*\d+[^\n]*/i);
            if (match) {
              section = match[0].trim().substring(0, 150);
              break;
            }
          }
          parentEl = parentEl.parent();
        }
      }

      if (section) sectionsSet.add(section);

      // Parse data rows
      const rows = tbl.find('tr');
      rows.each((rowIdx: number, rowEl) => {
        if (rowIdx === 0) return; // skip header

        const cells = $(rowEl).find('td');
        if (cells.length < 3) return;

        // Column mapping: [0]=Sl No, [1]=Lab Name (rich), [2]=Lab Code, [3]=Charges, [4]=Remarks
        const nameCell = cells.eq(1);
        const boldText = nameCell.find('b').first().text().trim();
        const cellText = nameCell.text().trim();
        const labCode = cells.eq(2).text().trim();
        const testingCharges = cells.length >= 4 ? cells.eq(3).text().trim().replace(/\s+/g, ' ') : '';
        const remarks = cells.length >= 5 ? cells.eq(4).text().trim().replace(/\s+/g, ' ').substring(0, 300) : '';

        // Skip rows without a valid lab name
        if (!boldText && (!cellText || cellText.length < 3)) return;
        // Skip rows where "name" is a number or price
        const checkName = boldText || cellText.split('\n')[0].trim();
        if (/^\d+$/.test(checkName) || /^Rs[\.\s]/i.test(checkName)) return;

        // Parse the rich cell content
        const parsed = parseLabCell(cellText, boldText);

        // Parse price and exclusions
        const price = parsePrice(testingCharges);
        const exclusionCount = countExclusions(remarks);
        const hasFullCoverage = exclusionCount === 0 && remarks.length > 0;

        allLabs.push({
          ...parsed,
          labCode,
          testingCharges,
          price,
          remarks,
          exclusionCount,
          hasFullCoverage,
          section: section || `IS ${isNum}`,
        });
      });
    });

    // Deduplicate by lab name (keep the entry with the best data — most fields filled)
    const uniqueLabMap = new Map<string, Lab>();
    for (const lab of allLabs) {
      const key = lab.name.toLowerCase().replace(/\s+/g, ' ').trim();
      const existing = uniqueLabMap.get(key);
      if (!existing) {
        uniqueLabMap.set(key, lab);
      } else {
        // Keep the one with more filled fields / lower price
        const existingScore = (existing.city ? 1 : 0) + (existing.phone ? 1 : 0) + (existing.email ? 1 : 0);
        const newScore = (lab.city ? 1 : 0) + (lab.phone ? 1 : 0) + (lab.email ? 1 : 0);
        if (newScore > existingScore || (newScore === existingScore && lab.price > 0 && (existing.price === 0 || lab.price < existing.price))) {
          uniqueLabMap.set(key, lab);
        }
      }
    }
    const uniqueLabs = Array.from(uniqueLabMap.values());

    const sections = Array.from(sectionsSet).sort();
    const states = Array.from(new Set(uniqueLabs.map(l => l.state).filter(Boolean))).sort();

    const result: LabsData = {
      labs: uniqueLabs,
      total: uniqueLabs.length,
      sections,
      states,
      error: false,
      directUrl,
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    const errResult: LabsError = { error: true, total: 0, labs: [], sections: [], states: [], directUrl };
    return errResult;
  }
}
