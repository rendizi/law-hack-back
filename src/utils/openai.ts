import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI();

export async function sendMessageToChatGPT(history: { role: 'user' | 'assistant'; content: string }[]) {

    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: history, 
    });
  return response.choices[0].message?.content || '';
}
