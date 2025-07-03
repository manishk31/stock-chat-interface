import { NextRequest, NextResponse } from 'next/server';

interface PortfolioItem {
  symbol: string;
  name: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  totalValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface PortfolioAnalytics {
  totalValue: number;
  totalCost: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  topPerformers: PortfolioItem[];
  worstPerformers: PortfolioItem[];
  sectorBreakdown: Record<string, number>;
  riskMetrics: {
    volatility: number;
    beta: number;
    sharpeRatio: number;
  };
  recommendations: string[];
}

// Mock sector data - in a real app, this would come from a database
const SECTOR_MAPPING: Record<string, string> = {
  'INFOSYS': 'Technology',
  'TCS': 'Technology',
  'HDFC': 'Financial',
  'RELIANCE': 'Energy',
  'TATAMOTORS': 'Automotive',
  'TATASTEEL': 'Materials',
  'WIPRO': 'Technology',
  'HCLTECH': 'Technology',
  'TECHM': 'Technology',
  'MINDTREE': 'Technology',
  'LTI': 'Technology',
  'MPHASIS': 'Technology',
  'PERSISTENT': 'Technology',
  'COFORGE': 'Technology',
  'L&T': 'Industrial',
  'BHARTIARTL': 'Telecommunications',
  'ITC': 'Consumer Goods',
  'AXISBANK': 'Financial',
  'ICICIBANK': 'Financial',
  'KOTAKBANK': 'Financial',
  'SBIN': 'Financial',
  'HINDUNILVR': 'Consumer Goods',
  'MARUTI': 'Automotive',
  'BAJFINANCE': 'Financial',
  'BAJAJFINSV': 'Financial',
  'ASIANPAINT': 'Materials',
  'ULTRACEMCO': 'Materials',
  'NESTLEIND': 'Consumer Goods',
  'SUNPHARMA': 'Healthcare',
  'DRREDDY': 'Healthcare',
  'CIPLA': 'Healthcare',
  'DIVISLAB': 'Healthcare',
  'TATACONSUM': 'Consumer Goods',
  'BRITANNIA': 'Consumer Goods',
  'HINDALCO': 'Materials',
  'VEDL': 'Materials',
  'JSWSTEEL': 'Materials',
  'ADANIENT': 'Conglomerate',
  'ADANIPORTS': 'Infrastructure'
};

function calculateRiskMetrics(portfolio: PortfolioItem[]): { volatility: number; beta: number; sharpeRatio: number } {
  if (portfolio.length === 0) {
    return { volatility: 0, beta: 1, sharpeRatio: 0 };
  }

  // Calculate portfolio volatility (simplified)
  const returns = portfolio.map(item => item.gainLossPercent / 100);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance);

  // Calculate beta (simplified - assuming market beta of 1)
  const beta = portfolio.length > 0 ? 1 : 1;

  // Calculate Sharpe ratio (simplified - assuming risk-free rate of 2%)
  const riskFreeRate = 0.02;
  const sharpeRatio = (avgReturn - riskFreeRate) / volatility;

  return { volatility, beta, sharpeRatio };
}

function generateRecommendations(portfolio: PortfolioItem[], analytics: PortfolioAnalytics): string[] {
  const recommendations: string[] = [];

  // Check for over-concentration
  const topHolding = portfolio.reduce((max, item) => 
    item.totalValue > max.totalValue ? item : max, portfolio[0]);
  
  if (topHolding && topHolding.totalValue / analytics.totalValue > 0.3) {
    recommendations.push(`Consider diversifying - ${topHolding.symbol} represents over 30% of your portfolio`);
  }

  // Check for sector concentration
  const sectorCounts = Object.values(analytics.sectorBreakdown);
  const maxSectorWeight = Math.max(...sectorCounts);
  if (maxSectorWeight / analytics.totalValue > 0.4) {
    recommendations.push('Your portfolio is heavily concentrated in one sector. Consider diversifying across sectors.');
  }

  // Check for poor performers
  if (analytics.worstPerformers.length > 0) {
    const worst = analytics.worstPerformers[0];
    if (worst.gainLossPercent < -10) {
      recommendations.push(`Consider reviewing ${worst.symbol} - down ${Math.abs(worst.gainLossPercent).toFixed(1)}%`);
    }
  }

  // Check for portfolio size
  if (portfolio.length < 5) {
    recommendations.push('Consider adding more stocks to diversify your portfolio');
  }

  // Check for risk level
  if (analytics.riskMetrics.volatility > 0.2) {
    recommendations.push('Your portfolio shows high volatility. Consider adding defensive stocks or bonds.');
  }

  if (recommendations.length === 0) {
    recommendations.push('Your portfolio looks well-balanced! Keep monitoring your positions.');
  }

  return recommendations;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { portfolio } = body;

    if (!portfolio || !Array.isArray(portfolio)) {
      return NextResponse.json({ error: 'Invalid portfolio data' }, { status: 400 });
    }

    // Calculate basic metrics
    const totalValue = portfolio.reduce((sum, item) => sum + item.totalValue, 0);
    const totalCost = portfolio.reduce((sum, item) => sum + (item.shares * item.avgPrice), 0);
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

    // Sort by performance
    const sortedByPerformance = [...portfolio].sort((a, b) => b.gainLossPercent - a.gainLossPercent);
    const topPerformers = sortedByPerformance.slice(0, 3);
    const worstPerformers = sortedByPerformance.slice(-3).reverse();

    // Calculate sector breakdown
    const sectorBreakdown: Record<string, number> = {};
    portfolio.forEach(item => {
      const sector = SECTOR_MAPPING[item.symbol] || 'Other';
      sectorBreakdown[sector] = (sectorBreakdown[sector] || 0) + item.totalValue;
    });

    // Calculate risk metrics
    const riskMetrics = calculateRiskMetrics(portfolio);

    // Create analytics object
    const analytics: PortfolioAnalytics = {
      totalValue,
      totalCost,
      totalGainLoss,
      totalGainLossPercent,
      topPerformers,
      worstPerformers,
      sectorBreakdown,
      riskMetrics,
      recommendations: []
    };

    // Generate recommendations
    analytics.recommendations = generateRecommendations(portfolio, analytics);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Portfolio analytics error:', error);
    return NextResponse.json({ error: 'Failed to analyze portfolio' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Portfolio Analytics API',
    endpoints: {
      'POST /api/portfolio': 'Analyze portfolio data and return insights'
    }
  });
} 