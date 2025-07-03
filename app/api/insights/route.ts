import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Helper function to detect if query is for individual stock or advanced screening
function isIndividualStockQuery(query: string): boolean {
  const stockSymbols = [
    'INFOSYS', 'TCS', 'HDFC', 'RELIANCE', 'TATAMOTORS', 'TATASTEEL', 'WIPRO', 'HCLTECH', 'TECHM', 'MINDTREE',
    'LTI', 'MPHASIS', 'PERSISTENT', 'COFORGE', 'L&T', 'BHARTIARTL', 'ITC', 'AXISBANK', 'ICICIBANK', 'KOTAKBANK',
    'SBIN', 'HINDUNILVR', 'MARUTI', 'BAJFINANCE', 'BAJAJFINSV', 'ASIANPAINT', 'ULTRACEMCO', 'NESTLEIND', 'SUNPHARMA',
    'DRREDDY', 'CIPLA', 'DIVISLAB', 'TATACONSUM', 'BRITANNIA', 'HINDALCO', 'VEDL', 'JSWSTEEL', 'ADANIENT', 'ADANIPORTS'
  ];
  
  const cleanQuery = query.trim().toUpperCase();
  
  // Check if query is exactly a stock symbol
  if (stockSymbols.includes(cleanQuery)) {
    return true;
  }
  
  // Check if query contains stock symbol patterns
  const symbolPatterns = [
    /^[A-Z]{2,10}$/, // 2-10 uppercase letters
    /^[A-Z]{2,10}\s*\([A-Z]+\)$/, // Symbol (NAME)
    /^[A-Z]{2,10}\s+stock$/i, // Symbol stock
    /^[A-Z]{2,10}\s+share$/i, // Symbol share
  ];
  
  return symbolPatterns.some(pattern => pattern.test(cleanQuery));
}

// Helper function to categorize market cap
function getMarketCapCategory(marketCap: string): string {
  const cap = parseFloat(marketCap.replace(/[^\d.]/g, ''));
  if (cap >= 20000) return 'Large Cap';
  if (cap >= 5000) return 'Mid Cap';
  return 'Small Cap';
}

