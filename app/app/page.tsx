"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  type?: "text" | "chart" | "sentiment" | "insight" | "funny" | "portfolio" | "watchlist";
  data?: Record<string, unknown>;
}

const Home: React.FC = () => {
  const [portfolio, setPortfolio] = useState<Record<string, unknown>[]>([]);
  const [portfolioAnalytics, setPortfolioAnalytics] = useState<Record<string, unknown> | null>(null);

  const fetchPortfolioAnalytics = useCallback(async () => {
    // ...fetch logic here...
  }, []);

  useEffect(() => {
    if (portfolio.length > 0) {
      fetchPortfolioAnalytics();
    } else {
      setPortfolioAnalytics(null);
    }
  }, [portfolio, fetchPortfolioAnalytics]);

  return (
    <div>
      {/* ...your JSX here... */}
    </div>
  );
};

export default Home; 