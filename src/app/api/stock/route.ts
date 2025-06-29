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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const url = searchParams.get('url');
  const all = searchParams.get('all');
  const date = searchParams.get('date');
  const time = searchParams.get('time');
  const history = searchParams.get('history');

  // Use override URL if provided, else build from date/time, else find latest
  let fileUrl = url;
  if (!fileUrl && date) {
    fileUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${FILE_PREFIX}${date}_${time || '00-00'}${FILE_SUFFIX}`;
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
    if (all) {
      return NextResponse.json(data);
    }
    if (!symbol) {
      return NextResponse.json({ error: 'No symbol provided' }, { status: 400 });
    }
    // Fuzzy match symbol to Name field (case-insensitive substring)
    const symbolLower = symbol.toLowerCase();
    const match = (data as Record<string, unknown>[]).find(
      (item) => typeof item === 'object' && item !== null &&
        typeof (item as Record<string, unknown>)["Name"] === 'string' &&
        ((item as Record<string, unknown>)["Name"] as string).toLowerCase().includes(symbolLower)
    );
    if (!match) {
      return NextResponse.json({ error: 'Symbol or company not found' }, { status: 404 });
    }
    return NextResponse.json(match);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch or parse data', details: String(e) }, { status: 500 });
  }
}
