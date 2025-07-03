"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  type?: "text" | "chart" | "sentiment" | "insight" | "funny" | "portfolio" | "watchlist";
  data?: any;
}

interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

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

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [chatBotOpen, setChatBotOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "portfolio" | "watchlist" | "charts">("chat");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const insightRef = useRef<HTMLDivElement>(null);
  const [previousResults, setPreviousResults] = useState<unknown>(null);
  
  // Portfolio state
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [watchlist, setWatchlist] = useState<StockData[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [selectedStock, setSelectedStock] = useState<string>("");
  const [portfolioAnalytics, setPortfolioAnalytics] = useState<any>(null);

  // Load portfolio and watchlist from localStorage
  useEffect(() => {
    const savedPortfolio = localStorage.getItem('stockPortfolio');
    const savedWatchlist = localStorage.getItem('stockWatchlist');
    
    if (savedPortfolio) {
      setPortfolio(JSON.parse(savedPortfolio));
    }
    if (savedWatchlist) {
      setWatchlist(JSON.parse(savedWatchlist));
    }
  }, []);

  // Save portfolio and watchlist to localStorage
  useEffect(() => {
    localStorage.setItem('stockPortfolio', JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem('stockWatchlist', JSON.stringify(watchlist));
  }, [watchlist]);

  // Update portfolio analytics when portfolio changes
  useEffect(() => {
    if (portfolio.length > 0) {
      fetchPortfolioAnalytics();
    } else {
      setPortfolioAnalytics(null);
    }
  }, [portfolio]);

  const fetchPortfolioAnalytics = async () => {
    try {
      const response = await fetch('/api/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio })
      });
      if (response.ok) {
        const analytics = await response.json();
        setPortfolioAnalytics(analytics);
      }
    } catch (error) {
      console.error('Error fetching portfolio analytics:', error);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, chatBotOpen]);

  const addToPortfolio = (symbol: string, shares: number, avgPrice: number) => {
    const existingItem = portfolio.find(item => item.symbol === symbol);
    
    if (existingItem) {
      // Update existing position
      const totalShares = existingItem.shares + shares;
      const totalCost = (existingItem.shares * existingItem.avgPrice) + (shares * avgPrice);
      const newAvgPrice = totalCost / totalShares;
      
      setPortfolio(prev => prev.map(item => 
        item.symbol === symbol 
          ? { ...item, shares: totalShares, avgPrice: newAvgPrice }
          : item
      ));
    } else {
      // Add new position
      const newItem: PortfolioItem = {
        symbol,
        name: symbol, // Will be updated when we fetch real data
        shares,
        avgPrice,
        currentPrice: avgPrice,
        totalValue: shares * avgPrice,
        gainLoss: 0,
        gainLossPercent: 0
      };
      setPortfolio(prev => [...prev, newItem]);
    }
  };

  const addToWatchlist = async (symbol: string) => {
    if (watchlist.find(item => item.symbol === symbol)) return;
    
    try {
      const response = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}`);
      if (response.ok) {
        const data = await response.json();
        const stockData: StockData = {
          symbol: data.Name || symbol,
          name: data.Name || symbol,
          price: parseFloat(data['Close Price'] || '0'),
          change: 0,
          changePercent: 0
        };
        setWatchlist(prev => [...prev, stockData]);
      }
    } catch (error) {
      console.error('Error adding to watchlist:', error);
    }
  };

  const generateChartData = (historicalData: any[]) => {
    if (!historicalData || historicalData.length === 0) return null;

    const labels = historicalData.map(item => item.date || 'Unknown');
    const prices = historicalData.map(item => parseFloat(item['Close Price'] || '0'));

    return {
      labels,
      datasets: [
        {
          label: 'Stock Price',
          data: prices,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1,
        },
      ],
    };
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = {
      sender: "user",
      text: input,
      timestamp: new Date().toLocaleTimeString(),
      type: "text",
    };
    setChat((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setShowConfetti(false);

    // Check for special commands
    const lowerInput = input.toLowerCase().trim();
    
    if (lowerInput.startsWith('/portfolio')) {
      // Handle portfolio commands
      const aiMsg: ChatMessage = {
        sender: "ai",
        text: `**Portfolio Summary**\n\n${portfolio.length === 0 ? 'No stocks in portfolio yet.' : 
          portfolio.map(item => 
            `**${item.symbol}**: ${item.shares} shares @ $${item.avgPrice.toFixed(2)} = $${item.totalValue.toFixed(2)}`
          ).join('\n')
        }\n\nTotal Value: $${portfolio.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "portfolio",
      };
      setChat((prev) => [...prev, aiMsg]);
      setLoading(false);
      return;
    }

    if (lowerInput.startsWith('/watchlist')) {
      // Handle watchlist commands
      const aiMsg: ChatMessage = {
        sender: "ai",
        text: `**Watchlist**\n\n${watchlist.length === 0 ? 'No stocks in watchlist yet.' : 
          watchlist.map(item => 
            `**${item.symbol}**: $${item.price.toFixed(2)}`
          ).join('\n')
        }`,
        timestamp: new Date().toLocaleTimeString(),
        type: "watchlist",
      };
      setChat((prev) => [...prev, aiMsg]);
      setLoading(false);
      return;
    }

    if (lowerInput.startsWith('/add ')) {
      // Handle add to portfolio/watchlist commands
      const parts = input.split(' ');
      const symbol = parts[1]?.toUpperCase();
      const shares = parseFloat(parts[2] || '0');
      const price = parseFloat(parts[3] || '0');
      
      if (symbol && shares > 0 && price > 0) {
        addToPortfolio(symbol, shares, price);
        const aiMsg: ChatMessage = {
          sender: "ai",
          text: `Added ${shares} shares of ${symbol} at $${price.toFixed(2)} to your portfolio.`,
          timestamp: new Date().toLocaleTimeString(),
          type: "portfolio",
        };
        setChat((prev) => [...prev, aiMsg]);
        setLoading(false);
        return;
      }
    }

    if (lowerInput.startsWith('/watch ')) {
      // Handle add to watchlist commands
      const symbol = input.split(' ')[1]?.toUpperCase();
      if (symbol) {
        await addToWatchlist(symbol);
        const aiMsg: ChatMessage = {
          sender: "ai",
          text: `Added ${symbol} to your watchlist.`,
          timestamp: new Date().toLocaleTimeString(),
          type: "watchlist",
        };
        setChat((prev) => [...prev, aiMsg]);
        setLoading(false);
        return;
      }
    }

    // 1. Fetch historical data for the symbol
    let bestMatch: Record<string, unknown> | null = null;
    let series: Record<string, unknown>[] = [];
    const aiMsgs: ChatMessage[] = [];
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(input.trim())}&history=1`);
      if (res.ok) {
        series = await res.json();
        bestMatch = series[series.length - 1]; // latest data point
        
        // Generate chart data
        const chartData = generateChartData(series);
        if (chartData) {
          setChartData(chartData);
          setSelectedStock(input.trim());
        }
        
        aiMsgs.push({
          sender: "ai",
          text: `Found company: ${bestMatch["Name"] as string}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        // If stock lookup fails, try /api/insights as an advanced query
        try {
          const insightsRes = await fetch("/api/insights", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userInput: input.trim(),
              previousResults,
            }),
          });
          const insights = await insightsRes.json();
          const insightText = insights.insight || "No insight generated.";
          setPreviousResults(insights.insight ? insights.insight : null);
          aiMsgs.push({
            sender: "ai",
            text: insightText,
            timestamp: new Date().toLocaleTimeString(),
            type: "insight",
          });
          // Set confetti based on insight
          if (insightText.toLowerCase().includes("strong") || insightText.toLowerCase().includes("positive")) {
            setShowConfetti(true);
          } else {
            setShowConfetti(false);
          }
        } catch (insightErr) {
          aiMsgs.push({
            sender: "ai",
            text: `Could not find any company matching "${input}" and no advanced insight could be generated. Please try again.`,
            timestamp: new Date().toLocaleTimeString(),
          });
        }
        setChat((prev) => [...prev, ...aiMsgs]);
        setLoading(false);
        return;
      }
    } catch {
      aiMsgs.push({
        sender: "ai",
        text: `Error fetching historical data for "${input}".`,
        timestamp: new Date().toLocaleTimeString(),
      });
      setChat((prev) => [...prev, ...aiMsgs]);
      setLoading(false);
      return;
    }
    // 2. Fetch insights using the historical series and previous results
    let insightText = "";
    try {
      const insightsRes = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: bestMatch ? bestMatch["Name"] : undefined,
          history: series,
          userInput: input.trim(),
          previousResults,
          // historicalData: ... // Optionally add if you want to pass more
        }),
      });
      const insights = await insightsRes.json();
      insightText = insights.insight || "No insight generated.";
      setPreviousResults(insights.insight ? insights.insight : null);
      aiMsgs.push({
        sender: "ai",
        text: insightText,
        timestamp: new Date().toLocaleTimeString(),
        type: "insight",
      });
      // Set confetti based on insight
      if (insightText.toLowerCase().includes("strong") || insightText.toLowerCase().includes("positive")) {
        setShowConfetti(true);
      } else {
        setShowConfetti(false);
      }
    } catch (err) {
      aiMsgs.push({
        sender: "ai",
        text: `Error fetching insights: ${String(err)}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    setChat((prev) => [...prev, ...aiMsgs]);
    setLoading(false);
    if (showConfetti) setTimeout(() => setShowConfetti(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (insightRef.current) {
      const html2pdf = (await import("html2pdf.js")).default;
      html2pdf().from(insightRef.current).set({ margin: 0.5, filename: "stock-insight.pdf", html2canvas: { scale: 2 } }).save();
    }
  };

  // Only show AI output (insight) in the main area
  let latestInsight: ChatMessage | undefined = undefined;
  for (let i = chat.length - 1; i >= 0; i--) {
    if (chat[i].type === "insight") {
      latestInsight = chat[i];
      break;
    }
  }

  const totalPortfolioValue = portfolio.reduce((sum, item) => sum + item.totalValue, 0);
  const totalGainLoss = portfolio.reduce((sum, item) => sum + item.gainLoss, 0);

  return (
    <div className={styles.fullScreenContent}>
      {showConfetti && <div className={styles.confetti}>🎉✨🎊🤑💸</div>}
      <h1 style={{marginBottom: 0}}>Stock Chat Interface</h1>
      
      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'chat' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬 Chat
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'portfolio' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('portfolio')}
        >
          📊 Portfolio
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'watchlist' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('watchlist')}
        >
          👀 Watchlist
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'charts' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          📈 Charts
        </button>
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {activeTab === 'chat' && (
          <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            {latestInsight && (
              <div className={styles.aiBubble} style={{background: 'none', boxShadow: 'none', margin: 0, padding: 0}}>
                <div ref={insightRef} className={styles.bubbleContent}>
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>{latestInsight.text}</ReactMarkdown>
                </div>
                <button className={styles.sendBtn} style={{ marginTop: 8 }} onClick={handleDownloadPDF}>
                  Download as PDF
                </button>
                <div className={styles.timestamp}>{latestInsight.timestamp}</div>
              </div>
            )}
          </div>
        )}

                 {activeTab === 'portfolio' && (
           <div className={styles.portfolioSection}>
             <div className={styles.portfolioSummary}>
               <h3>Portfolio Summary</h3>
               <div className={styles.summaryCards}>
                 <div className={styles.summaryCard}>
                   <h4>Total Value</h4>
                   <p>${totalPortfolioValue.toFixed(2)}</p>
                 </div>
                 <div className={styles.summaryCard}>
                   <h4>Total P&L</h4>
                   <p className={totalGainLoss >= 0 ? styles.positive : styles.negative}>
                     ${totalGainLoss.toFixed(2)}
                   </p>
                 </div>
                 <div className={styles.summaryCard}>
                   <h4>Holdings</h4>
                   <p>{portfolio.length}</p>
                 </div>
                 {portfolioAnalytics && (
                   <div className={styles.summaryCard}>
                     <h4>Risk Level</h4>
                     <p>{portfolioAnalytics.riskMetrics.volatility > 0.2 ? 'High' : portfolioAnalytics.riskMetrics.volatility > 0.1 ? 'Medium' : 'Low'}</p>
                   </div>
                 )}
               </div>
             </div>
             
             {portfolioAnalytics && (
               <div className={styles.portfolioAnalytics}>
                 <h3>Analytics & Insights</h3>
                 <div className={styles.analyticsGrid}>
                   <div className={styles.analyticsCard}>
                     <h4>Top Performers</h4>
                     {portfolioAnalytics.topPerformers.map((item: PortfolioItem, index: number) => (
                       <div key={index} className={styles.analyticsItem}>
                         <span>{item.symbol}</span>
                         <span className={styles.positive}>+{item.gainLossPercent.toFixed(1)}%</span>
                       </div>
                     ))}
                   </div>
                   <div className={styles.analyticsCard}>
                     <h4>Risk Metrics</h4>
                     <div className={styles.analyticsItem}>
                       <span>Volatility</span>
                       <span>{(portfolioAnalytics.riskMetrics.volatility * 100).toFixed(1)}%</span>
                     </div>
                     <div className={styles.analyticsItem}>
                       <span>Sharpe Ratio</span>
                       <span>{portfolioAnalytics.riskMetrics.sharpeRatio.toFixed(2)}</span>
                     </div>
                   </div>
                   <div className={styles.analyticsCard}>
                     <h4>Recommendations</h4>
                     {portfolioAnalytics.recommendations.map((rec: string, index: number) => (
                       <div key={index} className={styles.recommendationItem}>
                         💡 {rec}
                       </div>
                     ))}
                   </div>
                 </div>
               </div>
             )}
             
             <div className={styles.portfolioHoldings}>
               <h3>Holdings</h3>
               {portfolio.length === 0 ? (
                 <p>No stocks in portfolio yet. Use /add SYMBOL SHARES PRICE to add stocks.</p>
               ) : (
                 <div className={styles.holdingsList}>
                   {portfolio.map((item, index) => (
                     <div key={index} className={styles.holdingItem}>
                       <div className={styles.holdingHeader}>
                         <h4>{item.symbol}</h4>
                         <span className={item.gainLoss >= 0 ? styles.positive : styles.negative}>
                           {item.gainLoss >= 0 ? '+' : ''}{item.gainLossPercent.toFixed(2)}%
                         </span>
                       </div>
                       <div className={styles.holdingDetails}>
                         <span>{item.shares} shares @ ${item.avgPrice.toFixed(2)}</span>
                         <span>${item.totalValue.toFixed(2)}</span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </div>
         )}

        {activeTab === 'watchlist' && (
          <div className={styles.watchlistSection}>
            <h3>Watchlist</h3>
            {watchlist.length === 0 ? (
              <p>No stocks in watchlist yet. Use /watch SYMBOL to add stocks.</p>
            ) : (
              <div className={styles.watchlistItems}>
                {watchlist.map((item, index) => (
                  <div key={index} className={styles.watchlistItem}>
                    <div className={styles.watchlistHeader}>
                      <h4>{item.symbol}</h4>
                      <span className={item.change >= 0 ? styles.positive : styles.negative}>
                        {item.change >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                      </span>
                    </div>
                    <div className={styles.watchlistPrice}>
                      ${item.price.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'charts' && (
          <div className={styles.chartsSection}>
            <h3>Stock Charts</h3>
            {chartData ? (
              <div className={styles.chartContainer}>
                <h4>{selectedStock} - Price History</h4>
                <Line 
                  data={chartData} 
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                      title: {
                        display: true,
                        text: `${selectedStock} Stock Price`,
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <p>Search for a stock to see its chart.</p>
            )}
          </div>
        )}
      </div>

      {/* Floating chat-bot button */}
      <button className={styles.chatBotButton} onClick={() => setChatBotOpen((v) => !v)} aria-label="Open chat bot">
        💬
      </button>
      
      {/* Chat-bot window */}
      {chatBotOpen && (
        <div className={styles.chatBotWindow}>
          <div className={styles.chatBotHeader}>
            StockBot
            <button className={styles.chatBotClose} onClick={() => setChatBotOpen(false)} aria-label="Close chat bot">×</button>
          </div>
          <div className={styles.chatBotBody}>
            {chat.map((msg, idx) => (
              <div key={idx} style={{marginBottom: 8, textAlign: msg.sender === 'user' ? 'right' : 'left'}}>
                <span style={{background: msg.sender === 'user' ? '#0070f3' : '#eaf6ff', color: msg.sender === 'user' ? '#fff' : '#222', borderRadius: 12, padding: '6px 12px', display: 'inline-block'}}>
                  {msg.text}
                </span>
                <div className={styles.timestamp}>{msg.timestamp}</div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className={styles.chatBotInputRow}>
            <input
              type="text"
              placeholder="Type a company name, symbol, or command (/portfolio, /watch AAPL, /add AAPL 10 150.50)..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleSend(); }}
              disabled={loading}
              className={styles.chatBotInput}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()} className={styles.chatBotSendBtn}>
              {loading ? "..." : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
