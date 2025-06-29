import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const TT_JSON_DIR = '/Users/manishk31/Desktop/AIStockPipeline/TT_JSON';
const FILE_PREFIX = 'tickertape_custom_screener_';
const FILE_SUFFIX = '.json';

async function getLatestJsonFile() {
  const files = await fs.readdir(TT_JSON_DIR);
  const jsonFiles = files
    .filter(f => f.startsWith(FILE_PREFIX) && f.endsWith(FILE_SUFFIX))
    .map(f => ({
      name: f,
      mtime: fs.stat(path.join(TT_JSON_DIR, f)).then(stat => stat.mtime.getTime())
    }));
  if (jsonFiles.length === 0) return null;
  // Wait for all mtimes
  const filesWithMtime = await Promise.all(
    jsonFiles.map(async f => ({ name: f.name, mtime: await f.mtime }))
  );
  filesWithMtime.sort((a, b) => b.mtime - a.mtime);
  return path.join(TT_JSON_DIR, filesWithMtime[0].name);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'No symbol provided' }, { status: 400 });
  }
  const latestFile = await getLatestJsonFile();
  if (!latestFile) {
    return NextResponse.json({ error: 'No data file found' }, { status: 500 });
  }
  try {
    const fileContents = await fs.readFile(latestFile, 'utf-8');
    const data = JSON.parse(fileContents);
    // Try both direct and array search (in case of different JSON structure)
    let result = data[symbol];
    if (!result && Array.isArray(data)) {
      result = (data as Record<string, unknown>[]).find((item) => typeof item === 'object' && item !== null && (item as Record<string, unknown>)["symbol"] === symbol);
    }
    if (!result) {
      return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to read or parse data file', details: String(e) }, { status: 500 });
  }
}
