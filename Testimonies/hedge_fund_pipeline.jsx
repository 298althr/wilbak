import { useState } from "react";

const SECTIONS = ["pipeline", "budget", "trading", "architecture"];

const budgetData = [
  {
    provider: "Scraper API (Base)",
    purpose: "Yahoo Finance base records",
    free: "Trial only",
    paid: "$0.0015/record",
    monthly: "~$15",
    tier: "core",
    fills: ["closing_price", "open", "bid", "ask", "volume", "day_range", "week_range"],
  },
  {
    provider: "Finnhub",
    purpose: "News, analyst ratings, fundamentals",
    free: "60 req/min",
    paid: "$50/mo per market",
    monthly: "$0 (free tier)",
    tier: "free",
    fills: ["recent_news", "recommendation_rating", "analyst_price_target", "upgrades_and_downgrades", "top_analysts"],
  },
  {
    provider: "Financial Modeling Prep",
    purpose: "Real-time quotes, WebSocket, fundamentals",
    free: "Limited",
    paid: "$19/mo flat",
    monthly: "$19",
    tier: "core",
    fills: ["financials", "financials_quarterly", "earnings_estimate", "revenue_estimate", "eps_trend", "eps_revisions", "growth_estimates"],
  },
  {
    provider: "Alpha Vantage",
    purpose: "Technical indicators, historical data",
    free: "25 req/day",
    paid: "$29.99–$249.99/mo",
    monthly: "$29.99",
    tier: "core",
    fills: ["earnings_history", "revenue_estimate", "valuation_measures"],
  },
  {
    provider: "NewsAPI",
    purpose: "Real-time market news enrichment",
    free: "Dev tier",
    paid: "$449/mo (business)",
    monthly: "$0 (dev tier)",
    tier: "free",
    fills: ["recent_news"],
  },
  {
    provider: "Anthropic Claude API",
    purpose: "AI enrichment nodes: sentiment, signals, risk scoring",
    free: "No",
    paid: "$3–$15 per 1M tokens",
    monthly: "$50–$80 est.",
    tier: "ai",
    fills: ["sentiment_score", "risk_flag", "trade_signal", "news_summary"],
  },
  {
    provider: "Polygon.io",
    purpose: "Fallback real-time + WebSocket streaming",
    free: "5 req/min",
    paid: "$199/mo",
    monthly: "$0 (free fallback)",
    tier: "fallback",
    fills: ["similar", "people_also_watch", "real_time_tick"],
  },
];

const totalCore = 15 + 19 + 29.99 + 65;
const totalNote = "~$129–$145/mo leaving $55–$71 buffer within your $200 budget";

