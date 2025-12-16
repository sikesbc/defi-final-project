/**
 * LLM-based duplicate detection service
 * Uses OpenAI to determine if a new attack is already in the database
 */

import { supabase } from './supabase';
import type { ProcessedAttack } from './llmProcessor';

// Support both variable names for backwards compatibility
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.VITE_OPEN_AI_KEY || '';

/**
 * Check if a new attack is a duplicate of any existing attack in the database
 */
export async function isDuplicate(
  newAttack: ProcessedAttack,
  existingAttacks: Array<{
    protocol_name: string;
    attack_date: string;
    attack_type: string;
    loss_amount_usd: number;
    description?: string;
    source_url?: string;
    blockchain?: string;
  }>
): Promise<boolean> {
  if (!OPENAI_API_KEY) {
    console.warn('OpenAI API key not set. Using basic duplicate check.');
    return basicDuplicateCheck(newAttack, existingAttacks);
  }

  if (existingAttacks.length === 0) {
    return false; // No existing attacks, so it's not a duplicate
  }

  try {
    // First do a quick basic check - if exact match found, it's definitely a duplicate
    const exactMatch = existingAttacks.find(
      (existing) =>
        existing.protocol_name.toLowerCase().trim() === newAttack.protocol_name.toLowerCase().trim() &&
        existing.attack_date === newAttack.attack_date
    );

    if (exactMatch) {
      console.log(`Exact match found: ${newAttack.protocol_name} on ${newAttack.attack_date}`);
      return true;
    }

    // Format existing attacks for LLM (limit to avoid token limits)
    // Prioritize recent attacks and similar protocol names
    const similarAttacks = existingAttacks.filter(
      (existing) =>
        existing.protocol_name.toLowerCase().includes(newAttack.protocol_name.toLowerCase().substring(0, 5)) ||
        newAttack.protocol_name.toLowerCase().includes(existing.protocol_name.toLowerCase().substring(0, 5))
    );

    const attacksToCheck = similarAttacks.length > 0
      ? [...similarAttacks, ...existingAttacks.slice(0, 50)] // Include similar + recent
      : existingAttacks.slice(0, 100); // Just recent if no similar

    const existingAttacksText = attacksToCheck
      .slice(0, 100) // Limit to 100 to avoid token limits
      .map((attack, index) => {
        return `
${index + 1}. Protocol: ${attack.protocol_name}
   Date: ${attack.attack_date}
   Type: ${attack.attack_type}
   Amount: $${attack.loss_amount_usd.toLocaleString()}
   ${attack.description ? `Description: ${attack.description.substring(0, 200)}` : ''}
   ${attack.source_url ? `URL: ${attack.source_url}` : ''}
   ${attack.blockchain ? `Blockchain: ${attack.blockchain}` : ''}`;
      })
      .join('\n');

    const newAttackText = `
NEW ATTACK TO CHECK:
Protocol: ${newAttack.protocol_name}
Date: ${newAttack.attack_date}
Type: ${newAttack.attack_type}
Amount: $${newAttack.loss_amount_usd.toLocaleString()}
${newAttack.description ? `Description: ${newAttack.description.substring(0, 200)}` : ''}
${newAttack.source_url ? `URL: ${newAttack.source_url}` : ''}
${newAttack.blockchain ? `Blockchain: ${newAttack.blockchain}` : ''}`;

    const prompt = `You are analyzing cryptocurrency attack data to detect duplicates.

I have a database of existing attacks:
${existingAttacksText}

I am considering adding this new attack:
${newAttackText}

Determine if this new attack is ALREADY in the database (a duplicate) or if it's a NEW unique attack.

Consider:
- Protocol names might have slight variations (e.g., "Harvest Finance" vs "Harvest")
- Dates should match exactly (same attack date)
- Same protocol + same date = likely duplicate
- Different amounts for same protocol+date might indicate different incidents, but usually it's the same attack
- Source URLs can help identify duplicates
- Descriptions can help identify if it's the same incident

Respond with ONLY a JSON object in this exact format:
{
  "is_duplicate": true or false,
  "reason": "brief explanation of why it is or isn't a duplicate",
  "matching_record_number": null or the number of the matching record from the list above
}

Return ONLY the JSON, no additional text.`;

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
            content: 'You are a data deduplication expert. Always return valid JSON with is_duplicate (boolean), reason (string), and matching_record_number (number or null).',
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
      console.error(`OpenAI API error: ${response.status} - ${error}`);
      return basicDuplicateCheck(newAttack, existingAttacks);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse JSON response
    let result: any;
    try {
      let jsonContent = content;
      if (content.includes('```json')) {
        jsonContent = content.split('```json')[1].split('```')[0].trim();
      } else if (content.includes('```')) {
        jsonContent = content.split('```')[1].split('```')[0].trim();
      }
      result = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Error parsing duplicate check response:', parseError);
      return basicDuplicateCheck(newAttack, existingAttacks);
    }

    const isDuplicate = result.is_duplicate === true;
    
    if (isDuplicate) {
      console.log(`Duplicate detected: ${newAttack.protocol_name} on ${newAttack.attack_date}. Reason: ${result.reason}`);
    }

    return isDuplicate;
  } catch (error) {
    console.error('Error checking duplicate with LLM:', error);
    return basicDuplicateCheck(newAttack, existingAttacks);
  }
}

