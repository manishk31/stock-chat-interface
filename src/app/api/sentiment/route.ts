import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
  }
  const body = await req.json();
  const { symbol, newsData, pdfText } = body;
  if (!symbol || !newsData) {
    return NextResponse.json({ error: 'Missing symbol or newsData' }, { status: 400 });
  }
  let userPrompt = `Recent news and social headlines for ${symbol}:\n` + newsData.map((n: string, i: number) => `${i+1}. ${n}`).join('\n');
  if (pdfText) {
    userPrompt += `\n\n(Placeholder) Broker research PDF text is available but not yet processed.`;
  }
  const systemPrompt = `You are a financial analyst. Analyze the sentiment (positive, negative, neutral) for the stock ${symbol} based on the following news and social headlines. Summarize the overall sentiment and mention any notable trends or risks. If PDF research is mentioned, acknowledge it as a future enhancement.`;
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });
    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ error: 'OpenAI API error', details: error }, { status: 500 });
    }
    const data = await response.json();
    const sentiment = data.choices?.[0]?.message?.content || 'No sentiment generated.';
    return NextResponse.json({ sentiment });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to call OpenAI API', details: String(e) }, { status: 500 });
  }
}
