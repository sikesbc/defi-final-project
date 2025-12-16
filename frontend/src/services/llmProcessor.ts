/**
 * Frontend LLM processing service for attack data
 * Uses OpenAI API directly from the browser
 */

import type { RawAttack } from './rektScraper';

export interface ProcessedAttack {
  protocol_name: string;
  attack_date: string;
  attack_type: string;
  loss_amount_usd: number;
  description: string;
  source_url?: string;
  blockchain?: string;
  data_source: string;
}

// Support both variable names for backwards compatibility
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPEN_AI_KEY || '';

/**
 * Process raw attack data using LLM
 */
export async function processAttackData(
  rawAttacks: RawAttack[]
): Promise<ProcessedAttack[]> {
  // Use basic processing - faster and more reliable
  console.log(`Processing ${rawAttacks.length} attacks using basic processing...`);
  const processedAttacks = basicProcess(rawAttacks);
  console.log(`Processed ${processedAttacks.length} attacks successfully.`);
  return processedAttacks;
}

/**
 * Process a batch of attacks using OpenAI API
 */
async function processBatch(batch: RawAttack[]): Promise<ProcessedAttack[]> {
  const attacksText = formatAttacksForLLM(batch);

  const prompt = `You are analyzing cryptocurrency protocol attack data from rekt.news. 
For each attack, extract and structure the following information by reading both the leaderboard data and the article content:

1. protocol_name: The name of the protocol that was attacked
2. attack_date: The date of the attack in YYYY-MM-DD format
3. attack_type: Categorize the attack type based on the article content. Use descriptive types when available:
   - Simple types: "exploit", "flash loan", "reentrancy", "oracle manipulation", "bridge hack", "rug pull", "access control", "front-running", "governance attack", "price manipulation", "other"
   - Descriptive types (preferred when article provides details): Examples like "Flash-loan price manipulation (Curve Y pool)", "Reentrancy attack on lending protocol", "Oracle manipulation via price feed", etc.
   - Use the most specific and descriptive type that accurately represents the attack based on the article content
4. loss_amount_usd: The loss amount in USD (numeric value only)
5. description: A detailed description of what happened based on the article content (2-4 sentences). Include key details about how the attack occurred.
6. blockchain: The blockchain network (e.g., "Ethereum", "BSC", "Polygon", "Solana", "Arbitrum", "Optimism", "Avalanche", "Base", etc.). Infer from article content if not explicitly stated.
7. source_url: The URL to the rekt.news article

IMPORTANT: Use the article content to extract detailed information. The article content provides much more context than the leaderboard entry alone.

Here is the raw attack data with article content:
${attacksText}

Return a JSON object with an "attacks" key containing an array of attack objects with the fields above.
Example format: {"attacks": [{"protocol_name": "...", "attack_date": "...", "attack_type": "...", "loss_amount_usd": 123456, "description": "...", "blockchain": "...", "source_url": "..."}]}

Ensure all dates are in YYYY-MM-DD format.
Ensure loss_amount_usd is a numeric value (not a string with $ or commas).
Extract detailed descriptions from the article content, not just generic text.
Infer blockchain and attack type from article content when possible.

Return ONLY valid JSON, no additional text or markdown formatting.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a data extraction expert specializing in cryptocurrency security incidents. Always return valid JSON with an "attacks" array.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON response
    let result: any;
    try {
      // Try to extract JSON if wrapped in markdown
      let jsonContent = content;
      if (content.includes('```json')) {
        jsonContent = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonContent = content.split('```')[1].split('```')[0].trim();
      }
      result = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Error parsing LLM JSON response:', parseError);
      console.error('Response content:', content.substring(0, 500));
      return basicProcess(batch);
    }

    // Handle both array and object with "attacks" key
    let attacks: any[] = [];
    if (Array.isArray(result)) {
      attacks = result;
    } else if (result.attacks && Array.isArray(result.attacks)) {
      attacks = result.attacks;
    } else if (typeof result === 'object' && Object.keys(result).length > 0) {
      attacks = [result];
    }

    // Validate and clean the processed attacks
    const validatedAttacks: ProcessedAttack[] = [];
    for (const attack of attacks) {
      const validated = validateAttack(attack);
      if (validated) {
        validatedAttacks.push(validated);
      }
    }

    return validatedAttacks;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    return basicProcess(batch);
  }
}

