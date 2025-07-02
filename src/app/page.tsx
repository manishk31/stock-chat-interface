"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import { Line } from "react-chartjs-2";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
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

const FUNNY_INSIGHTS = [
  "Remember: Even Warren Buffett started with one share! 🧓💸",
  "Investing tip: Don't put all your eggs in one basket... unless it's a golden basket! 🥚✨",
  "Stocks go up, stocks go down, but coffee always helps. ☕📈",
  "If you think investing is risky, try not investing! 😅",
  "Buy low, sell high. Or just hold and hope! 🤞",
  "The best time to plant a tree was 20 years ago. The second best time is now. 🌳💰",
  "Remember: Bulls make money, bears make money, pigs get slaughtered. 🐂🐻🐖",
  "If your stock advice comes from a cat, reconsider. 🐱💹",
  "Investing is like a rollercoaster—enjoy the ride! 🎢",
  "When in doubt, zoom out! 🔍➡️"
];

function isPositiveInsight(text: string) {
  const positiveWords = ["good investment", "buy", "bullish", "positive", "strong", "uptrend", "opportunity", "worth investing", "recommend", "favorable", "green flag", "growth"];
  return positiveWords.some((w) => text.toLowerCase().includes(w));
}
function isNegativeInsight(text: string) {
  const negativeWords = ["not recommended", "avoid", "bearish", "negative", "risk", "downtrend", "overvalued", "warning", "red flag", "decline", "weak", "volatile", "caution"];
  return negativeWords.some((w) => text.toLowerCase().includes(w));
}

function getEmojiForInsight(text: string) {
  if (isPositiveInsight(text)) return "🚀🟢";
  if (isNegativeInsight(text)) return "⚠️🔴";
  return "💡";
}

function maybeFunnyInsight() {
  return Math.random() < 0.25 ? FUNNY_INSIGHTS[Math.floor(Math.random() * FUNNY_INSIGHTS.length)] : null;
}

interface ChatMessage {
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  type?: "text" | "chart" | "sentiment" | "insight" | "funny";
}

export default function Home() {
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [latestStockData, setLatestStockData] = useState<Record<string, unknown> | null>(null);
  const [historySeries, setHistorySeries] = useState<Record<string, unknown>[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [chatBotOpen, setChatBotOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const insightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, chatBotOpen]);

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

    // 1. Fetch historical data for the symbol
    let bestMatch: Record<string, unknown> | null = null;
    let series: Record<string, unknown>[] = [];
    const aiMsgs: ChatMessage[] = [];
    try {
      const res = await fetch(`/api/stock?symbol=${encodeURIComponent(input.trim())}&history=1`);
      if (res.ok) {
        series = await res.json();
        setHistorySeries(series);
        bestMatch = series[series.length - 1]; // latest data point
        setLatestStockData(bestMatch);
        aiMsgs.push({
          sender: "ai",
          text: `Found company: ${bestMatch["Name"] as string}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      } else {
        aiMsgs.push({
          sender: "ai",
          text: `Could not find any company matching "${input}". Please try again.`,
          timestamp: new Date().toLocaleTimeString(),
        });
        setLatestStockData(null);
        setHistorySeries([]);
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
      setLatestStockData(null);
      setHistorySeries([]);
      setChat((prev) => [...prev, ...aiMsgs]);
      setLoading(false);
      return;
    }
    // 2. Fetch insights using the historical series
    let insightText = "";
    try {
      const insightsRes = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: bestMatch["Name"], history: series }),
      });
      const insights = await insightsRes.json();
      insightText = insights.insight || "No insight generated.";
      aiMsgs.push({
        sender: "ai",
        text: `${getEmojiForInsight(insightText)} ${insightText}`,
        timestamp: new Date().toLocaleTimeString(),
        type: "insight",
      });
      // Set theme and confetti/warning based on insight
      if (isPositiveInsight(insightText)) {
        setShowConfetti(true);
      } else if (isNegativeInsight(insightText)) {
        setShowConfetti(false);
      }
    } catch (err) {
      aiMsgs.push({
        sender: "ai",
        text: `Error fetching insights: ${String(err)}`,
        timestamp: new Date().toLocaleTimeString(),
      });
    }
    // 2.5. Occasionally inject a funny investing insight
    const funny = maybeFunnyInsight();
    if (funny) {
      aiMsgs.push({
        sender: "ai",
        text: funny,
        timestamp: new Date().toLocaleTimeString(),
        type: "funny",
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
      text: "[Chart placeholder: Historical Price/Volume chart will appear here]",
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
    // Hide confetti after 2s
    if (showConfetti) setTimeout(() => setShowConfetti(false), 2000);
  };

  // PDF export handler
  const handleDownloadPDF = async () => {
    if (insightRef.current) {
      const html2pdf = (await import("html2pdf.js")).default;
      html2pdf().from(insightRef.current).set({ margin: 0.5, filename: "stock-insight.pdf", html2canvas: { scale: 2 } }).save();
    }
  };

  // Only show AI output (insight) in the main area
  const latestInsight = chat.findLast((msg) => msg.type === "insight");

  return (
    <div className={styles.fullScreenContent}>
      {showConfetti && <div className={styles.confetti}>🎉✨🎊🤑💸</div>}
      <h1 style={{marginBottom: 0}}>Stock Chat Interface</h1>
      {/* Main AI output area */}
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
              placeholder="Type a company name, symbol, or question..."
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
