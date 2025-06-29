import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
  }
  const body = await req.json();
  const { symbol, stockData, history } = body;
  if (!symbol || (!stockData && !history)) {
    return NextResponse.json({ error: 'Missing symbol and data' }, { status: 400 });
  }
  let systemPrompt = '';
  let userPrompt = '';
  const explainInstruction = `For each section, metric, verdict, and recommendation, explain your reasoning in simple, everyday language. If you use any finance terms, explain them. Use analogies or examples if helpful. Make sure a non-finance person can understand not just what you recommend, but why. Make every output actionable and confidence-building for non-experts.\n\nFor every metric and verdict, compare the company's value to the industry average or standard (if available), and explain whether it is better, worse, or typical. If industry data is not available, say so.\n\nFor the Investment Strategy section, provide a detailed plan covering: Portfolio Role, Suitability for Core Portfolio, Speculative Bet (with %), Triggers for Entry, Exit Criteria, and Time Horizon. Use the same structure and detail as the provided example images.\n\nOutput must match the sectioning, style, and clarity of the attached images, using emoji, color cues, and markdown or HTML for easy rendering.`;
  if (history && Array.isArray(history) && history.length > 1) {
    systemPrompt = `You are an investment analyst. Using the following 6-month historical stock data, generate a structured, layman-friendly investment evaluation for ${symbol} using these sections:
1. Financial Strength (metrics, verdicts, conclusion)
2. Growth Potential (scenarios, verdicts, interpretation)
3. Valuation & Market Trust (metrics, verdicts, conclusion)
4. Ownership & Stability (metrics, verdicts, conclusion)
5. Market Sentiment & Technicals (metrics, verdicts)
6. Final Recommendation (factors, verdicts)
7. Investment Strategy (decision criteria, recommendations)
8. Clear Verdict (one-paragraph summary for a non-expert)
Use emoji and color cues for verdicts and section headers. ${explainInstruction} Output in markdown or HTML for easy rendering.`;
    userPrompt = `6-month historical stock data for ${symbol} (each entry is a day or week):\n${JSON.stringify(history, null, 2)}`;
  } else {
    systemPrompt = `You are an investment analyst. Using the following stock data, generate a structured, layman-friendly investment evaluation for ${symbol} using these sections:
1. Financial Strength (metrics, verdicts, conclusion)
2. Growth Potential (scenarios, verdicts, interpretation)
3. Valuation & Market Trust (metrics, verdicts, conclusion)
4. Ownership & Stability (metrics, verdicts, conclusion)
5. Market Sentiment & Technicals (metrics, verdicts)
6. Final Recommendation (factors, verdicts)
7. Investment Strategy (decision criteria, recommendations)
8. Clear Verdict (one-paragraph summary for a non-expert)
Use emoji and color cues for verdicts and section headers. ${explainInstruction} Output in markdown or HTML for easy rendering.`;
    userPrompt = `Stock data for ${symbol}:\n${JSON.stringify(stockData, null, 2)}`;
  }
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
        max_tokens: 1200,
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
