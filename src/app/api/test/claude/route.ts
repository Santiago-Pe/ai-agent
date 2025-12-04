import { anthropic } from '@/lib/claude';

export async function GET() {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Hello, test message' }]
    });
    const firstBlock = response.content[0];
    const message = firstBlock.type === 'text' ? firstBlock.text : '';
    return Response.json({ message });
  } catch (err) {
    return Response.json({ error: String(err) });
  }
}