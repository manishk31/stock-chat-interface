"use client";
import React, { useState, useRef, useEffect } from "react";
import styles from "./page.module.css";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";

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
  const [showConfetti, setShowConfetti] = useState(false);
  const [chatBotOpen, setChatBotOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const insightRef = useRef<HTMLDivElement>(null);
  const [previousResults, setPreviousResults] = useState<unknown>(null);

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
        bestMatch = series[series.length - 1]; // latest data point
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