const tradingDataFields = [
  {
    category: "Market Microstructure",
    icon: "📊",
    fields: [
      { name: "Bid/Ask Spread", source: "Scraper/FMP", importance: "critical", reason: "Determines entry/exit slippage" },
      { name: "Order Book Depth (L2)", source: "Polygon.io", importance: "critical", reason: "Detects liquidity walls & manipulation" },
      { name: "Trade Volume per Bar", source: "FMP / Alpha Vantage", importance: "high", reason: "Confirms price moves" },
      { name: "Tick Data / Time & Sales", source: "Polygon.io", importance: "high", reason: "HFT pattern detection" },
    ],
  },
  {
    category: "Technical Signals",
    icon: "📈",
    fields: [
      { name: "RSI, MACD, Bollinger Bands", source: "Alpha Vantage", importance: "critical", reason: "Entry/exit trigger signals" },
      { name: "EMA 9/21/50/200", source: "Alpha Vantage", importance: "critical", reason: "Trend confirmation" },
      { name: "ATR (Avg True Range)", source: "Alpha Vantage", importance: "high", reason: "Position sizing & stop loss" },
      { name: "VWAP", source: "Polygon.io", importance: "high", reason: "Intraday benchmark" },
    ],
  },
  {
    category: "Fundamental / Macro",
    icon: "🏦",
    fields: [
      { name: "Earnings Date & EPS Surprise", source: "Finnhub / FMP", importance: "critical", reason: "Pre-event risk flagging" },
      { name: "P/E, Forward P/E, PEG", source: "FMP / Alpha Vantage", importance: "medium", reason: "Valuation risk filter" },
      { name: "Revenue & Earnings Trend", source: "FMP", importance: "medium", reason: "Sector rotation signals" },
      { name: "Fed Rate / CPI / Macro Events", source: "Finnhub Economic", importance: "high", reason: "Macro risk-off detection" },
    ],
  },
  {
    category: "Sentiment & Alternative",
    icon: "🧠",
    fields: [
      { name: "News Sentiment Score (AI)", source: "Claude API", importance: "critical", reason: "Real-time sentiment trading edge" },
      { name: "Analyst Upgrades/Downgrades", source: "Finnhub", importance: "high", reason: "Institutional signal detection" },
      { name: "Insider Transactions", source: "Finnhub", importance: "medium", reason: "Smart money tracking" },
      { name: "Social Sentiment (Reddit/X)", source: "Custom Scraper", importance: "medium", reason: "Retail flow detection" },
    ],
  },
  {
    category: "Risk & Compliance",
    icon: "🛡️",
    fields: [
      { name: "VaR (Value at Risk)", source: "Computed internally", importance: "critical", reason: "Max loss per trade/portfolio" },
      { name: "Sharpe / Sortino Ratio", source: "Computed internally", importance: "critical", reason: "Risk-adjusted return measure" },
      { name: "Correlation Matrix", source: "Computed internally", importance: "high", reason: "Portfolio diversification check" },
      { name: "Circuit Breaker Flags", source: "Claude AI node", importance: "critical", reason: "Halt trading on anomalies" },
    ],
  },
];

const pipelineNodes = [
  {
    id: 1,
    title: "Ingestion Layer",
    color: "#00d4ff",
    icon: "⚡",
    desc: "Fetches raw data from Scraper API by symbol URL",
    ai: false,
    code: `async function fetchBase(symbol) {
  const url = \`https://finance.yahoo.com/quote/\${symbol}/\`;
  const res = await fetch(SCRAPER_API + "?url=" + url, {
    headers: { "x-api-key": SCRAPER_KEY }
  });
  return res.json();
}`,
  },
  {
    id: 2,
    title: "Null Detector",
    color: "#ff6b35",
    icon: "🔍",
    desc: "Scans record for null fields and routes to enrichers",
    ai: false,
    code: `function detectNulls(record) {
  const nullMap = {};
  for (const [key, val] of Object.entries(record)) {
    if (val === null || val === undefined) {
      nullMap[key] = routeToProvider(key);
    }
  }
  return nullMap;
}

function routeToProvider(field) {
  const routes = {
    recent_news: "finnhub",
    recommendation_rating: "finnhub",
    financials: "fmp",
    eps_trend: "alphavantage",
    earnings_estimate: "fmp",
  };
  return routes[field] ?? "skip";
}`,
  },
  {
    id: 3,
    title: "AI Enrichment Node",
    color: "#a855f7",
    icon: "🤖",
    desc: "Claude API analyzes news, scores sentiment, flags risk",
    ai: true,
    code: `async function aiEnrich(record, news) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: \`Analyze this financial data and news for \${record.stock_ticker}.
Return JSON with: sentiment_score (-1 to 1), risk_flag (low/med/high),
trade_signal (buy/sell/hold), news_summary (max 2 sentences).
News: \${JSON.stringify(news.slice(0,5))}
Price data: close=\${record.closing_price}, vol=\${record.volume}\`
      }]
    })
  });
  const data = await res.json();
  return JSON.parse(data.content[0].text);
}`,
  },
  {
    id: 4,
    title: "Multi-Provider Enricher",
    color: "#22c55e",
    icon: "🔗",
    desc: "Parallel calls to Finnhub, FMP, Alpha Vantage to fill nulls",
    ai: false,
    code: `async function enrichNulls(nullMap, symbol) {
  const enriched = {};
  const tasks = Object.entries(nullMap).map(async ([field, provider]) => {
    if (provider === "finnhub") {
      enriched[field] = await finnhubFetch(field, symbol);
    } else if (provider === "fmp") {
      enriched[field] = await fmpFetch(field, symbol);
    } else if (provider === "alphavantage") {
      enriched[field] = await alphaFetch(field, symbol);
    }
  });
  await Promise.allSettled(tasks); // parallel, non-blocking
  return enriched;
}`,
  },
  {
    id: 5,
    title: "Merge & Validate",
    color: "#f59e0b",
    icon: "✅",
    desc: "Deep merges base + enriched data, validates schema",
    ai: false,
    code: `function mergeRecord(base, enriched, aiFields) {
  const merged = { ...base, ...enriched, ...aiFields };
  // Validate critical fields
  const required = ["closing_price", "volume", "stock_ticker"];
  const isValid = required.every(f => merged[f] !== null);
  return {
    ...merged,
    _meta: {
      enriched_at: new Date().toISOString(),
      completeness: calcCompleteness(merged),
      valid: isValid
    }
  };
}`,
  },
  {
    id: 6,
    title: "Trade Signal Engine",
    color: "#ec4899",
    icon: "🎯",
    desc: "Evaluates enriched record against 10-trade/day strategy rules",
    ai: true,
    code: `function evaluateTrade(record) {
  const { sentiment_score, risk_flag, closing_price,
          week_range, volume, avg_volume } = record;

  const volSpike = volume / avg_volume > 2;
  const nearLow = closing_price < parseFloat(week_range.split("-")[0]) * 1.05;
  const bullishSentiment = sentiment_score > 0.3;
  const safeRisk = risk_flag !== "high";

  if (volSpike && nearLow && bullishSentiment && safeRisk) {
    return { action: "BUY", confidence: 0.78, stop_loss: closing_price * 0.97 };
  }
  return { action: "HOLD", confidence: 0.5 };
}`,
  },
];

