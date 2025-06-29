import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
  }
  const body = await req.json();
  const { symbol, stockData } = body;
  if (!symbol || !stockData) {
    return NextResponse.json({ error: 'Missing symbol or stockData' }, { status: 400 });
  }
  const systemPrompt = `You are a helpful financial assistant. Given the following stock data for ${symbol}, explain in simple, everyday language what it means for someone who is not from a finance background. Avoid jargon. If you use any finance terms (like RSI, P/E, etc.), briefly explain them in plain English. Highlight any trends, risks, or opportunities, and end with a clear, actionable takeaway for a regular person. Be concise and friendly.`;
  const userPrompt = `Stock data for ${symbol}:\n${JSON.stringify(stockData, null, 2)}`;
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
    const insight = data.choices?.[0]?.message?.content || 'No insight generated.';
    return NextResponse.json({ insight });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to call OpenAI API', details: String(e) }, { status: 500 });
  }
}
