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
export interface PDFData {
  title: string;
  price: number;
  isFree: boolean;
  amendments: number;
  status: string;
  bsbUrl: string;
  error: false;
}

export interface PDFError {
  error: true;
  bsbUrl: string;
}

// ──────────────── Scraper ────────────────
export async function scrapePDFInfo(isNum: string): Promise<PDFData | PDFError> {
  const cacheKey = `pdf-${isNum}`;
  const cached = getCached(cacheKey);
  if (cached) return cached as PDFData | PDFError;

  const bsbUrl = `https://standardsbis.bsbedge.com/BIS_SearchStandard.aspx?Standard_Number=is+${isNum}&id=0`;

  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-IN,en;q=0.9',
    'Referer': 'https://standardsbis.bsbedge.com/',
  };

  try {
    const res = await fetch(bsbUrl, {
      headers,
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const html = await res.text();
    const $ = cheerio.load(html);

    let title = '';
    let price = 0;
    let isFree = false;
    let amendments = 0;
    let status = 'current';

    // BSB Edge typically shows data in tables; scan all table cells
    $('table tr').each((_: number, row) => {
      const cells = $(row).find('td, th');
      const rowText = $(row).text().trim().toLowerCase();

      if (cells.length >= 2) {
        const label = cells.eq(0).text().trim().toLowerCase();
        const value = cells.eq(1).text().trim();

        if (label.includes('title') || label.includes('name')) {
          if (!title) title = value;
        }
        if (label.includes('price') || label.includes('cost') || label.includes('rate')) {
          const priceMatch = value.replace(/,/g, '').match(/\d+(\.\d+)?/);
          if (priceMatch) {
            price = parseFloat(priceMatch[0]);
            isFree = price === 0;
          }
        }
        if (label.includes('amendment') || label.includes('amd')) {
          const amdMatch = value.match(/\d+/);
          if (amdMatch) amendments = parseInt(amdMatch[0]);
        }
        if (label.includes('status')) {
          status = value || 'current';
        }
      }

      // Check for price pattern in row text
      if (rowText.includes('price') || rowText.includes('₹') || rowText.includes('rs.') || rowText.includes('inr')) {
        const priceMatch = $(row).text().replace(/,/g, '').match(/(?:rs\.?\s*|₹\s*|inr\s*)(\d+(\.\d+)?)/i);
        if (priceMatch && !price) {
          price = parseFloat(priceMatch[1]);
          isFree = price === 0;
        }
      }
    });

    // Try searching for price in entire page
    if (!price) {
      const bodyText = $('body').text().replace(/,/g, '');
      const priceMatch = bodyText.match(/(?:rs\.?\s*|₹\s*|inr\s*)(\d+(?:\.\d+)?)/i);
      if (priceMatch) {
        price = parseFloat(priceMatch[1]);
        isFree = price === 0;
      }
    }

    // Try to get title from heading or page title
    if (!title) {
      title = $('h1, h2, .title, #lblTitle, [id*="Title"]').first().text().trim();
    }
    if (!title) {
      // Try to get from the page title
      title = $('title').text().trim();
      if (title.toLowerCase().includes('bis') || title.toLowerCase().includes('search')) {
        title = `IS ${isNum}`;
      }
    }

    // Free check
    const bodyLower = $('body').text().toLowerCase();
    if (bodyLower.includes('free') || bodyLower.includes('complimentary') || price === 0) {
      if (price === 0) isFree = true;
    }

    // Amendment count – look for "Amendment" text occurrences or specific count
    if (!amendments) {
      const amdMatches = $('body').text().match(/amendment/gi);
      if (amdMatches && amdMatches.length > 1) {
        amendments = amdMatches.length - 1; // subtract header
      }
    }

    const result: PDFData = {
      title: title || `IS ${isNum}`,
      price,
      isFree: isFree || price === 0,
      amendments,
      status: status || 'current',
      bsbUrl,
      error: false,
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    const errResult: PDFError = { error: true, bsbUrl };
    setCache(cacheKey, errResult);
    return errResult;
  }
}
