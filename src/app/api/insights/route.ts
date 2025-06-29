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
  const explainInstruction = `For each section, metric, verdict, and recommendation:
- Provide a clear verdict with an emoji and a one-sentence layman explanation (no empty or missing verdicts).
- Use simple, everyday language, analogies, and actionable advice.
- For the Investment Strategy section, write in plain English, using analogies/examples, and actionable steps. Make it as clear and friendly as the following sample.
- Output must use markdown/HTML for section headers, tables, color blocks, and icons, matching the reference image (e.g., use colored backgrounds for sections, emoji for verdicts, and clear sectioning).
- Wrap each major section in a <div class='sectionCard positive'>, <div class='sectionCard negative'>, or <div class='sectionCard neutral'> as appropriate, and use <span class='verdict'> for verdict lines, so the UI can style them with colored backgrounds and highlight verdicts.

Sample output format:

<div class='sectionCard positive'>
<div class='sectionHeader'>🚀🍃 # HDFC Bank Ltd Investment Evaluation</div>

<h2>1. Financial Strength</h2>
<strong>Metrics:</strong>
<ul>
<li>PE Ratio: 20.72 - 21.82</li>
<li>Return on Equity: 16.86%</li>
<li>...</li>
</ul>
<span class='verdict'>🟢 Strong</span>
<strong>Conclusion:</strong> HDFC Bank shows consistent financial strength with healthy profitability, low debt levels, and a stable ROE.
</div>

---

Follow this format and style for all companies. If any data is missing, state so clearly. Make the output visually delightful, easy to read, and confidence-building for non-experts.`;
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
