import { useState } from "react";

// ── DATA ──────────────────────────────────────────────────────────────────────

const gaps = [
  {
    id: "L2",
    status: "CRITICAL GAP",
    statusColor: "#ef4444",
    title: "L2 Market Depth — Misassigned",
    ourSetup: "Listed as a field but assigned to Polygon.io free tier",
    problem: "Free/L1 SIP feeds masquerade as L2. You only see top-of-book, not full order depth. 10 trades/day without true L2 = flying blind on slippage.",
    fix: "Polygon.io Starter paid ($29/mo) or Databento MBP-10 schema for equities. IBKR TWS API for futures L2 (free with brokerage account).",
    addedCost: "+$29–$79/mo",
    icon: "📉",
  },
  {
    id: "GREEKS",
    status: "MISSING LAYER",
    statusColor: "#f59e0b",
    title: "Options Greeks — Zero Coverage",
    ourSetup: "Not in our data model at all",
    problem: "If the fund uses options to 'insure' positions (as stated), Delta and Gamma are not optional. Without them, you cannot know your hedge ratio or where the market 'pin' is at expiry.",
    fix: "ORATS Live API (via Tradier) covers Delta, Gamma, Theta, Vega, IV surfaces for all US stocks/ETFs/indexes. Tradier account required.",
    addedCost: "+$199/mo (ORATS professional)",
    icon: "🔢",
  },
  {
    id: "REGIME",
    status: "UNDERSPECIFIED",
    statusColor: "#a855f7",
    title: "AI Regime Detection — Too Passive",
    ourSetup: "AI node scored sentiment and flagged risk reactively",
    problem: "A reactive AI only responds after the market has already moved. 10 trades/day requires the system to detect regime shifts (Trending → Mean-Reverting) BEFORE committing capital, then swap strategy logic automatically.",
    fix: "Add a Regime Classifier node using rolling volatility, ADX, and breadth signals. Claude API evaluates macro context every 15 minutes to switch between Momentum and Reversion playbooks.",
    addedCost: "+$30–$50 Claude tokens/mo",
    icon: "🧠",
  },
  {
    id: "RL",
    status: "MISSING NODE",
    statusColor: "#f59e0b",
    title: "Order Execution Intelligence — Missing",
    ourSetup: "We assumed Market Orders universally",
    problem: "Sending 10 market orders per day on a single instrument telegraphs your flow to market makers and costs you on every spread. You need adaptive order routing: Limit in low-vol, Market in breakouts.",
    fix: "Reinforcement Learning micro-node: trains on historical fill quality vs. volatility regime. Claude AI decides Limit vs. Market in real time based on current bid-ask spread width.",
    addedCost: "Compute only — no new API",
    icon: "⚡",
  },
  {
    id: "CORRELATION",
    status: "LISTED, NOT BUILT",
    statusColor: "#0ea5e9",
    title: "Real-Time Correlation Matrix — Defined, Not Wired",
    ourSetup: "Listed as a risk field but computed 'internally' — no data source specified",
    problem: "Cluster risk is the #1 silent killer of multi-instrument hedge funds. If 8 of your 10 instruments correlate above 0.7 during a shock event, your 'diversified' portfolio moves as one.",
    fix: "Compute rolling 20-day correlation matrix from Alpha Vantage OHLCV data. Refresh every 4 hours. Trigger alert if any pair exceeds 0.7. Claude AI node evaluates portfolio heat before every trade.",
    addedCost: "Existing Alpha Vantage subscription",
    icon: "🕸️",
  },
];

const budgetComparison = [
  { provider: "Scraper API", role: "Base Yahoo Finance records", budget200: 15, budget2000: 50, note: "Scale to more instruments & refresh cycles" },
  { provider: "Financial Modeling Prep", role: "Fundamentals, WebSocket", budget200: 19, budget2000: 79, note: "Upgrade to Professional plan — faster WebSocket" },
  { provider: "Alpha Vantage", role: "Technical indicators", budget200: 29.99, budget2000: 249.99, note: "Premium plan: 600 req/min vs 150" },
  { provider: "Finnhub", role: "News, ratings", budget200: 0, budget2000: 50, note: "Move to Basic paid for real-time news stream" },
  { provider: "Polygon.io", role: "L2 Market Depth, WebSocket", budget200: 0, budget2000: 199, note: "Paid Starter — true L2 order book data" },
  { provider: "ORATS / Tradier", role: "Options Greeks, IV surfaces", budget200: 0, budget2000: 199, note: "NEW: Required for hedged risk model" },
  { provider: "Claude AI (Anthropic)", role: "All AI enrichment nodes", budget200: 65, budget2000: 350, note: "Regime detection + sentiment + execution logic" },
  { provider: "Databento", role: "L3 tick data backup", budget200: 0, budget2000: 150, note: "NEW: Nanosecond resolution for microstructure" },
  { provider: "Cloud Infrastructure", role: "Compute, Redis, DB", budget200: 31, budget2000: 200, note: "Upgrade from serverless to dedicated VPS" },
  { provider: "IBKR TWS API", role: "L2 futures + execution", budget200: 0, budget2000: 0, note: "Free with brokerage account — add immediately" },
];

