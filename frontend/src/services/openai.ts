import OpenAI from 'openai';
import type { Attack } from '../types';

// Note: Vite only exposes env vars with VITE_ prefix
// User should use VITE_OPEN_AI_KEY in .env file
const apiKey = import.meta.env.VITE_OPEN_AI_KEY;

if (!apiKey) {
  console.warn('OpenAI API key not found. Chatbot will not work without VITE_OPEN_AI_KEY in .env');
}

export const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true, // Required for browser usage
}) : null;

/**
 * Create system message with all attack data
 */
export function createSystemMessage(attacks: Attack[]): string {
  const attacksSummary = attacks.map((attack, index) => {
    return `Attack ${index + 1}:
- Protocol: ${attack.protocol_name || 'Unknown'}
- Date: ${attack.attack_date || 'Unknown'}
- Attack Type: ${attack.attack_type || 'Unknown'}
- Loss Amount (USD): $${attack.loss_amount_usd?.toLocaleString() || '0'}
- Description: ${attack.description || 'No description available'}
- Source URL: ${attack.source_url || 'N/A'}
- Blockchain: ${attack.blockchain || 'N/A'}
- Data Source: ${attack.data_source || 'N/A'}
---`;
  }).join('\n\n');

  return `You are an AI assistant helping users analyze cryptocurrency protocol attacks and security breaches. 

You have access to a comprehensive database of ${attacks.length} recorded attacks. Here is all the attack data:

${attacksSummary}

Your role is to:
1. Answer questions about specific attacks, protocols, or attack types
2. Provide statistics and insights about the attack data
3. Help users understand patterns and trends in crypto security breaches
4. Analyze loss amounts, time periods, and attack frequencies
5. Compare different protocols or attack types

Be helpful, accurate, and cite specific data from the attacks when answering questions. If you don't have information about something, say so clearly.

When referencing attacks, use the protocol name, date, and loss amount to be specific.`;
}

/**
 * Send a message to OpenAI and get a response
 */
export async function sendChatMessage(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key is not configured. Please set VITE_OPEN_AI_KEY (note: must start with VITE_) in your .env file.');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
    });

    return completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(error.message || 'Failed to get response from OpenAI');
  }
}