// Helper function to filter stocks based on complex criteria
function filterStocksByCriteria(stocks: any[], query: string): any[] {
  const lowerQuery = query.toLowerCase();
  
  // Market cap filters
  if (lowerQuery.includes('large cap') || lowerQuery.includes('large-cap')) {
    stocks = stocks.filter(stock => getMarketCapCategory(stock['↓Market Cap']) === 'Large Cap');
  } else if (lowerQuery.includes('mid cap') || lowerQuery.includes('mid-cap')) {
    stocks = stocks.filter(stock => getMarketCapCategory(stock['↓Market Cap']) === 'Mid Cap');
  } else if (lowerQuery.includes('small cap') || lowerQuery.includes('small-cap')) {
    stocks = stocks.filter(stock => getMarketCapCategory(stock['↓Market Cap']) === 'Small Cap');
  }
  
  // ROE filters
  if (lowerQuery.includes('highest roe') || lowerQuery.includes('high roe')) {
    stocks = stocks.filter(stock => parseFloat(stock['Return on Equity'] || '0') > 15);
    stocks.sort((a, b) => parseFloat(b['Return on Equity'] || '0') - parseFloat(a['Return on Equity'] || '0'));
  }
  
  // P/E filters
  if (lowerQuery.includes('low p/e') || lowerQuery.includes('low pe') || lowerQuery.includes('undervalued')) {
    stocks = stocks.filter(stock => {
      const pe = parseFloat(stock['PE Ratio'] || '0');
      return pe > 0 && pe < 25;
    });
    stocks.sort((a, b) => parseFloat(a['PE Ratio'] || '999') - parseFloat(b['PE Ratio'] || '999'));
  }
  
  // Debt filters
  if (lowerQuery.includes('zero debt') || lowerQuery.includes('no debt')) {
    stocks = stocks.filter(stock => parseFloat(stock['Debt to Equity'] || '999') === 0);
  }
  
  // Free cash flow filters
  if (lowerQuery.includes('free cash flow') || lowerQuery.includes('fcf')) {
    stocks = stocks.filter(stock => parseFloat(stock['Free Cash Flow'] || '0') > 0);
  }
  
  // Dividend yield filters
  if (lowerQuery.includes('dividend') || lowerQuery.includes('high dividend')) {
    stocks = stocks.filter(stock => parseFloat(stock['Dividend Yield'] || '0') > 1);
    stocks.sort((a, b) => parseFloat(b['Dividend Yield'] || '0') - parseFloat(a['Dividend Yield'] || '0'));
  }
  
  // Growth filters
  if (lowerQuery.includes('eps growth') || lowerQuery.includes('earnings growth')) {
    stocks = stocks.filter(stock => parseFloat(stock['1Y Historical EPS Growth'] || '0') > 10);
    stocks.sort((a, b) => parseFloat(b['1Y Historical EPS Growth'] || '0') - parseFloat(a['1Y Historical EPS Growth'] || '0'));
  }
  
  // Revenue growth filters
  if (lowerQuery.includes('revenue growth') || lowerQuery.includes('sales growth')) {
    stocks = stocks.filter(stock => parseFloat(stock['1Y Historical Revenue Growth'] || '0') > 10);
    stocks.sort((a, b) => parseFloat(b['1Y Historical Revenue Growth'] || '0') - parseFloat(a['1Y Historical Revenue Growth'] || '0'));
  }
  
  // Sector filters
  if (lowerQuery.includes('fmcg')) {
    stocks = stocks.filter(stock => stock['Sub-Sector']?.toLowerCase().includes('fmcg'));
  }
  if (lowerQuery.includes('bank') || lowerQuery.includes('banking')) {
    stocks = stocks.filter(stock => stock['Sub-Sector']?.toLowerCase().includes('bank'));
  }
  if (lowerQuery.includes('it') || lowerQuery.includes('software')) {
    stocks = stocks.filter(stock => stock['Sub-Sector']?.toLowerCase().includes('it'));
  }
  if (lowerQuery.includes('auto') || lowerQuery.includes('automobile')) {
    stocks = stocks.filter(stock => stock['Sub-Sector']?.toLowerCase().includes('auto'));
  }
  
  // Technical filters
  if (lowerQuery.includes('oversold') || lowerQuery.includes('rsi')) {
    stocks = stocks.filter(stock => parseFloat(stock['RSI – 14D'] || '50') < 30);
  }
  if (lowerQuery.includes('overbought')) {
    stocks = stocks.filter(stock => parseFloat(stock['RSI – 14D'] || '50') > 70);
  }
  
  // Promoter holding filters
  if (lowerQuery.includes('promoter holding') || lowerQuery.includes('promoter stake')) {
    stocks = stocks.filter(stock => parseFloat(stock['Promoter Holding'] || '0') > 50);
  }
  
  // Institutional holding filters
  if (lowerQuery.includes('institutional') || lowerQuery.includes('fii') || lowerQuery.includes('dii')) {
    stocks = stocks.filter(stock => {
      const fii = parseFloat(stock['Foreign Institutional Holding'] || '0');
      const dii = parseFloat(stock['Domestic Institutional Holding'] || '0');
      return (fii + dii) > 20;
    });
  }
  
  return stocks.slice(0, 10); // Return top 10 filtered stocks
}