const mergedNodes = [
  { n: "01", title: "INGEST", desc: "Scraper API base records + IBKR TWS WebSocket for futures L1/L2", color: "#0ea5e9", tag: null },
  { n: "02", title: "NULL TRIAGE", desc: "Waterfall null-routing logic — routes to cheapest provider that can fill each field", color: "#f59e0b", tag: "KEPT" },
  { n: "03", title: "ENRICHERS", desc: "FMP (fundamentals) + Alpha Vantage (technicals) + Finnhub (news) in parallel", color: "#10b981", tag: null },
  { n: "04", title: "L2 DEPTH", desc: "Polygon.io paid WebSocket streams real-time order book depth, bid/ask sizing", color: "#f43f5e", tag: "NEW" },
  { n: "05", title: "GREEKS NODE", desc: "ORATS/Tradier delivers Delta, Gamma, Theta, Vega, IV surface per instrument", color: "#f59e0b", tag: "NEW" },
  { n: "06", title: "REGIME AI", desc: "Claude classifies market as Trending/Mean-Reverting every 15min, switches strategy", color: "#a855f7", tag: "NEW" },
  { n: "07", title: "SENTIMENT AI", desc: "Claude scores news + insider + social sentiment, flags Black Swan events", color: "#a855f7", tag: "UPGRADED" },
  { n: "08", title: "CORRELATION", desc: "Rolling 20-day correlation matrix — rejects trades that push cluster risk above 0.7", color: "#0ea5e9", tag: "WIRED" },
  { n: "09", title: "CONFIDENCE GATE", desc: "72%+ composite score required. Now includes Greeks + regime as scoring factors", color: "#10b981", tag: "UPGRADED" },
  { n: "10", title: "EXECUTION AI", desc: "RL micro-node selects Limit vs Market order based on vol regime and spread width", color: "#f43f5e", tag: "NEW" },
  { n: "11", title: "CIRCUIT BREAKER", desc: "AI anomaly detector kills trading on fat-finger data, flash crashes, or 2% drawdown", color: "#ef4444", tag: "KEPT" },
];

const tagStyle = {
  "NEW": { bg: "rgba(244,63,94,0.15)", border: "rgba(244,63,94,0.4)", color: "#f43f5e" },
  "UPGRADED": { bg: "rgba(168,85,247,0.15)", border: "rgba(168,85,247,0.4)", color: "#a855f7" },
  "WIRED": { bg: "rgba(14,165,233,0.15)", border: "rgba(14,165,233,0.4)", color: "#0ea5e9" },
  "KEPT": { bg: "rgba(100,116,139,0.15)", border: "rgba(100,116,139,0.4)", color: "#64748b" },
};

const total200 = budgetComparison.reduce((s, r) => s + r.budget200, 0);
const total2000 = budgetComparison.reduce((s, r) => s + r.budget2000, 0);