/**
 * Basic duplicate check using exact matching (fallback)
 */
function basicDuplicateCheck(
  newAttack: ProcessedAttack,
  existingAttacks: Array<{
    protocol_name: string;
    attack_date: string;
  }>
): boolean {
  // Check for exact match on protocol_name and attack_date
  return existingAttacks.some(
    (existing) =>
      existing.protocol_name.toLowerCase().trim() === newAttack.protocol_name.toLowerCase().trim() &&
      existing.attack_date === newAttack.attack_date
  );
}

/**
 * Filter out duplicates from a list of new attacks
 * Uses fast basic matching (protocol_name + attack_date)
 */
export async function filterDuplicates(
  newAttacks: ProcessedAttack[]
): Promise<{
  unique: ProcessedAttack[];
  duplicates: ProcessedAttack[];
}> {
  if (newAttacks.length === 0) {
    return { unique: [], duplicates: [] };
  }

  // Fetch all existing attacks from database
  if (!supabase) {
    console.error('Supabase not configured');
    return { unique: newAttacks, duplicates: [] };
  }

  try {
    console.log('Fetching existing attacks from database for duplicate checking...');
    const { data: existingAttacks, error } = await supabase
      .from('attacks')
      .select('protocol_name, attack_date')
      .order('attack_date', { ascending: false });

    if (error) {
      console.error('Error fetching existing attacks:', error);
      return { unique: newAttacks, duplicates: [] };
    }

    const unique: ProcessedAttack[] = [];
    const duplicates: ProcessedAttack[] = [];

    console.log(`Checking ${newAttacks.length} new attacks against ${existingAttacks?.length || 0} existing attacks...`);

    // Create a Set for fast lookup
    const existingSet = new Set(
      (existingAttacks || []).map(
        (a) => `${a.protocol_name.toLowerCase().trim()}_${a.attack_date}`
      )
    );

    // Check each new attack
    for (let i = 0; i < newAttacks.length; i++) {
      const attack = newAttacks[i];
      const key = `${attack.protocol_name.toLowerCase().trim()}_${attack.attack_date}`;

      if (existingSet.has(key)) {
        duplicates.push(attack);
      } else {
        unique.push(attack);
      }

      // Log progress every 50 attacks
      if ((i + 1) % 50 === 0 || i === newAttacks.length - 1) {
        console.log(`[${i + 1}/${newAttacks.length}] Checked: ${unique.length} unique, ${duplicates.length} duplicates so far`);
      }
    }

    console.log(`Duplicate check complete: ${unique.length} unique, ${duplicates.length} duplicates`);

    return { unique, duplicates };
  } catch (error) {
    console.error('Error filtering duplicates:', error);
    return { unique: newAttacks, duplicates: [] };
  }
}

