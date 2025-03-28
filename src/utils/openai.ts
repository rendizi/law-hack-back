import OpenAI from 'openai';
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI();

export async function sendMessageToChatGPT(message: string) {
  const response = await await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: message }],
  });
  return response.choices[0].message?.content || '';
}