export default function GapAnalysis() {
  const [tab, setTab] = useState("gaps");
  const [openGap, setOpenGap] = useState(null);

  return (
    <div style={{
      background: "#040810",
      minHeight: "100vh",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: "#e2e8f0",
    }}>
      {/* Grid bg */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1080, margin: "0 auto", padding: "32px 20px" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f43f5e", boxShadow: "0 0 10px #f43f5e" }} />
            <span style={{ color: "#f43f5e", fontSize: 10, letterSpacing: 4, textTransform: "uppercase" }}>
              GAP ANALYSIS — SYSTEM AUDIT
            </span>
          </div>
          <h1 style={{
            fontSize: "clamp(20px, 3.5vw, 32px)", fontWeight: 800, margin: 0,
            background: "linear-gradient(135deg, #f43f5e 0%, #a855f7 50%, #0ea5e9 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            WHAT WE MISSED. WHAT WE BORROW. WHAT WE MERGE.
          </h1>
          <p style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
            Cross-referencing our build against the alternative response · $200 → $2,000/mo investor reframe
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 28, flexWrap: "wrap" }}>
          {[
            { id: "gaps", label: "🔍 Gap Audit" },
            { id: "budget", label: "💰 $200 vs $2,000 Budget" },
            { id: "merged", label: "🔗 Merged Pipeline" },
            { id: "verdict", label: "⚖️ Final Verdict" },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "8px 16px", borderRadius: 6, border: "1px solid",
              fontSize: 11, cursor: "pointer", fontFamily: "inherit",
              borderColor: tab === t.id ? "#0ea5e9" : "#1e293b",
              background: tab === t.id ? "rgba(14,165,233,0.1)" : "transparent",
              color: tab === t.id ? "#0ea5e9" : "#64748b",
              transition: "all 0.2s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* ── GAP AUDIT TAB ── */}
        {tab === "gaps" && (
          <div>
            <div style={{
              padding: "14px 18px", marginBottom: 20,
              background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.2)",
              borderRadius: 10,
            }}>
              <div style={{ color: "#f43f5e", fontSize: 11, letterSpacing: 3, marginBottom: 6 }}>AUDIT SUMMARY</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                The alternative response surfaced <strong style={{ color: "#f1f5f9" }}>3 genuine gaps</strong> and
                <strong style={{ color: "#f1f5f9" }}> 2 underspecifications</strong> in our original build.
                We adopt all 5 with modifications. Our waterfall architecture, confidence gating, and roadmap are superior and are kept.
              </div>
            </div>
            <div style={{ display: "grid", gap: 12 }}>
              {gaps.map(g => (
                <div key={g.id}
                  onClick={() => setOpenGap(openGap === g.id ? null : g.id)}
                  style={{
                    border: "1px solid",
                    borderColor: openGap === g.id ? g.statusColor : "#1e293b",
                    borderRadius: 10, background: "#0a0f1a",
                    cursor: "pointer", overflow: "hidden",
                    transition: "border-color 0.2s",
                  }}>
                  <div style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{g.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{
                          fontSize: 9, padding: "2px 8px", borderRadius: 20, letterSpacing: 1,
                          background: `${g.statusColor}18`, border: `1px solid ${g.statusColor}40`, color: g.statusColor,
                        }}>{g.status}</span>
                        <span style={{ fontSize: 10, color: "#334155" }}>#{g.id}</span>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{g.title}</div>
                      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Our setup: {g.ourSetup}</div>
                    </div>
                    <div style={{ color: "#1e293b", fontSize: 16 }}>{openGap === g.id ? "▲" : "▼"}</div>
                  </div>

                  {openGap === g.id && (
                    <div style={{ borderTop: "1px solid #1e293b", padding: 18, display: "grid", gap: 14 }}>
                      <div style={{ padding: 14, background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.15)", borderRadius: 8 }}>
                        <div style={{ fontSize: 9, color: "#ef4444", letterSpacing: 2, marginBottom: 6 }}>THE PROBLEM</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>{g.problem}</div>
                      </div>
                      <div style={{ padding: 14, background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 8 }}>
                        <div style={{ fontSize: 9, color: "#10b981", letterSpacing: 2, marginBottom: 6 }}>THE FIX</div>
                        <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.7 }}>{g.fix}</div>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <span style={{
                          fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 6,
                          background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b",
                        }}>Additional Cost: {g.addedCost}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BUDGET TAB ── */}
        {tab === "budget" && (
          <div>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[
                { label: "$200/mo", sub: "Dev/MVP Budget", total: total200, color: "#64748b", note: "Yahoo scraper + free tiers. No L2, no Greeks. Good for paper trading." },
                { label: "$2,000/mo", sub: "Investor-Grade Budget", total: total2000, color: "#0ea5e9", note: "True L2 depth, Options Greeks, regime AI, dedicated compute. Institutional quality." },
              ].map(c => (
                <div key={c.label} style={{
                  padding: 20, borderRadius: 10, background: "#0a0f1a",
                  border: `1px solid ${c.color}40`,
                }}>
                  <div style={{ fontSize: 11, color: c.color, letterSpacing: 2, marginBottom: 4 }}>{c.sub}</div>
                  <div style={{ fontSize: 36, fontWeight: 900, color: c.color, fontFamily: "Cambria" }}>{c.label}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 4, lineHeight: 1.6 }}>{c.note}</div>
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #1e293b" }}>
                    <span style={{ fontSize: 10, color: "#334155" }}>Actual projected spend: </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: c.color }}>~${c.total.toFixed(0)}/mo</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ background: "#0a0f1a", borderRadius: 10, border: "1px solid #1e293b", overflow: "hidden" }}>
              <div style={{
                display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 2fr",
                padding: "10px 16px", background: "#0f172a",
                borderBottom: "1px solid #1e293b",
              }}>
                {["Provider", "Role", "$200/mo", "$2K/mo", "Upgrade Note"].map(h => (
                  <div key={h} style={{ fontSize: 9, color: "#0ea5e9", letterSpacing: 2 }}>{h}</div>
                ))}
              </div>
              {budgetComparison.map((row, i) => {
                const isNew = row.budget200 === 0 && row.budget2000 > 0;
                return (
                  <div key={i} style={{
                    display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 2fr",
                    padding: "12px 16px",
                    borderBottom: i < budgetComparison.length - 1 ? "1px solid #0f172a" : "none",
                    background: isNew ? "rgba(244,63,94,0.03)" : "transparent",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isNew ? "#f43f5e" : "#f1f5f9" }}>
                      {isNew && <span style={{ marginRight: 4, fontSize: 9, color: "#f43f5e" }}>★NEW</span>}
                      {row.provider}
                    </div>
                    <div style={{ fontSize: 10, color: "#64748b" }}>{row.role}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: row.budget200 === 0 ? "#334155" : "#94a3b8" }}>
                      {row.budget200 === 0 ? "—" : `$${row.budget200}`}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#0ea5e9" }}>
                      {row.budget2000 === 0 ? "Free" : `$${row.budget2000}`}
                    </div>
                    <div style={{ fontSize: 10, color: "#475569" }}>{row.note}</div>
                  </div>
                );
              })}
              {/* Totals */}
              <div style={{
                display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 2fr",
                padding: "14px 16px", background: "#0f172a", borderTop: "2px solid #1e293b",
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#f1f5f9", gridColumn: "1/3" }}>TOTAL</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#64748b" }}>${total200.toFixed(0)}</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: "#0ea5e9" }}>${total2000.toFixed(0)}</div>
                <div style={{ fontSize: 10, color: "#475569" }}>
                  {total2000 <= 2000 ? `✓ Within $2,000 budget` : `Over by $${(total2000 - 2000).toFixed(0)}`}
                </div>
              </div>
            </div>

            {/* Investor framing note */}
            <div style={{
              marginTop: 16, padding: 16,
              background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.2)",
              borderRadius: 10,
            }}>
              <div style={{ color: "#a855f7", fontSize: 10, letterSpacing: 3, marginBottom: 8 }}>INVESTOR FRAMING</div>
              <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.8 }}>
                Present the $2,000/mo to investors as <strong style={{ color: "#f1f5f9" }}>0.1–0.2% of a $1M–$2M AUM fund</strong>.
                Bloomberg Terminal alone costs $27,000/year. Our stack delivers comparable institutional-grade data
                for <strong style={{ color: "#a855f7" }}>$24,000/year</strong> — a 10× cost arbitrage that goes directly into alpha.
                The $200 version is a proof-of-concept. The $2,000 version is what you run with investor capital.
              </div>
            </div>
          </div>
        )}

        {/* ── MERGED PIPELINE TAB ── */}
        {tab === "merged" && (
          <div>
            <div style={{
              padding: "14px 18px", marginBottom: 20,
              background: "rgba(14,165,233,0.05)", border: "1px solid rgba(14,165,233,0.2)",
              borderRadius: 10, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8,
            }}>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Original pipeline: <strong style={{ color: "#f1f5f9" }}>6 nodes</strong> →
                Merged pipeline: <strong style={{ color: "#0ea5e9" }}>11 nodes</strong>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.entries(tagStyle).map(([tag, s]) => (
                  <span key={tag} style={{
                    fontSize: 9, padding: "2px 8px", borderRadius: 20,
                    background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                  }}>{tag}</span>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {mergedNodes.map((node, i) => {
                const ts = node.tag ? tagStyle[node.tag] : null;
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 18px", borderRadius: 10, background: "#0a0f1a",
                    border: `1px solid ${node.tag === "NEW" || node.tag === "UPGRADED" ? node.color + "30" : "#1e293b"}`,
                  }}>
                    {/* Number */}
                    <div style={{
                      width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                      background: `${node.color}15`, border: `1px solid ${node.color}35`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: node.color,
                    }}>{node.n}</div>
                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: node.color }}>{node.title}</span>
                        {ts && (
                          <span style={{
                            fontSize: 9, padding: "1px 7px", borderRadius: 20,
                            background: ts.bg, border: `1px solid ${ts.border}`, color: ts.color,
                          }}>{node.tag}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>{node.desc}</div>
                    </div>
                    {/* Connector */}
                    {i < mergedNodes.length - 1 && (
                      <div style={{ color: "#1e293b", fontSize: 20, flexShrink: 0 }}>↓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VERDICT TAB ── */}
        {tab === "verdict" && (
          <div style={{ display: "grid", gap: 14 }}>
            {/* Scorecards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Ideas Adopted", value: "5", sub: "L2, Greeks, Regime AI, RL Execution, Correlation wiring", color: "#f43f5e" },
                { label: "Our Advantages Kept", value: "4", sub: "Waterfall logic · 72% gate · 90-day roadmap · Investor deck", color: "#10b981" },
                { label: "Net New Nodes", value: "+5", sub: "Pipeline grows from 6 → 11 nodes. Materially stronger.", color: "#a855f7" },
              ].map((c, i) => (
                <div key={i} style={{ padding: 18, background: "#0a0f1a", border: `1px solid ${c.color}30`, borderRadius: 10 }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: c.color, fontFamily: "Cambria" }}>{c.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", margin: "4px 0" }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: "#475569", lineHeight: 1.6 }}>{c.sub}</div>
                </div>
              ))}
            </div>

            {/* Adopt / Keep / Drop table */}
            {[
              { action: "ADOPT FROM THEM", color: "#f43f5e", items: [
                "L2 Market Depth via Polygon.io paid (not free tier — that's L1 masquerading as L2)",
                "Options Greeks layer via ORATS/Tradier — essential for any insured/hedged position",
                "Regime Switching AI node — market state classification every 15 minutes",
                "RL-based Order Execution — Limit vs Market adaptive routing",
                "Waterfall triage framing (their naming for what we built — good terminology to use with investors)",
              ]},
              { action: "KEEP FROM OURS", color: "#10b981", items: [
                "72% composite confidence gate — they described thresholds conceptually but never quantified. Ours is better.",
                "6-factor scoring model (RSI alignment, volume, sentiment, R:R, regime, correlation)",
                "90-day phased implementation roadmap with capital gates",
                "Investor deck framing: 'Data Edge → Execution Edge → Risk Edge → Returns compound'",
                "Null-routing waterfall with actual code — they described it, we built it",
              ]},
              { action: "UPGRADE FROM BOTH", color: "#a855f7", items: [
                "$200/mo → $2,000/mo investor budget reframe (10× = institutional grade)",
                "Real-time correlation matrix now wired to Alpha Vantage OHLCV, not just listed as a field",
                "Claude AI budget increased: $65 → $350/mo to handle regime + sentiment + execution + anomaly nodes",
                "Infrastructure upgrade: serverless → dedicated VPS for sub-10ms pipeline latency",
                "Present Bloomberg cost comparison ($27K/yr vs $24K/yr) as the investor arbitrage story",
              ]},
            ].map(section => (
              <div key={section.action} style={{
                border: `1px solid ${section.color}25`,
                borderRadius: 10, background: "#0a0f1a", overflow: "hidden",
              }}>
                <div style={{
                  padding: "10px 18px", background: `${section.color}08`,
                  borderBottom: `1px solid ${section.color}20`,
                }}>
                  <span style={{ fontSize: 9, color: section.color, fontWeight: 700, letterSpacing: 3 }}>{section.action}</span>
                </div>
                <div style={{ padding: "12px 18px", display: "grid", gap: 8 }}>
                  {section.items.map((item, j) => (
                    <div key={j} style={{ display: "flex", gap: 10, fontSize: 11, color: "#94a3b8", lineHeight: 1.6 }}>
                      <span style={{ color: section.color, flexShrink: 0 }}>›</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Final confidence statement */}
            <div style={{
              padding: 20, borderRadius: 10,
              background: "linear-gradient(135deg, rgba(14,165,233,0.08) 0%, rgba(168,85,247,0.08) 100%)",
              border: "1px solid rgba(14,165,233,0.2)",
            }}>
              <div style={{ fontSize: 9, color: "#0ea5e9", letterSpacing: 3, marginBottom: 10 }}>SYSTEM CONFIDENCE ASSESSMENT</div>
              <div style={{ fontSize: 13, color: "#f1f5f9", lineHeight: 1.9 }}>
                The merged 11-node pipeline operating at <strong style={{ color: "#0ea5e9" }}>$2,000/mo</strong> is
                <strong style={{ color: "#10b981" }}> investor-presentable</strong> and technically credible.
                It covers every layer a skeptical institutional investor or risk officer would probe:
                microstructure data quality, options hedge coverage, regime adaptability, execution intelligence,
                and hard capital protection limits. No critical layer is missing.
                The remaining risk is <strong style={{ color: "#f59e0b" }}>execution discipline</strong> — the system
                can only be as good as the position sizing rules and the human oversight layer behind it.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
