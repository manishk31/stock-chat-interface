"use client";
import React, { useState, useEffect, useRef } from 'react';

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  type?: "text" | "chart" | "sentiment" | "insight" | "funny" | "portfolio" | "watchlist";
  data?: Record<string, unknown>;
}

const Home: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Record<string, unknown>[]>([]);
  const [chartData, setChartData] = useState<Record<string, unknown> | null>(null);
  const [portfolioAnalytics, setPortfolioAnalytics] = useState<Record<string, unknown> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchPortfolioAnalytics = async () => {
    // ...fetch logic here...
  };

  useEffect(() => {
    if (portfolio.length > 0) {
      fetchPortfolioAnalytics();
    } else {
      setPortfolioAnalytics(null);
    }
  }, [portfolio]);

  // ...rest of your component logic...

  return (
    <div>
      {/* ...your JSX here... */}
    </div>
  );
};

export default Home; 