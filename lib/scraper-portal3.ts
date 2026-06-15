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
export interface StandardData {
  isNumber: string;
  title: string;
  year: string;
  committee: string;
  qco: 'mandatory' | 'voluntary' | 'not found';
  status: 'current' | 'superseded' | 'withdrawn' | 'unknown';
  error: false;
  directUrl: string;
}

export interface StandardError {
  error: true;
  directUrl: string;
}

// ──────────────── Scraper ────────────────
export async function scrapeStandard(isNum: string): Promise<StandardData | StandardError> {
  const cacheKey = `standard-${isNum}`;
  const cached = getCached(cacheKey);
  if (cached) return cached as StandardData | StandardError;

  const primaryUrl = `https://standards.bis.gov.in/website/know-your-standards?searchTerm=IS%20${isNum}`;
  const fallbackUrl = `https://www.services.bis.gov.in/php/BIS_2.0/bisconnect/knowyourstandards/Indian_standards/isdetails/`;

  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-IN,en;q=0.9',
  };

  let html = '';
  let usedUrl = primaryUrl;

  try {
    const res = await fetch(primaryUrl, {
      headers,
      signal: AbortSignal.timeout(12000),
    });
    if (res.ok) {
      html = await res.text();
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch {
    try {
      const res = await fetch(fallbackUrl, {
        headers,
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        html = await res.text();
        usedUrl = fallbackUrl;
      } else {
        throw new Error('Both portals failed');
      }
    } catch {
      const errResult: StandardError = { error: true, directUrl: primaryUrl };
      setCache(cacheKey, errResult);
      return errResult;
    }
  }

  try {
    const $ = cheerio.load(html);

    // Try to find IS number in headings / table cells
    let isNumber = '';
    let title = '';
    let year = '';
    let committee = '';
    let qco: StandardData['qco'] = 'not found';
    let status: StandardData['status'] = 'unknown';

    // Look for IS number pattern in visible text
    const pageText = $('body').text();

    // IS number: match "IS <number>..." pattern
    const isNumMatch = pageText.match(new RegExp(`IS\\s*${isNum}[^\\n]{0,60}`, 'i'));
    if (isNumMatch) {
      isNumber = isNumMatch[0].trim().substring(0, 60).split('\n')[0].trim();
    } else {
      isNumber = `IS ${isNum}`;
    }

    // Title: look for title-like elements
    const titleEl = $('h1, h2, h3, .title, .standard-title, [class*="title"], td:contains("Title")').first();
    if (titleEl.length) {
      const next = titleEl.next();
      title = (next.text() || titleEl.text()).trim().substring(0, 200);
    }

    // Year: match 4-digit year
    const yearMatch = pageText.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) year = yearMatch[0];

    // Committee: match committee code pattern like "ETD 18", "MED 6", etc.
    const committeeMatch = pageText.match(/\b([A-Z]{2,4}\s*\d+)\b/);
    if (committeeMatch) committee = committeeMatch[1];

    // QCO status
    const lowerText = pageText.toLowerCase();
    if (lowerText.includes('mandatory') || lowerText.includes('qco')) {
      if (lowerText.includes('mandatory')) qco = 'mandatory';
      else qco = 'voluntary';
    } else if (lowerText.includes('voluntary')) {
      qco = 'voluntary';
    }

    // Status
    if (lowerText.includes('superseded') || lowerText.includes('super-seded')) {
      status = 'superseded';
    } else if (lowerText.includes('withdrawn')) {
      status = 'withdrawn';
    } else if (lowerText.includes('current') || lowerText.includes('active')) {
      status = 'current';
    }

    // Scan table rows for structured data
    $('table tr').each((_: number, row) => {
      const cells = $(row).find('td');
      if (cells.length >= 2) {
        const label = cells.eq(0).text().trim().toLowerCase();
        const value = cells.eq(1).text().trim();
        if (label.includes('title') && !title) title = value;
        if ((label.includes('year') || label.includes('edition')) && !year) {
          const y = value.match(/\b(19|20)\d{2}\b/);
          if (y) year = y[0];
        }
        if (label.includes('committee') && !committee) committee = value;
        if (label.includes('status') && status === 'unknown') {
          const v = value.toLowerCase();
          if (v.includes('current')) status = 'current';
          else if (v.includes('superseded')) status = 'superseded';
          else if (v.includes('withdrawn')) status = 'withdrawn';
        }
        if (label.includes('qco') || label.includes('mandatory')) {
          const v = value.toLowerCase();
          if (v.includes('mandatory')) qco = 'mandatory';
          else if (v.includes('voluntary')) qco = 'voluntary';
        }
      }
    });

    // If title is still empty, extract from page text near isNumber
    if (!title) {
      const lines = pageText.split('\n').map(l => l.trim()).filter(Boolean);
      const idx = lines.findIndex(l => l.match(new RegExp(`IS\\s*${isNum}`, 'i')));
      if (idx >= 0 && idx + 1 < lines.length) {
        title = lines[idx + 1].substring(0, 200);
      }
    }

    const result: StandardData = {
      isNumber: isNumber || `IS ${isNum}`,
      title: title || 'Standard information retrieved',
      year: year || '',
      committee: committee || '',
      qco,
      status: status === 'unknown' ? 'current' : status,
      error: false,
      directUrl: usedUrl,
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    const errResult: StandardError = { error: true, directUrl: primaryUrl };
    setCache(cacheKey, errResult);
    return errResult;
  }
}
