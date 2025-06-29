"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
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
} from "chart.js";

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
  type?: "text" | "chart" | "sentiment" | "insight";
}

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [latestStockData, setLatestStockData] = useState<Record<string, unknown> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

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

    // 1. Fetch all stock data (array)
    let allStocks: Record<string, unknown>[] = [];
    let bestMatch: Record<string, unknown> | null = null;
    const aiMsgs: ChatMessage[] = [];
    try {
      const stockRes = await fetch(`/api/stock?all=1`);
      if (stockRes.ok) {
        allStocks = await stockRes.json();
        // Dynamically import fuse.js for fuzzy search
        const Fuse = (await import("fuse.js")).default;
        const fuse = new Fuse(allStocks, {
          keys: ["Name"],
          threshold: 0.4,
        });
        const results = fuse.search(input.trim());
        if (results.length > 0) {
          bestMatch = results[0].item as Record<string, unknown>;
        }
      }
    } catch {
      // ignore, will handle below
    }
    if (!bestMatch) {
      aiMsgs.push({
        sender: "ai",
        text: `Could not find any company matching "${input}". Please try again.`,
        timestamp: new Date().toLocaleTimeString(),
      });
      setLatestStockData(null);
      setChat((prev) => [...prev, ...aiMsgs]);
      setLoading(false);
      return;
    }
    setLatestStockData(bestMatch);
    aiMsgs.push({
      sender: "ai",
      text: `Found company: ${bestMatch["Name"] as string}`,
      timestamp: new Date().toLocaleTimeString(),
    });
    // 2. Fetch insights
    try {
      const insightsRes = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: bestMatch["Name"], stockData: bestMatch }),
      });
      const insights = await insightsRes.json();
      aiMsgs.push({
        sender: "ai",
        text: insights.insight || "No insight generated.",
        timestamp: new Date().toLocaleTimeString(),
        type: "insight",
      });
    } catch (err) {
      aiMsgs.push({
        sender: "ai",
        text: `Error fetching insights: ${String(err)}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    // 3. Fetch sentiment (simulate news headlines for now)
    try {
      const newsData = [
        `News about ${bestMatch["Name"] as string}`,
        `Analysts discuss ${(bestMatch["Name"] as string) || "the company"}'s recent performance`,
      ];
      const sentimentRes = await fetch("/api/sentiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: bestMatch["Name"], newsData }),
      });
      const sentiment = await sentimentRes.json();
      aiMsgs.push({
        sender: "ai",
        text: sentiment.sentiment || "No sentiment generated.",
        timestamp: new Date().toLocaleTimeString(),
        type: "sentiment",
      });
    } catch (err) {
      aiMsgs.push({
        sender: "ai",
        text: `Error fetching sentiment: ${String(err)}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    // 4. Chart message
    aiMsgs.push({
      sender: "ai",
      text: "[Chart placeholder: Price/Volume chart will appear here]",
      timestamp: new Date().toLocaleTimeString(),
      type: "chart",
    });
    // 5. Placeholder for PDF upload
    aiMsgs.push({
      sender: "ai",
      text: "[PDF upload placeholder: Broker research PDF support coming soon]",
      timestamp: new Date().toLocaleTimeString(),
    });
    setChat((prev) => [...prev, ...aiMsgs]);
    setLoading(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      handleSend();
    }
  };

  // Chart rendering logic
  const renderChart = () => {
    if (!latestStockData || !latestStockData["Close Price"] || !latestStockData["Daily Volume"]) return null;
    // For demo, use Close Price as priceHistory and Daily Volume as volume (mocked as arrays)
    const price = parseFloat((latestStockData["Close Price"] as string).replace(/,/g, ""));
    const volume = parseFloat((latestStockData["Daily Volume"] as string).replace(/,/g, ""));
    const labels = ["Today"];
    const data = {
      labels,
      datasets: [
        {
          label: "Price",
          data: [price],
          borderColor: "#0070f3",
          backgroundColor: "rgba(0,112,243,0.1)",
          yAxisID: "y",
        },
        {
          label: "Volume",
          data: [volume],
          borderColor: "#f39c12",
          backgroundColor: "rgba(243,156,18,0.1)",
          yAxisID: "y1",
        },
      ],
    };
    const options = {
      responsive: true,
      plugins: {
        legend: { position: "top" as const },
        title: { display: true, text: `Price & Volume for ${latestStockData["Name"] as string}` },
      },
      scales: {
        y: { type: "linear" as const, display: true, position: "left" as const },
        y1: {
          type: "linear" as const,
          display: true,
          position: "right" as const,
          grid: { drawOnChartArea: false },
        },
      },
    };
    return (
      <div className={styles.chartPlaceholder}>
        <Line data={data} options={options} />
      </div>
    );
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Stock Chat Interface</h1>
        <div className={styles.chatContainer}>
          {chat.map((msg, idx) => {
            if (msg.type === "chart" && latestStockData) {
              return <React.Fragment key={idx}>{renderChart()}</React.Fragment>;
            }
            return (
              <div
                key={idx}
                className={
                  msg.sender === "user"
                    ? styles.userBubble
                    : styles.aiBubble
                }
              >
                <div className={styles.bubbleContent}>{msg.text}</div>
                <div className={styles.timestamp}>{msg.timestamp}</div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
        <div className={styles.inputRow}>
          <input
            type="text"
            placeholder="Type a company name, symbol, or question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleInputKeyDown}
            disabled={loading}
            className={styles.input}
          />
          <button onClick={handleSend} disabled={loading || !input.trim()} className={styles.sendBtn}>
            {loading ? "..." : "Send"}
          </button>
        </div>
        <div className={styles.quickBtns}>
          <button onClick={() => setInput("Reliance")}>Reliance</button>
          <button onClick={() => setInput("Infosys")}>Infosys</button>
          <button onClick={() => setInput("HDFC")}>HDFC</button>
        </div>
      </main>
    </div>
  );
}
