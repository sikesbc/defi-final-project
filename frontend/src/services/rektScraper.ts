/**
 * Frontend service for scraping rekt.news leaderboard
 * Note: This uses browser fetch API and DOMParser for HTML parsing
 */

export interface RawAttack {
  protocol_name: string;
  attack_date: string;
  loss_amount_usd: number;
  description?: string;
  source_url?: string;
  attack_type?: string;
  blockchain?: string;
  article_content?: string;
  data_source: string;
}

const BASE_URL = 'https://rekt.news';

/**
 * Scrape the rekt.news leaderboard page
 */
export async function scrapeLeaderboard(): Promise<RawAttack[]> {
  const attacks: RawAttack[] = [];

  try {
    // Fetch the leaderboard page
    // Note: CORS may be an issue. If so, you might need a CORS proxy or browser extension
    let response: Response;
    try {
      response = await fetch(`${BASE_URL}/leaderboard`, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
    } catch (corsError: any) {
      if (corsError.message?.includes('CORS') || corsError.name === 'TypeError') {
        throw new Error(
          'CORS error: Unable to fetch from rekt.news. ' +
          'This is a browser security restriction. ' +
          'You may need to use a CORS proxy or browser extension to allow cross-origin requests.'
        );
      }
      throw corsError;
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract entries from the page
    const entries = extractEntries(doc);

    console.log(`Found ${entries.length} entries on leaderboard`);

    // Parse each entry
    for (const entry of entries) {
      try {
        const attackData = parseEntry(entry);
        if (attackData) {
          attacks.push(attackData);
        }
      } catch (error) {
        console.error('Error parsing entry:', error);
        continue;
      }
    }

    // Visit article pages to get detailed content
    console.log(`Scraping article pages for ${attacks.length} attacks...`);
    for (let i = 0; i < attacks.length; i++) {
      const attack = attacks[i];
      if (attack.source_url) {
        try {
          console.log(`Scraping article ${i + 1}/${attacks.length}: ${attack.source_url}`);
          const articleDetails = await scrapeArticleDetails(attack.source_url);
          
          // Merge article details
          if (articleDetails.description) {
            attack.description = articleDetails.description;
          }
          if (articleDetails.attack_type) {
            attack.attack_type = articleDetails.attack_type;
          }
          if (articleDetails.blockchain) {
            attack.blockchain = articleDetails.blockchain;
          }
          if (articleDetails.full_content) {
            attack.article_content = articleDetails.full_content;
          }

          // Add delay to avoid overwhelming the server
          if ((i + 1) % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(`Error scraping article ${attack.source_url}:`, error);
          // Continue with leaderboard data only
        }
      }
    }

  } catch (error) {
    console.error('Error scraping rekt.news:', error);
    throw error;
  }

  return attacks;
}

/**
 * Extract entries from the leaderboard page
 */
function extractEntries(doc: Document): (Element | string)[] {
  const entries: (Element | string)[] = [];
  const seen = new Set<Element>();

  // Method 1: Look for links that contain protocol names
  const links = doc.querySelectorAll('a[href]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('/') && href.includes('/') && !href.startsWith('/#')) {
      const parent = link.closest('li, tr, div, p');
      if (parent && !seen.has(parent as Element)) {
        const text = parent.textContent || '';
        if (text.includes('$') && /\d+\./.test(text)) {
          entries.push(parent as Element);
          seen.add(parent as Element);
        }
      }
    }
  }

  // Method 2: Look for list items
  const listItems = doc.querySelectorAll('li');
  for (const item of listItems) {
    if (!seen.has(item)) {
      const text = item.textContent || '';
      if (text.includes('$') && /\d+\./.test(text)) {
        entries.push(item);
        seen.add(item);
      }
    }
  }

  // Method 3: Look for table rows
  const tableRows = doc.querySelectorAll('tr');
  for (const row of tableRows) {
    if (!seen.has(row)) {
      const text = row.textContent || '';
      if (text.includes('$') && /\d+\./.test(text)) {
        entries.push(row);
        seen.add(row);
      }
    }
  }

  return entries;
}

/**
 * Parse a single entry into structured data
 */
function parseEntry(entry: Element | string): RawAttack | null {
  try {
    if (typeof entry === 'string') {
      return parseTextEntry(entry);
    } else {
      return parseHTMLEntry(entry);
    }
  } catch (error) {
    console.error('Error parsing entry:', error);
    return null;
  }
}

/**
 * Parse a plain text entry
 */
function parseTextEntry(text: string): RawAttack | null {
  // Pattern: "1. Protocol Name $amount | date"
  const protocolMatch = text.match(/^\d+\.\s+(.+?)\s+\$/);
  if (!protocolMatch) return null;

  let protocolName = protocolMatch[1].trim();
  if (protocolName.includes(' - ')) {
    protocolName = protocolName.split(' - ')[0].trim();
  }

  const amountMatch = text.match(/\$([\d,]+(?:\.\d+)?)/);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount)) return null;

  const dateMatch = text.match(/\|?\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  let attackDate: string;
  if (dateMatch) {
    const [month, day, year] = dateMatch[1].split('/');
    attackDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else {
    attackDate = new Date().toISOString().split('T')[0];
  }

  return {
    protocol_name: protocolName,
    attack_date: attackDate,
    loss_amount_usd: amount,
    description: `Attack on ${protocolName}`,
    source_url: undefined,
    attack_type: 'exploit',
    blockchain: undefined,
    data_source: 'rekt',
  };
}

/**
 * Parse an HTML entry element
 */
function parseHTMLEntry(entry: Element): RawAttack | null {
  const text = entry.textContent?.trim() || '';
  let protocolName: string | null = null;
  let amount: number | null = null;
  let dateStr: string | null = null;
  let sourceUrl: string | undefined = undefined;

  // Look for links
  const links = entry.querySelectorAll('a[href]');
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (href.startsWith('/') && href.includes('/') && !href.startsWith('/#')) {
      if (!sourceUrl) {
        sourceUrl = `${BASE_URL}${href}`;
      }
      const linkText = link.textContent?.trim() || '';
      if (linkText && linkText.length > 2) {
        protocolName = linkText.split(' - ')[0].trim();
      }
    }
  }

  // If no link, extract from text
  if (!protocolName) {
    const textParts = text.split('$');
    if (textParts.length > 1) {
      protocolName = textParts[0].trim().replace(/^\d+\.\s*/, '').trim();
      if (protocolName.includes(' - ')) {
        protocolName = protocolName.split(' - ')[0].trim();
      }
    }
  }

  // Extract amount
  const amountMatch = text.match(/\$([\d,]+(?:\.\d+)?)/);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  }

  // Extract date
  const dateMatch = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    dateStr = dateMatch[1];
  }

  if (!protocolName || !amount) return null;

  let attackDate: string;
  if (dateStr) {
    const [month, day, year] = dateStr.split('/');
    attackDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  } else {
    attackDate = new Date().toISOString().split('T')[0];
  }

  return {
    protocol_name: protocolName,
    attack_date: attackDate,
    loss_amount_usd: amount,
    description: `Attack on ${protocolName}`,
    source_url: sourceUrl,
    attack_type: 'exploit',
    blockchain: undefined,
    data_source: 'rekt',
  };
}