export async function POST(req: NextRequest) {
  try {
    if (!OPENAI_API_KEY) {
      console.error('OpenAI API key not set');
      return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 500 });
    }
    
    const body = await req.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    const { symbol, userInput, stockData, history, price, eps, roe, roce, netMargin, debtEquity, promoterHolding, rsi, analystRatings } = body;

    // Determine if this is an individual stock query or advanced screening
    const query = userInput || symbol || '';
    const isIndividualStock = isIndividualStockQuery(query);
    
    console.log('Query:', query);
    console.log('Is individual stock:', isIndividualStock);

    if (isIndividualStock) {
      console.log('Processing individual stock analysis...');
      
      // If a symbol is provided, fetch all available data for that symbol and merge with any user-supplied overrides
      if (symbol) {
        // 1. Fetch full dataset for the symbol
        let datasetEntry = stockData;
        if (!datasetEntry) {
          // Try to fetch from stock API
          try {
            const stockResponse = await fetch(`${req.nextUrl.origin}/api/stock?symbol=${symbol}`);
            if (stockResponse.ok) {
              const stockDataResponse = await stockResponse.json();
              datasetEntry = stockDataResponse;
            }
          } catch (error) {
            console.error('Error fetching stock data:', error);
          }
        }

        // 2. Merge with any user-supplied overrides
        const mergedData = {
          ...datasetEntry,
          ...(price && { 'Close Price': price }),
          ...(eps && { 'Earnings Per Share': eps }),
          ...(roe && { 'Return on Equity': roe }),
          ...(roce && { 'ROCE': roce }),
          ...(netMargin && { 'Net Profit Margin': netMargin }),
          ...(debtEquity && { 'Debt to Equity': debtEquity }),
          ...(promoterHolding && { 'Promoter Holding': promoterHolding }),
          ...(rsi && { 'RSI – 14D': rsi }),
          ...(analystRatings && { 'Percentage Buy Reco\'s': analystRatings })
        };

        // 3. Fetch historical data if available
        let historicalData = history;
        if (!historicalData) {
          try {
            const historyResponse = await fetch(`${req.nextUrl.origin}/api/stock?symbol=${symbol}&history=1`);
            if (historyResponse.ok) {
              historicalData = await historyResponse.json();
            }
          } catch (error) {
            console.error('Error fetching historical data:', error);
          }
        }

        // 4. Call OpenAI with complete data
        const prompt = `You are a senior investment analyst. Use the following AI Evaluation Framework to analyze the stock and produce a detailed, strategic investment evaluation. For every section, explain both "Why Invest" and "Why Not Invest" using the logic and metrics provided. Use markdown tables and clear headers. Be actionable and strategic.

Stock Data:
${JSON.stringify(mergedData, null, 2)}

${historicalData ? `Historical Data:\n${JSON.stringify(historicalData, null, 2)}` : ''}

---

# AI Evaluation Framework

## 1. Financial Strength
- **Metrics:** ROE, ROCE, Net Profit Margin, Free Cash Flow, Debt/Equity, Interest Coverage
- **Why Invest:** Positive cash flow, ROE > 15%, Debt/Equity < 0.5, stable earnings
- **Why Not Invest:** High leverage (D/E > 1), negative FCF, low interest coverage → distress risk

## 2. Growth Potential
- **Scenarios:**
  - Bear → EPS drops 10%
  - Base → EPS grows 20%
  - Bull → EPS grows 50%
- **Why Invest:** Stable or improving EPS; sector tailwinds
- **Why Not Invest:** Past EPS decline, inconsistent performance, no growth catalysts

## 3. Valuation
- **Calculations:**
  - Forecasted Price = EPS_next_year × PE_multiple
  - Bear: -10% EPS, PE 15
  - Base: +20% EPS, PE 25
  - Bull: +50% EPS, PE 35
- **Why Invest:** Current PE < Sector PE, Forward PE < Current PE
- **Why Not Invest:** Overvalued PE, market has priced in full upside

## 4. Ownership & Trust
- **Check:** Promoter Holding, Pledged Shares %, FII/DII Holdings
- **Why Invest:** High promoter skin-in-the-game (>50%), 0% pledging
- **Why Not Invest:** >10% pledged shares, promoter selling, no institutional trust

## 5. Market Sentiment & Technicals
- **Signals:** RSI, % below 52W High, Analyst ratings
- **Why Invest:** RSI < 40 (oversold), positive analyst consensus
- **Why Not Invest:** RSI > 70 (overbought), no analyst coverage = low conviction

## 6. Price Forecast Table (1Y)
Create a markdown table:
| Scenario | EPS | PE | Forecasted Price | % Gain/Loss |
|---|---|---|---|---|
| Bear | (calc) | 15 | (calc) | (calc) |
| Base | (calc) | 25 | (calc) | (calc) |
| Bull | (calc) | 35 | (calc) | (calc) |

## 7. ₹100,000 Investment Simulation
- Compute: Units = 100000 / current price
- Projected portfolio value under each scenario
- Output as markdown table:
| Scenario | Exit Value | Gain/Loss |
|---|---|---|
| Bear | (calc) | (calc) |
| Base | (calc) | (calc) |
| Bull | (calc) | (calc) |

## 8. Investment Approach for ₹100,000
- Decide on Lump Sum vs Tranches
- If tranches, suggest price points and allocation per tranche
- Explain reasoning

## 9. Final Recommendation Block
- **Verdict:** Invest / Watch / Avoid - Explain Why
- **Type:** Core / Speculative / High-risk - Explain Why
- **Why Invest:** Summarized pros from all sections - Explain Why
- **Why Not Invest:** Summarized risks from all sections - Explain Why
- **Suggested Allocation:** e.g., 5-10% - Explain Why
- **Hold Period:** Recommend a time window (e.g., 6-12 months, 12-24 months) and explain why
- **Triggers to Monitor:** List key triggers (e.g., promoter pledging decrease, quarterly EPS beat, MF/FII entry, etc.)

---

Use simple language, clear headers, bullet points, and markdown tables. Be friendly and explain concepts clearly. Focus on actionable insights and practical investment advice.`;

        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 4000,
            temperature: 0.3
          })
        });

        if (!openAIResponse.ok) {
          const errorText = await openAIResponse.text();
          console.error('OpenAI API error:', errorText);
          return NextResponse.json({ error: 'OpenAI API error' }, { status: 500 });
        }

        const openAIData = await openAIResponse.json();
        const insight = openAIData.choices[0]?.message?.content || 'No analysis available';

        return NextResponse.json({ insight });
      }
    } else {
      console.log('Processing advanced query...');
      
      // Advanced query processing
      try {
        // 1. Fetch all stock data
        console.log('Fetching all stock data...');
        const allStocksResponse = await fetch(`${req.nextUrl.origin}/api/stock?all=1`);
        
        if (!allStocksResponse.ok) {
          console.error('Failed to fetch all stocks:', allStocksResponse.status);
          return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
        }
        
        const allStocks = await allStocksResponse.json();
        console.log('Fetched', allStocks.length, 'stocks');
        
        // 2. Apply sophisticated filtering based on query
        console.log('Applying advanced filtering based on query:', query);
        const filteredStocks = filterStocksByCriteria(allStocks, query);
        console.log('Filtered to', filteredStocks.length, 'stocks');
        
        // 3. Create analysis prompt with filtered data
        const analysisPrompt = `You are a senior investment analyst. The user has asked: "${query}"

I have analyzed the Indian stock market and applied sophisticated filtering based on your criteria. Here are the top stocks that match your requirements:

${JSON.stringify(filteredStocks, null, 2)}

Please provide a comprehensive analysis with:

1. **Query Interpretation** - What the user is looking for and why it's important
2. **Screening Criteria Used** - Explain the specific filters applied and their significance
3. **Top Recommendations** - 5-10 best stocks with detailed reasons for selection
4. **Risk Assessment** - Potential risks and considerations for this type of investment
5. **Investment Strategy** - How to approach these stocks (timing, allocation, etc.)
6. **Portfolio Allocation** - Suggested allocation for ₹100,000 investment
7. **Monitoring Triggers** - What to watch for (earnings, news, technical indicators)
8. **Additional Insights** - Any other relevant analysis or recommendations

Use simple language, clear headers, bullet points, and markdown tables. Be friendly and explain concepts clearly. Focus on actionable insights and practical investment advice.`;

        console.log('Calling OpenAI for advanced analysis...');
        console.log('OpenAI API Key available:', !!OPENAI_API_KEY);
        console.log('Number of stocks being sent:', filteredStocks.length);
        
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: analysisPrompt }],
            max_tokens: 4000,
            temperature: 0.3
          })
        });

        if (!openAIResponse.ok) {
          const errorText = await openAIResponse.text();
          console.error('OpenAI API error:', errorText);
          return NextResponse.json({ error: 'OpenAI API error' }, { status: 500 });
        }

        const openAIData = await openAIResponse.json();
        const insight = openAIData.choices[0]?.message?.content || 'No analysis available';

        console.log('Advanced analysis completed successfully');
        return NextResponse.json({ insight });
        
      } catch (error) {
        console.error('Error in advanced query processing:', error);
        return NextResponse.json({ error: 'Advanced query processing failed' }, { status: 500 });
      }
    }
  } catch (error) {
    console.error('General error in insights API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
