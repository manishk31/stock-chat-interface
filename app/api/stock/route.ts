import { NextRequest, NextResponse } from 'next/server';

const BUCKET_NAME = 'aistocks_data';
const FILE_PREFIX = 'tickertape_custom_screener_';
const FILE_SUFFIX = '.json';

function parseTimestampFromFilename(filename: string): number {
  // Example: tickertape_custom_screener_2025-06-14_15-38.json
  const match = filename.match(/tickertape_custom_screener_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})\.json/);
  if (!match) return 0;
  const [date, time] = [match[1], match[2]];
  return Date.parse(date + 'T' + time.replace('-', ':') + ':00Z');
}

function extractDateFromFilename(filename: string): string | null {
  const match = filename.match(/tickertape_custom_screener_(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2})\.json/);
  if (!match) return null;
  return `${match[1]}T${match[2].replace('-', ':')}:00Z`;
}

async function getHistoricalFiles(): Promise<string[]> {
  const listUrl = `https://storage.googleapis.com/storage/v1/b/${BUCKET_NAME}/o`;
  const res = await fetch(listUrl);
  if (!res.ok) return [];
  const data = await res.json();
  if (!data.items) return [];
  const now = Date.now();
  const sixMonthsAgo = now - 183 * 24 * 60 * 60 * 1000;
  return data.items
    .map((item: Record<string, unknown>) => item.name as string)
    .filter((name: string) => name.startsWith(FILE_PREFIX) && name.endsWith(FILE_SUFFIX))
    .filter((name: string) => parseTimestampFromFilename(name) >= sixMonthsAgo)
    .sort((a: string, b: string) => parseTimestampFromFilename(a) - parseTimestampFromFilename(b));
}

async function getLatestFileUrl(): Promise<string | null> {
  const files = await getHistoricalFiles();
  if (files.length === 0) return null;
  return `https://storage.googleapis.com/${BUCKET_NAME}/${files[files.length - 1]}`;
}

// Helper function to calculate price change and percentage
function calculatePriceChange(currentPrice: number, previousPrice: number) {
  const change = currentPrice - previousPrice;
  const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
  return { change, changePercent };
}

// Helper function to get market sentiment based on technical indicators
function getMarketSentiment(stockData: Record<string, unknown>): string {
  const rsi = parseFloat(stockData['RSI – 14D'] as string || '50');
  const peRatio = parseFloat(stockData['PE Ratio'] as string || '0');
  const roe = parseFloat(stockData['Return on Equity'] as string || '0');
  
  let sentiment = 'neutral';
  
  if (rsi < 30 && peRatio < 15 && roe > 15) {
    sentiment = 'bullish';
  } else if (rsi > 70 && peRatio > 25) {
    sentiment = 'bearish';
  }
  
  return sentiment;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const url = searchParams.get('url');
  const all = searchParams.get('all');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const history = searchParams.get('history');
  const realtime = searchParams.get('realtime');
  const sentiment = searchParams.get('sentiment');

  // Use override URL if provided, else build from date/time, else find latest
  let fileUrl = url;
  if (!fileUrl && date) {
    fileUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${FILE_PREFIX}${date}_${time || '00-00'}${FILE_SUFFIX}`;
  }

  // If 'all' is set, always return the full dataset
  if (all) {
    if (!fileUrl) fileUrl = await getLatestFileUrl();
    if (!fileUrl) {
      return NextResponse.json({ error: 'No data file found in bucket' }, { status: 500 });
    }
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        return NextResponse.json({ error: `Failed to fetch data from remote source: ${fileUrl}` }, { status: 500 });
      }
      const data = await response.json();
      return NextResponse.json(data);
    } catch (e) {
      return NextResponse.json({ error: 'Failed to fetch or parse data', details: String(e) }, { status: 500 });
    }
  }

  if (history && symbol) {
    // Aggregate historical data for the symbol
    const files = await getHistoricalFiles();
    const series: Record<string, unknown>[] = [];
    for (const fname of files) {
      const fileUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fname}`;
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) continue;
        const data = await response.json();
        const symbolLower = symbol.toLowerCase();
        const match = (data as Record<string, unknown>[]).find(
          (item) => typeof item === 'object' && item !== null &&
            typeof (item as Record<string, unknown>)["Name"] === 'string' &&
            ((item as Record<string, unknown>)["Name"] as string).toLowerCase().includes(symbolLower)
        );
        if (match) {
          const dateStr = extractDateFromFilename(fname);
          series.push({ ...match, date: dateStr });
        }
      } catch {
        continue;
      }
    }
    if (series.length === 0) {
      return NextResponse.json({ error: 'No historical data found for symbol' }, { status: 404 });
    }
    return NextResponse.json(series);
  }

  if (!symbol) {
    return NextResponse.json({ error: 'No symbol provided. Please provide a ?symbol=... query parameter.' }, { status: 400 });
  }

  if (!fileUrl) {
    fileUrl = await getLatestFileUrl();
  }
  if (!fileUrl) {
    return NextResponse.json({ error: 'No data file found in bucket' }, { status: 500 });
  }

  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch data from remote source: ${fileUrl}` }, { status: 500 });
    }
    const data = await response.json();
    const symbolLower = symbol.toLowerCase();
    const match = (data as Record<string, unknown>[]).find(
      (item) => typeof item === 'object' && item !== null &&
        typeof (item as Record<string, unknown>)["Name"] === 'string' &&
        ((item as Record<string, unknown>)["Name"] as string).toLowerCase().includes(symbolLower)
    );
    if (!match) {
      return NextResponse.json({ error: 'Symbol or company not found' }, { status: 404 });
    }

    // Enhanced response with additional data
    const enhancedData = { ...match };
    
    // Add real-time indicators if requested
    if (realtime) {
      // Get previous day's data for comparison
      const files = await getHistoricalFiles();
      if (files.length >= 2) {
        const previousFileUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${files[files.length - 2]}`;
        try {
          const prevResponse = await fetch(previousFileUrl);
          if (prevResponse.ok) {
            const prevData = await prevResponse.json();
            const prevMatch = (prevData as Record<string, unknown>[]).find(
              (item) => typeof item === 'object' && item !== null &&
                typeof (item as Record<string, unknown>)["Name"] === 'string' &&
                ((item as Record<string, unknown>)["Name"] as string).toLowerCase().includes(symbolLower)
            );
            
            if (prevMatch) {
              const currentPrice = parseFloat(match['Close Price'] as string || '0');
              const previousPrice = parseFloat(prevMatch['Close Price'] as string || '0');
              const { change, changePercent } = calculatePriceChange(currentPrice, previousPrice);
              
              enhancedData['priceChange'] = change;
              enhancedData['priceChangePercent'] = changePercent;
              enhancedData['isPositive'] = change >= 0;
            }
          }
        } catch (e) {
          console.error('Error fetching previous day data:', e);
        }
      }
    }

    // Add sentiment analysis if requested
    if (sentiment) {
      enhancedData['marketSentiment'] = getMarketSentiment(match);
    }

    return NextResponse.json(enhancedData);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch or parse data', details: String(e) }, { status: 500 });
  }
}