/**
 * Scrape additional details from an article page
 */
export async function scrapeArticleDetails(url: string): Promise<{
  description?: string;
  attack_type?: string;
  blockchain?: string;
  full_content?: string;
}> {
  const details: {
    description?: string;
    attack_type?: string;
    blockchain?: string;
    full_content?: string;
  } = {};

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return details;
    }

    const html = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract article content
    const article = doc.querySelector('article') || 
                   doc.querySelector('main') ||
                   doc.querySelector('[class*="article"], [class*="content"], [class*="post"]') ||
                   doc.querySelector('[id*="article"], [id*="content"], [id*="post"]');

    if (article) {
      const paragraphs = Array.from(article.querySelectorAll('p'));
      if (paragraphs.length > 0) {
        const descriptionParas = paragraphs.slice(0, 5)
          .map(p => p.textContent?.trim())
          .filter(Boolean) as string[];
        details.description = descriptionParas.join(' ');

        const allParas = paragraphs.slice(0, 20)
          .map(p => p.textContent?.trim())
          .filter(Boolean) as string[];
        details.full_content = allParas.join('\n\n');
      }
    }

    // Extract structured information
    const content = doc.body.textContent?.toLowerCase() || '';

    // Common attack types
    const attackTypes = [
      'flash loan attack', 'flash loan',
      'reentrancy attack', 'reentrancy',
      'oracle manipulation', 'oracle attack',
      'bridge hack', 'bridge exploit',
      'rug pull', 'exit scam',
      'access control', 'access control exploit',
      'front-running', 'mev',
      'governance attack', 'governance exploit',
      'smart contract exploit', 'exploit',
    ];

    for (const atype of attackTypes) {
      if (content.includes(atype)) {
        details.attack_type = atype.split(' ')[0];
        break;
      }
    }

    // Common blockchains
    const blockchains = [
      { key: 'ethereum', name: 'Ethereum' },
      { key: 'binance smart chain', name: 'BSC' },
      { key: 'bsc', name: 'BSC' },
      { key: 'polygon', name: 'Polygon' },
      { key: 'solana', name: 'Solana' },
      { key: 'arbitrum', name: 'Arbitrum' },
      { key: 'optimism', name: 'Optimism' },
      { key: 'avalanche', name: 'Avalanche' },
      { key: 'fantom', name: 'Fantom' },
      { key: 'base', name: 'Base' },
    ];

    for (const chain of blockchains) {
      if (content.includes(chain.key)) {
        details.blockchain = chain.name;
        break;
      }
    }

  } catch (error) {
    console.error(`Error scraping article ${url}:`, error);
  }

  return details;
}