const importanceBadge = (level) => {
  const styles = {
    critical: "bg-red-500/20 text-red-300 border border-red-500/30",
    high: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    medium: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  };
  return styles[level] || styles.medium;
};

export default function HedgeFundPipeline() {
  const [activeSection, setActiveSection] = useState("pipeline");
  const [activeNode, setActiveNode] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);

  return (
    <div style={{
      background: "#040810",
      minHeight: "100vh",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: "#e2e8f0",
      overflowX: "hidden"
    }}>
      {/* Grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px"
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#00ff88", boxShadow: "0 0 12px #00ff88",
              animation: "pulse 2s infinite"
            }} />
            <span style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 4, textTransform: "uppercase" }}>
              SYSTEM ACTIVE • HEDGE FUND PIPELINE v2.0
            </span>
          </div>
          <h1 style={{
            fontSize: "clamp(22px, 4vw, 36px)",
            fontWeight: 800,
            background: "linear-gradient(135deg, #00d4ff 0%, #a855f7 50%, #ec4899 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            margin: 0, lineHeight: 1.2
          }}>
            DATA ENRICHMENT + TRADING INTELLIGENCE SYSTEM
          </h1>
          <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
            Multi-provider pipeline · AI enrichment nodes · 10+ trades/day per instrument · $200/mo budget
          </p>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", gap: 4, marginBottom: 32, flexWrap: "wrap" }}>
          {[
            { id: "pipeline", label: "⚡ Pipeline Code" },
            { id: "budget", label: "💰 Budget Breakdown" },
            { id: "trading", label: "📊 Trading Data Model" },
            { id: "architecture", label: "🏗️ Architecture" },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              style={{
                padding: "8px 18px",
                borderRadius: 6,
                border: "1px solid",
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "inherit",
                borderColor: activeSection === tab.id ? "#00d4ff" : "#1e293b",
                background: activeSection === tab.id ? "rgba(0,212,255,0.1)" : "transparent",
                color: activeSection === tab.id ? "#00d4ff" : "#64748b",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* PIPELINE SECTION */}
        {activeSection === "pipeline" && (
          <div>
            <div style={{ display: "grid", gap: 16 }}>
              {pipelineNodes.map((node, i) => (
                <div
                  key={node.id}
                  onClick={() => setActiveNode(activeNode === node.id ? null : node.id)}
                  style={{
                    border: "1px solid",
                    borderColor: activeNode === node.id ? node.color : "#1e293b",
                    borderRadius: 10,
                    padding: 20,
                    cursor: "pointer",
                    background: activeNode === node.id ? `${node.color}08` : "#0a0f1a",
                    transition: "all 0.25s",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: `${node.color}18`,
                      border: `1px solid ${node.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0
                    }}>
                      {node.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: node.color, letterSpacing: 2 }}>
                          NODE {String(node.id).padStart(2, "0")}
                        </span>
                        {node.ai && (
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 20,
                            background: "rgba(168,85,247,0.15)",
                            border: "1px solid rgba(168,85,247,0.3)",
                            color: "#a855f7"
                          }}>AI POWERED</span>
                        )}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginTop: 2 }}>
                        {node.title}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{node.desc}</div>
                    </div>
                    <div style={{ color: "#334155", fontSize: 18 }}>
                      {activeNode === node.id ? "▲" : "▼"}
                    </div>
                  </div>

                  {activeNode === node.id && (
                    <div style={{
                      marginTop: 16,
                      background: "#020408",
                      borderRadius: 8,
                      padding: 16,
                      border: "1px solid #1e293b",
                      overflow: "auto"
                    }}>
                      <pre style={{
                        margin: 0, fontSize: 12, lineHeight: 1.7,
                        color: "#a5f3fc", whiteSpace: "pre-wrap"
                      }}>
                        {node.code}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 24,
              padding: 20,
              background: "rgba(168,85,247,0.05)",
              border: "1px solid rgba(168,85,247,0.2)",
              borderRadius: 10
            }}>
              <div style={{ color: "#a855f7", fontSize: 11, letterSpacing: 3, marginBottom: 12 }}>
                FULL PIPELINE ORCHESTRATOR
              </div>
              <pre style={{ margin: 0, fontSize: 12, color: "#a5f3fc", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
{`async function runPipeline(symbol) {
  // Step 1: Fetch base record
  const base = await fetchBase(symbol);

  // Step 2: Detect nulls and route
  const nullMap = detectNulls(base[0]);

  // Step 3: Parallel enrichment (non-AI fields)
  const [enriched, news] = await Promise.all([
    enrichNulls(nullMap, symbol),
    finnhubFetch("recent_news", symbol)
  ]);

  // Step 4: AI enrichment node
  const aiFields = await aiEnrich(base[0], news);

  // Step 5: Merge everything
  const complete = mergeRecord(base[0], enriched, aiFields);

  // Step 6: Evaluate trade signal
  const signal = evaluateTrade(complete);

  return { record: complete, signal };
}`}
              </pre>
            </div>
          </div>
        )}

        {/* BUDGET SECTION */}
        {activeSection === "budget" && (
          <div>
            <div style={{ display: "grid", gap: 12 }}>
              {budgetData.map((item, i) => (
                <div key={i} style={{
                  border: "1px solid #1e293b",
                  borderRadius: 10,
                  padding: 18,
                  background: "#0a0f1a",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 12
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9" }}>{item.provider}</span>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 20,
                        background: item.tier === "ai" ? "rgba(168,85,247,0.15)"
                          : item.tier === "free" ? "rgba(34,197,94,0.15)"
                          : item.tier === "fallback" ? "rgba(100,116,139,0.15)"
                          : "rgba(0,212,255,0.15)",
                        border: `1px solid ${item.tier === "ai" ? "rgba(168,85,247,0.3)"
                          : item.tier === "free" ? "rgba(34,197,94,0.3)"
                          : item.tier === "fallback" ? "rgba(100,116,139,0.3)"
                          : "rgba(0,212,255,0.3)"}`,
                        color: item.tier === "ai" ? "#a855f7"
                          : item.tier === "free" ? "#22c55e"
                          : item.tier === "fallback" ? "#64748b"
                          : "#00d4ff",
                        textTransform: "uppercase", letterSpacing: 1
                      }}>{item.tier}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{item.purpose}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {item.fills.map(f => (
                        <span key={f} style={{
                          fontSize: 10, padding: "2px 7px",
                          background: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: 4, color: "#94a3b8"
                        }}>{f}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", minWidth: 90 }}>
                    <div style={{
                      fontSize: 18, fontWeight: 800,
                      color: item.monthly.includes("$0") ? "#22c55e" : "#f1f5f9"
                    }}>
                      {item.monthly}
                    </div>
                    <div style={{ fontSize: 11, color: "#475569" }}>per month</div>
                    <div style={{ fontSize: 10, color: "#334155", marginTop: 4 }}>
                      Free: {item.free}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div style={{
              marginTop: 20,
              padding: 20,
              background: "rgba(0,212,255,0.05)",
              border: "1px solid rgba(0,212,255,0.2)",
              borderRadius: 10,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              flexWrap: "wrap", gap: 12
            }}>
              <div>
                <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3 }}>ESTIMATED TOTAL</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{totalNote}</div>
              </div>
              <div>
                <span style={{ fontSize: 32, fontWeight: 900, color: "#00d4ff" }}>~$145</span>
                <span style={{ color: "#334155", fontSize: 14 }}> / $200 budget</span>
              </div>
            </div>

            <div style={{
              marginTop: 12,
              padding: 16,
              background: "rgba(34,197,94,0.05)",
              border: "1px solid rgba(34,197,94,0.2)",
              borderRadius: 10
            }}>
              <div style={{ color: "#22c55e", fontSize: 12, fontWeight: 700 }}>
                💡 $55–$71 REMAINING BUFFER STRATEGY
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, lineHeight: 1.8 }}>
                Reserve for: burst scraper API usage ($10–$15) · Polygon.io WebSocket upgrade if needed ·
                Claude API token overage during high-news events · Emergency fallback provider (EODHD at $19/mo)
              </div>
            </div>
          </div>
        )}

        {/* TRADING DATA MODEL SECTION */}
        {activeSection === "trading" && (
          <div>
            <div style={{
              padding: 16,
              background: "rgba(255,107,53,0.05)",
              border: "1px solid rgba(255,107,53,0.2)",
              borderRadius: 10, marginBottom: 20
            }}>
              <div style={{ color: "#ff6b35", fontSize: 11, letterSpacing: 3, marginBottom: 8 }}>
                HEDGE FUND TRADING MODEL • 10 TRADES/DAY PER INSTRUMENT
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                For a high-risk, insured hedge fund model executing ≥10 trades/day per symbol,
                you need <strong style={{color:"#f1f5f9"}}>5 data categories</strong> across
                market microstructure, technicals, fundamentals, AI-sentiment, and live risk controls.
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {tradingDataFields.map((cat, i) => (
                <div key={i} style={{
                  border: "1px solid #1e293b",
                  borderRadius: 10,
                  background: "#0a0f1a",
                  overflow: "hidden"
                }}>
                  <div
                    onClick={() => setExpandedCategory(expandedCategory === i ? null : i)}
                    style={{
                      padding: "14px 18px",
                      display: "flex", alignItems: "center", gap: 10,
                      cursor: "pointer"
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", flex: 1 }}>
                      {cat.category}
                    </span>
                    <span style={{ fontSize: 11, color: "#334155" }}>
                      {cat.fields.length} fields {expandedCategory === i ? "▲" : "▼"}
                    </span>
                  </div>

                  {expandedCategory === i && (
                    <div style={{ borderTop: "1px solid #1e293b" }}>
                      {cat.fields.map((field, j) => (
                        <div key={j} style={{
                          padding: "12px 18px",
                          borderBottom: j < cat.fields.length - 1 ? "1px solid #0f172a" : "none",
                          display: "grid",
                          gridTemplateColumns: "1fr auto",
                          gap: 8,
                          alignItems: "center"
                        }}>
                          <div>
                            <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>
                              {field.name}
                            </div>
                            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                              {field.reason}
                            </div>
                            <div style={{ fontSize: 10, color: "#334155", marginTop: 2 }}>
                              Source: {field.source}
                            </div>
                          </div>
                          <span style={{
                            fontSize: 10, padding: "3px 10px",
                            borderRadius: 20,
                            whiteSpace: "nowrap",
                            ...Object.fromEntries(
                              importanceBadge(field.importance)
                                .split(" ")
                                .filter(c => c.includes(":"))
                                .map(c => c.split(":"))
                            )
                          }}>
                            {field.importance.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ARCHITECTURE SECTION */}
        {activeSection === "architecture" && (
          <div>
            <div style={{
              padding: 24,
              background: "#0a0f1a",
              border: "1px solid #1e293b",
              borderRadius: 10,
              marginBottom: 20
            }}>
              <div style={{ color: "#00d4ff", fontSize: 11, letterSpacing: 3, marginBottom: 20 }}>
                SYSTEM ARCHITECTURE • AI NODE MAP
              </div>

              {/* Flow diagram */}
              {[
                { label: "SCRAPER API", sub: "Yahoo Finance base record", color: "#00d4ff", arrow: true },
                { label: "NULL DETECTOR", sub: "Routes fields to providers", color: "#ff6b35", arrow: true },
                { label: "PARALLEL ENRICHERS", sub: "Finnhub + FMP + Alpha Vantage", color: "#22c55e", arrow: true },
                { label: "CLAUDE AI NODE", sub: "Sentiment · Risk Score · Signal", color: "#a855f7", ai: true, arrow: true },
                { label: "MERGE ENGINE", sub: "Deep merge + schema validation", color: "#f59e0b", arrow: true },
                { label: "TRADE SIGNAL ENGINE", sub: "10+ trades/day evaluation", color: "#ec4899", arrow: true },
                { label: "RISK CIRCUIT BREAKER", sub: "AI-monitored kill switch", color: "#ef4444", ai: true, arrow: false },
              ].map((node, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: "100%",
                    padding: "12px 20px",
                    borderRadius: 8,
                    background: `${node.color}10`,
                    border: `1px solid ${node.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: node.color }}>{node.label}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{node.sub}</div>
                    </div>
                    {node.ai && (
                      <span style={{
                        fontSize: 10, padding: "2px 10px", borderRadius: 20,
                        background: "rgba(168,85,247,0.15)",
                        border: "1px solid rgba(168,85,247,0.3)",
                        color: "#a855f7"
                      }}>AI</span>
                    )}
                  </div>
                  {node.arrow && (
                    <div style={{ color: "#1e293b", fontSize: 20, lineHeight: 1, margin: "2px 0" }}>↓</div>
                  )}
                </div>
              ))}
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12
            }}>
              {[
                { title: "AI Roles in Pipeline", items: ["News sentiment scoring", "Risk flag classification", "Trade signal generation", "Circuit breaker monitoring", "Null field inference"] },
                { title: "Insurance / Risk Controls", items: ["VaR limit per trade", "Max 2% loss per instrument/day", "Correlation-based position sizing", "Auto-halt on 5% drawdown", "AI anomaly detection"] },
                { title: "10 Trades/Day Logic", items: ["Momentum breakout signals", "Volume spike detection", "VWAP reversion trades", "Earnings catalyst plays", "Sentiment swing trades"] },
              ].map((card, i) => (
                <div key={i} style={{
                  padding: 18,
                  background: "#0a0f1a",
                  border: "1px solid #1e293b",
                  borderRadius: 10
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>
                    {card.title}
                  </div>
                  {card.items.map((item, j) => (
                    <div key={j} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 11, color: "#64748b", marginBottom: 6
                    }}>
                      <div style={{
                        width: 4, height: 4, borderRadius: "50%",
                        background: "#00d4ff", flexShrink: 0
                      }} />
                      {item}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: 40, paddingTop: 20,
          borderTop: "1px solid #0f172a",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 8
        }}>
          <span style={{ fontSize: 10, color: "#1e293b" }}>
            HEDGE FUND PIPELINE • BUILT FOR $200/MO BUDGET
          </span>
          <span style={{ fontSize: 10, color: "#1e293b" }}>
            Finnhub (free) + FMP ($19) + Alpha Vantage ($29.99) + Claude AI (~$65) + Scraper (~$15)
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
