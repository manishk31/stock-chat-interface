import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Helper to compress history for a symbol (kept for symbol deep-dive logic)
function compressHistoryForSymbol(history: unknown[], symbol: string) {
  // Try to match by 'Name' or 'symbol' field
  const symbolHistory = (history as Record<string, unknown>[]).filter(
    (entry) =>
      (entry.symbol && entry.symbol === symbol) ||
      (entry.Name && entry.Name === symbol)
  );
  if (!Array.isArray(symbolHistory) || symbolHistory.length === 0) return [];
  const compressed: Record<string, unknown>[] = [];
  let prev: Record<string, unknown> = {};
  for (const entry of symbolHistory) {
    const diff: Record<string, unknown> = { date: entry.date };
    for (const key of Object.keys(entry)) {
      if (key === 'date' || key === 'symbol' || key === 'Name') continue;
      if (entry[key] !== prev[key]) {
        diff[key] = entry[key];
      }
    }
    compressed.push(diff);
    prev = entry;
  }
  return compressed;
}

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
  }
  const body = await req.json();
  // Only destructure what is actually used
  const { symbol, stockData, history, price, eps, roe, roce, netMargin, debtEquity, promoterHolding, rsi, analystRatings } = body;

  // If a symbol is provided, fetch all available data for that symbol and merge with any user-supplied overrides
  if (symbol) {
    // 1. Fetch full dataset for the symbol
    let datasetEntry = stockData;
    if (!datasetEntry) {
      // Try to fetch from /api/stock
      const host = req.headers.get('host');
      const isLocal =
        host &&
        (
          host.includes('localhost') ||
          host.startsWith('127.') ||
          host.startsWith('192.168.') ||
          host.startsWith('10.')
        );
      const protocol = isLocal ? 'http' : 'https';
      const baseUrl = host ? `${protocol}://${host}` : 'http://localhost:3000';
      try {
        const res = await fetch(`${baseUrl}/api/stock?symbol=${encodeURIComponent(symbol)}`);
        if (res.ok) {
          datasetEntry = await res.json();
        }
      } catch {
        // ignore
      }
    }
    // 2. Fetch 6-month history for the symbol
    let symbolHistory = history;
    if (!symbolHistory) {
      const host = req.headers.get('host');
      const isLocal =
        host &&
        (
          host.includes('localhost') ||
          host.startsWith('127.') ||
          host.startsWith('192.168.') ||
          host.startsWith('10.')
        );
      const protocol = isLocal ? 'http' : 'https';
      const baseUrl = host ? `${protocol}://${host}` : 'http://localhost:3000';
      try {
        const res = await fetch(`${baseUrl}/api/stock?symbol=${encodeURIComponent(symbol)}&history=1`);
        if (res.ok) {
          symbolHistory = await res.json();
        }
      } catch {
        // ignore
      }
    }
    // 3. Merge user-supplied overrides into datasetEntry
    const merged = { ...datasetEntry };
    if (price !== undefined) merged.Price = price;
    if (eps !== undefined) merged.EPS = eps;
    if (roe !== undefined) merged.ROE = roe;
    if (roce !== undefined) merged.ROCE = roce;
    if (netMargin !== undefined) merged.NetMargin = netMargin;
    if (debtEquity !== undefined) merged.DebtEquity = debtEquity;
    if (promoterHolding !== undefined) merged.PromoterHolding = promoterHolding;
    if (rsi !== undefined) merged.RSI = rsi;
    if (analystRatings !== undefined) merged.AnalystRatings = analystRatings;
    // 4. Compose the AI prompt
    const systemPrompt = `You are a world-class investment analyst. Given a stock symbol and all available financials (including history), produce a detailed, structured investment evaluation using the following framework.\n\n**Formatting and Language Requirements:**\n- Use simple, everyday language and analogies for all explanations.\n- Use clear section headers, bullet points, and short paragraphs.\n- For tables, use markdown tables with clear labels and a short, plain-English explanation below each table.\n- For the final recommendation, provide a summary block with emoji and a one-sentence layman verdict before the JSON.\n- Avoid technical jargon unless you explain it in plain English.\n- Output must be visually delightful, easy to read, and confidence-building for non-experts.\n- If you output raw JSON, always wrap it with a friendly summary and clear formatting.\n\n**Framework Sections:**\n1. Financial Strength\n  - Metrics: ROE, ROCE, Net Profit Margin, Free Cash Flow, Debt/Equity, Interest Coverage\n  - Logic:\n    - Why Invest: Positive cash flow, ROE > 15%, Debt/Equity < 0.5, stable earnings\n    - Why Not: High leverage (D/E > 1), negative FCF, low interest coverage → distress risk\n2. Growth Potential\n  - Scenarios: Bear (EPS -10%), Base (EPS +20%), Bull (EPS +50%)\n  - Logic:\n    - Why Invest: Stable or improving EPS; sector tailwinds\n    - Why Not: Past EPS decline, inconsistent performance, no growth catalysts\n3. Valuation\n  - Calculations: Forecasted Price = EPS_next_year × PE_multiple\n    - Bear: PE 15, Base: PE 25, Bull: PE 35\n  - Logic:\n    - Why Invest: Current PE < Sector PE, Forward PE < Current PE\n    - Why Not: Overvalued PE, market has priced in full upside\n4. Ownership & Trust\n  - Promoter Holding, Pledged Shares %, FII/DII Holdings\n  - Logic:\n    - Why Invest: High promoter skin-in-the-game (>50%), 0% pledging\n    - Why Not: >10% pledged shares, promoter selling, no institutional trust\n5. Market Sentiment & Technicals\n  - RSI, % below 52W High, Analyst ratings\n  - Logic:\n    - Why Invest: RSI < 40 (oversold), positive analyst consensus\n    - Why Not: RSI > 70 (overbought), no analyst coverage = low conviction\n6. Price Forecast Table (1Y)\n  - Table: Scenario | EPS | PE | Forecasted Price | % Gain/Loss\n7. ₹100,000 Investment Simulation\n  - Compute: Units = 100000 / current price; Projected value under each scenario; Return ₹ and %\n  - Table: Scenario | Exit Value | Gain/Loss\n8. Investment Approach for ₹100,000\n  - Should the user invest the full amount at once, or break it into parts (e.g., SIP, averaging)?\n  - If in parts, suggest price points or market conditions for each tranche (e.g., \"Invest 40% now, 30% if price drops 10%, 30% if quarterly results are strong\").\n  - Provide a markdown table showing suggested allocation and timing/price for each part.\n  - Give a clear, layman-friendly explanation of the approach and reasoning.\n9. Final Recommendation Block\n  - JSON object:\n    {\n      "Verdict": "Invest / Watch / Avoid",\n      "Type": "Core / Speculative / High-risk",\n      "Why Invest": "Summarized pros from all sections",\n      "Why Not Invest": "Summarized risks from all sections",\n      "Suggested Allocation": "e.g., 5-10%",\n      "Hold Period": "12–24 months",\n      "Triggers to Monitor": ["Promoter pledging decrease", "Quarterly EPS beat", "MF/FII entry"]\n    }\n\n**Output Format:**\n- Use clear section headers and markdown tables.\n- Always provide a friendly summary and layman explanation before any JSON.\n- For the new 'Investment Approach' section, include a markdown table and a simple explanation of the recommended approach (lump sum vs. tranches, price points, etc.).\n- If any field is missing, estimate or state so. All logic and calculations must be shown.\n\nInput Example:\n{\n  "symbol": "HGINFRA",\n  "Price": 750,\n  "EPS": 25,\n  "ROE": 18,\n  "ROCE": 15,\n  "NetMargin": 12,\n  "DebtEquity": 0.3,\n  "PromoterHolding": 55,\n  "RSI": 38,\n  "AnalystRatings": "Buy",\n  "History": [ ... ]\n}`;
    // Compose user prompt with merged data
    const userPrompt = `All available data for ${symbol} (merged):\n${JSON.stringify({ ...merged, History: symbolHistory })}`;
    try {
      const response = await fetch(process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
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
      let data;
      try {
        data = await response.json();
      } catch {
        return NextResponse.json({ error: 'OpenAI API returned invalid JSON' }, { status: 500 });
      }
      if (!data || !data.choices) {
        return NextResponse.json({ error: 'OpenAI API returned invalid response', details: data }, { status: 500 });
      }
      // Try to parse the JSON from the model's output
      let insight;
      try {
        insight = JSON.parse(data.choices?.[0]?.message?.content ?? '');
      } catch {
        insight = data.choices?.[0]?.message?.content || 'No insight generated.';
      }
      return NextResponse.json({ insight });
    } catch {
      return NextResponse.json({ error: 'Failed to call OpenAI API' }, { status: 500 });
    }
  }
} 