/**
 * Format attack data for LLM processing
 */
function formatAttacksForLLM(attacks: RawAttack[]): string {
  const formatted: string[] = [];
  for (let i = 0; i < attacks.length; i++) {
    const attack = attacks[i];
    const articleContent = attack.article_content || '';
    const contentPreview = articleContent.substring(0, 2000) || 'No article content available';

    const amount = typeof attack.loss_amount_usd === 'number'
      ? `$${attack.loss_amount_usd.toLocaleString()}`
      : String(attack.loss_amount_usd);

    formatted.push(`
Attack ${i + 1}:
- Protocol: ${attack.protocol_name || 'Unknown'}
- Date: ${attack.attack_date || 'Unknown'}
- Amount: ${amount}
- Source URL: ${attack.source_url || ''}
- Initial Description: ${(attack.description || '').substring(0, 500)}
- Article Content: ${contentPreview}
`);
  }
  return formatted.join('\n');
}

/**
 * Validate and clean an attack object
 */
function validateAttack(attack: any): ProcessedAttack | null {
  try {
    const protocolName = attack.protocol_name || attack.protocol;
    if (!protocolName) return null;

    // Parse date
    let attackDate = attack.attack_date;
    if (typeof attackDate === 'string') {
      // Try to parse various date formats
      const dateFormats = [
        /^(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
        /^(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
        /^(\d{2})\/(\d{2})\/(\d{2})/, // MM/DD/YY
      ];

      for (const format of dateFormats) {
        const match = attackDate.match(format);
        if (match) {
          if (format === dateFormats[0]) {
            // Already in YYYY-MM-DD
            break;
          } else if (format === dateFormats[1]) {
            // MM/DD/YYYY
            attackDate = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
            break;
          } else if (format === dateFormats[2]) {
            // MM/DD/YY
            const year = parseInt(match[3]) < 50 ? `20${match[3]}` : `19${match[3]}`;
            attackDate = `${year}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
            break;
          }
        }
      }
    }

    // Parse loss amount
    let lossAmount = attack.loss_amount_usd;
    if (typeof lossAmount === 'string') {
      lossAmount = parseFloat(lossAmount.replace(/\$|,/g, '').trim());
    }
    if (isNaN(lossAmount) || lossAmount <= 0) return null;

    // Get attack type
    let attackType = attack.attack_type || 'exploit';
    if (typeof attackType === 'string' && attackType.toLowerCase() === 'unknown') {
      attackType = 'exploit';
    }

    // Get blockchain
    const blockchain = attack.blockchain && typeof attack.blockchain === 'string'
      ? attack.blockchain.trim()
      : undefined;

    // Get description
    let description = attack.description || '';
    if (!description) {
      description = `Attack on ${protocolName}`;
    }

    // Get source URL
    const sourceUrl = attack.source_url || attack.url;

    return {
      protocol_name: String(protocolName).trim(),
      attack_date: attackDate,
      attack_type: String(attackType).trim(),
      loss_amount_usd: lossAmount,
      description: String(description).trim(),
      source_url: sourceUrl,
      blockchain: blockchain,
      data_source: 'rekt',
    };
  } catch (error) {
    console.error('Error validating attack:', error);
    return null;
  }
}

/**
 * Basic processing without LLM (fallback)
 */
function basicProcess(attacks: RawAttack[]): ProcessedAttack[] {
  const processed: ProcessedAttack[] = [];
  for (const attack of attacks) {
    const validated = validateAttack({
      protocol_name: attack.protocol_name,
      attack_date: attack.attack_date,
      attack_type: attack.attack_type || 'exploit',
      loss_amount_usd: attack.loss_amount_usd,
      description: attack.description || `Attack on ${attack.protocol_name}`,
      source_url: attack.source_url,
      blockchain: attack.blockchain,
    });
    if (validated) {
      processed.push(validated);
    }
  }
  return processed;
}

