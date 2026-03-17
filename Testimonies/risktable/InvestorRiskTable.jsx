import { useState } from "react";

// ── DESIGN SYSTEM (shared tokens) ─────────────────────────────
var INK        = "#0F172A";
var BODY       = "#1E293B";
var SUB        = "#475569";
var HINT       = "#64748B";
var WHITE      = "#FFFFFF";
var PAGE_BG    = "#F0F4FB";
var SURFACE    = "#F8FAFF";
var SURFACE_ALT= "#EEF2FF";
var BORDER     = "#E2E8F0";
var BORDER_MED = "#CBD5E1";
var BLUE       = "#1D4ED8";
var BLUE_SOFT  = "#EFF6FF";
var BLUE_MID   = "#BFDBFE";
var TEAL       = "#0D9488";
var TEAL_SOFT  = "#F0FDFA";
var TEAL_MID   = "#99F6E4";
var VIOLET     = "#6D28D9";
var VIOLET_SOFT= "#F5F3FF";
var AMBER      = "#B45309";
var AMBER_SOFT = "#FFFBEB";
var AMBER_MID  = "#FDE68A";
var ROSE       = "#BE123C";
var ROSE_SOFT  = "#FFF1F2";
var EMERALD    = "#065F46";
var EMERALD_SOFT="#ECFDF5";
var EMERALD_MID= "#A7F3D0";

var TC = [
  { a:"#64748B", s:"#F1F5F9", m:"#CBD5E1" },
  { a:"#92400E", s:"#FFFBEB", m:"#FDE68A" },
  { a:"#0369A1", s:"#F0F9FF", m:"#BAE6FD" },
  { a:"#0D9488", s:"#F0FDFA", m:"#99F6E4" },
  { a:"#6D28D9", s:"#F5F3FF", m:"#DDD6FE" },
  { a:"#9F1239", s:"#FFF1F2", m:"#FECDD3" },
];

// ── DATA ──────────────────────────────────────────────────────
var TIERS = [
  { budget:200,   label:"$200",  grade:"MVP",              tag:"Paper Trading",   winRate:0.60, rr:1.5,  tradesDay:6,  slip:0.0015, ef:0.78 },
  { budget:500,   label:"$500",  grade:"Early Live",       tag:"Small Fund",      winRate:0.63, rr:1.8,  tradesDay:8,  slip:0.0012, ef:0.80 },
  { budget:1000,  label:"$1K",   grade:"Semi-Pro",         tag:"L2 Unlocked",     winRate:0.66, rr:2.0,  tradesDay:10, slip:0.001,  ef:0.83 },
  { budget:2000,  label:"$2K",   grade:"Institutional",    tag:"Full 11-Node",    winRate:0.68, rr:2.4,  tradesDay:12, slip:0.0008, ef:0.86 },
  { budget:5000,  label:"$5K",   grade:"Professional",     tag:"Hedge Fund Grade",winRate:0.72, rr:2.8,  tradesDay:15, slip:0.0005, ef:0.90 },
  { budget:10000, label:"$10K",  grade:"Full Institutional",tag:"No Ceiling",     winRate:0.75, rr:3.2,  tradesDay:20, slip:0.0003, ef:0.93 },
];

var CAPITALS   = [1000, 2000, 5000, 10000, 25000, 50000];
var RISK_STEPS = [1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
var DAYS       = 21;

function calcROI(tier, capital, riskPct) {
  var pos   = capital * (riskPct / 100);
  var n     = tier.tradesDay * DAYS;
  var gross = (n * tier.winRate * pos * tier.rr) - (n * (1 - tier.winRate) * pos);
  var net   = Math.round((gross - n * pos * tier.slip) * tier.ef);
  var roi   = parseFloat(((net / capital) * 100).toFixed(1));
  var annual= Math.round(net * 12);
  var annROI= parseFloat(((annual / capital) * 100).toFixed(1));
  return { profit: net, roi: roi, annual: annual, annROI: annROI };
}

function roiColor(roi) {
  if (roi <= 0)  return { text:"#64748B", bg:"#F1F5F9", heat:0 };
  if (roi < 5)   return { text:"#92400E", bg:"#FFFBEB", heat:1 };
  if (roi < 12)  return { text:"#0369A1", bg:"#F0F9FF", heat:2 };
  if (roi < 25)  return { text:"#0D9488", bg:"#F0FDFA", heat:3 };
  if (roi < 50)  return { text:"#6D28D9", bg:"#F5F3FF", heat:4 };
  return { text:"#9F1239", bg:"#FFF1F2", heat:5 };
}

function fmt(n) {
  if (Math.abs(n) >= 1000) return "$" + (n / 1000).toFixed(1) + "K";
  return "$" + n.toLocaleString();
}

// ── SHARED CSS ────────────────────────────────────────────────
var CSS = [
  "@keyframes orb1{0%,100%{transform:translate(0,0)}50%{transform:translate(50px,70px)}}",
  "@keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-60px,-50px)}}",
  "@keyframes orb3{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-60px)}}",
  "@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}",
  "@keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.85)}}",
  "@keyframes modalIn{from{opacity:0;transform:scale(0.93)}to{opacity:1;transform:scale(1)}}",
  ".fade-up{animation:fadeUp 0.35s ease forwards}",
  ".hov{transition:transform 0.2s,box-shadow 0.2s}",
  ".hov:hover{transform:translateY(-3px);box-shadow:0 10px 36px rgba(15,23,42,0.12)!important}",
  ".row-hov:hover td{background:rgba(15,23,42,0.025)!important}",
  "::-webkit-scrollbar{width:5px;height:5px}",
  "::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}",
].join(" ");

// ── COMPONENTS ────────────────────────────────────────────────
function AnimBg() {
  return (
    <div style={{ position:"fixed", inset:0, zIndex:0, overflow:"hidden", pointerEvents:"none" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(#CBD5E1 1px, transparent 1px)", backgroundSize:"28px 28px", opacity:0.5 }} />
      <div style={{ position:"absolute", width:700, height:700, borderRadius:"50%", background:"radial-gradient(circle, rgba(191,219,254,0.3) 0%, transparent 65%)", top:-200, left:-150, animation:"orb1 20s ease-in-out infinite" }} />
      <div style={{ position:"absolute", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle, rgba(221,214,254,0.25) 0%, transparent 65%)", bottom:-150, right:-100, animation:"orb2 25s ease-in-out infinite" }} />
      <div style={{ position:"absolute", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(153,246,228,0.22) 0%, transparent 65%)", top:"45%", right:"20%", animation:"orb3 17s ease-in-out infinite" }} />
    </div>
  );
}

function Chip(props) {
  var pal = roiColor(props.roi);
  return (
    <span style={{ display:"inline-block", fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, color:pal.text, background:pal.bg, whiteSpace:"nowrap" }}>
      {props.roi}%
    </span>
  );
}

function TierPill(props) {
  var tc = TC[props.idx];
  var active = props.active;
  return (
    <div
      onClick={props.onClick}
      className="hov"
      style={{
        background: active ? tc.s : WHITE,
        border: (active ? 2 : 1) + "px solid " + (active ? tc.a : BORDER),
        borderRadius:12, padding:"10px 14px", cursor:"pointer",
        boxShadow: active ? "0 4px 18px " + tc.a + "33" : "0 1px 3px rgba(15,23,42,0.05)",
        transition:"all 0.2s", textAlign:"center",
      }}
    >
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginBottom:4 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:tc.a, animation: active ? "blink 2s infinite" : "none" }} />
        <span style={{ fontSize:9, fontWeight:700, color:tc.a, letterSpacing:0.4 }}>{props.tier.grade}</span>
      </div>
      <div style={{ fontSize:17, fontWeight:800, color:INK, fontFamily:"Georgia, serif", lineHeight:1 }}>{props.tier.label}</div>
      <div style={{ fontSize:9, color:HINT, marginTop:2 }}>/mo infra</div>
    </div>
  );
}

function RiskSlider(props) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {RISK_STEPS.map(function(r) {
        var active = r === props.value;
        return (
          <button
            key={r}
            onClick={function() { props.onChange(r); }}
            style={{
              padding:"7px 16px", borderRadius:99, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
              border: "1.5px solid " + (active ? VIOLET : BORDER_MED),
              background: active ? VIOLET_SOFT : WHITE,
              color: active ? VIOLET : SUB,
              boxShadow: active ? "0 0 0 3px rgba(109,40,217,0.15)" : "none",
            }}
          >
            {r}%
          </button>
        );
      })}
    </div>
  );
}

function CapitalSelector(props) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {CAPITALS.map(function(cap) {
        var active = cap === props.value;
        return (
          <button
            key={cap}
            onClick={function() { props.onChange(cap); }}
            style={{
              padding:"7px 16px", borderRadius:99, fontSize:12, fontWeight:700,
              cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
              border: "1.5px solid " + (active ? TEAL : BORDER_MED),
              background: active ? TEAL_SOFT : WHITE,
              color: active ? TEAL : SUB,
              boxShadow: active ? "0 0 0 3px rgba(13,148,136,0.15)" : "none",
            }}
          >
            ${cap >= 1000 ? (cap / 1000) + "K" : cap}
          </button>
        );
      })}
    </div>
  );
}

// ── MODAL: Full Journey Detail ────────────────────────────────
function JourneyModal(props) {
  if (!props.open) return null;
  var tier     = props.tier;
  var tc       = TC[props.tierIdx];
  var capital  = props.capital;
  var riskPct  = props.riskPct;
  var sc       = calcROI(tier, capital, riskPct);
  var pal      = roiColor(sc.roi);

  // 12-month compounding journey
  var months = [];
  var running = capital;
  for (var m = 1; m <= 12; m++) {
    var mSc  = calcROI(tier, running, riskPct);
    running  = running + mSc.profit;
    months.push({ month: m, profit: mSc.profit, balance: running, roi: mSc.roi });
  }
  var totalGain   = running - capital;
  var totalROI    = parseFloat(((totalGain / capital) * 100).toFixed(1));

  return (
    <div
      onClick={props.onClose}
      style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(15,23,42,0.5)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20, overflowY:"auto" }}
    >
      <div
        onClick={function(e) { e.stopPropagation(); }}
        style={{ background:WHITE, borderRadius:20, width:"100%", maxWidth:620, boxShadow:"0 32px 80px rgba(15,23,42,0.2)", animation:"modalIn 0.22s ease", overflow:"hidden", margin:"auto" }}
      >
        {/* Header */}
        <div style={{ background:tc.s, padding:"22px 24px", borderBottom:"1.5px solid " + tc.m }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:tc.a, letterSpacing:0.6, marginBottom:6 }}>
                {tier.grade} &bull; ${capital.toLocaleString()} CAPITAL &bull; {riskPct}% RISK/TRADE
              </div>
              <div style={{ fontSize:11, color:SUB, marginBottom:8 }}>12-month compounding journey</div>
              <div style={{ display:"flex", alignItems:"baseline", gap:12 }}>
                <div>
                  <div style={{ fontSize:9, color:HINT, marginBottom:2 }}>Monthly profit (flat)</div>
                  <div style={{ fontSize:28, fontWeight:800, color:INK, fontFamily:"Georgia, serif", lineHeight:1 }}>{fmt(sc.profit)}</div>
                </div>
                <div style={{ width:1, height:36, background:BORDER }} />
                <div>
                  <div style={{ fontSize:9, color:HINT, marginBottom:2 }}>12-mo compounded gain</div>
                  <div style={{ fontSize:28, fontWeight:800, color:pal.text, fontFamily:"Georgia, serif", lineHeight:1 }}>{fmt(totalGain)}</div>
                </div>
                <div style={{ width:1, height:36, background:BORDER }} />
                <div>
                  <div style={{ fontSize:9, color:HINT, marginBottom:2 }}>Total ROI</div>
                  <div style={{ fontSize:28, fontWeight:800, color:TEAL, fontFamily:"Georgia, serif", lineHeight:1 }}>{totalROI}%</div>
                </div>
              </div>
            </div>
            <button
              onClick={props.onClose}
              style={{ background:WHITE, border:"1px solid " + BORDER_MED, borderRadius:8, width:34, height:34, cursor:"pointer", color:SUB, fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
            >
              &#x2715;
            </button>
          </div>
        </div>

        {/* Month-by-month table */}
        <div style={{ padding:"20px 24px" }}>
          <div style={{ fontSize:10, fontWeight:700, color:SUB, letterSpacing:0.5, marginBottom:12 }}>
            COMPOUNDING MONTH-BY-MONTH (profits reinvested each month)
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:SURFACE }}>
                  {["Month","Starting Capital","Monthly Profit","ROI","Closing Balance"].map(function(h) {
                    return <th key={h} style={{ padding:"8px 12px", fontSize:10, fontWeight:700, color:HINT, textAlign:"left", borderBottom:"1px solid " + BORDER, whiteSpace:"nowrap" }}>{h}</th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {months.map(function(row, idx) {
                  var startBal = idx === 0 ? capital : months[idx - 1].balance;
                  var rp = roiColor(row.roi);
                  var isLast = idx === 11;
                  return (
                    <tr key={row.month} style={{ borderBottom:"1px solid " + BORDER, background: isLast ? TEAL_SOFT : WHITE }}>
                      <td style={{ padding:"9px 12px", fontWeight: isLast ? 700 : 400, color: isLast ? TEAL : BODY }}>
                        {isLast ? "Month 12" : "Month " + row.month}
                      </td>
                      <td style={{ padding:"9px 12px", color:SUB }}>${Math.round(startBal).toLocaleString()}</td>
                      <td style={{ padding:"9px 12px", fontWeight:700, color:pal.text }}>{fmt(row.profit)}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:99, color:rp.text, background:rp.bg }}>{row.roi}%</span>
                      </td>
                      <td style={{ padding:"9px 12px", fontWeight:700, color: isLast ? TEAL : INK }}>${Math.round(row.balance).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Testimony prompt */}
          <div style={{ marginTop:16, padding:"14px 16px", borderRadius:12, background:VIOLET_SOFT, border:"1px solid " + VIOLET + "33" }}>
            <div style={{ fontSize:10, fontWeight:700, color:VIOLET, letterSpacing:0.5, marginBottom:6 }}>INVESTOR TESTIMONY TEMPLATE</div>
            <div style={{ fontSize:12, color:BODY, lineHeight:1.8, fontStyle:"italic" }}>
              "I started with ${capital.toLocaleString()} on the {tier.grade} tier, running {riskPct}% risk per trade.
              By month 3 I had grown my account to {fmt(months[2].balance)}, and by end of year my balance
              was {fmt(months[11].balance)} &mdash; a {totalROI}% return on my initial capital.
              The {tier.tradesDay} trades per day with a {(tier.winRate * 100).toFixed(0)}% win rate
              is exactly what the system delivered."
            </div>
          </div>
        </div>

        <div style={{ padding:"12px 24px", borderTop:"1px solid " + BORDER, fontSize:10, color:HINT }}>
          Compounding assumes monthly profits are fully reinvested. Illustrative only. Not financial advice.
        </div>
      </div>
    </div>
  );
}

// ── HEAT CELL ─────────────────────────────────────────────────
function HeatCell(props) {
  var sc  = props.sc;
  var pal = roiColor(sc.roi);
  var isSelected = props.selected;
  return (
    <td
      onClick={props.onClick}
      style={{
        padding:"10px 8px", textAlign:"center", cursor:"pointer",
        background: isSelected ? pal.bg : WHITE,
        border: isSelected ? "1.5px solid " + pal.text : "none",
        transition:"background 0.15s",
        borderBottom:"1px solid " + BORDER,
        borderRight:"1px solid " + BORDER,
      }}
    >
      <div style={{ fontSize:12, fontWeight:700, color: sc.profit <= 0 ? HINT : INK }}>{fmt(sc.profit)}</div>
      <div style={{ marginTop:3 }}>
        <Chip roi={sc.roi} />
      </div>
      <div style={{ fontSize:9, color:HINT, marginTop:3 }}>{fmt(sc.annual)}/yr</div>
    </td>
  );
}

// ── MAIN ──────────────────────────────────────────────────────
export default function InvestorRiskTable() {
  var tierState    = useState(3);
  var activeTierIdx= tierState[0];
  var setActiveTierIdx = tierState[1];

  var riskState   = useState(2);
  var activeRisk  = riskState[0];
  var setActiveRisk = riskState[1];

  var capState    = useState(5000);
  var activeCap   = capState[0];
  var setActiveCap= capState[1];

  var modalState  = useState(false);
  var modalOpen   = modalState[0];
  var setModalOpen= modalState[1];

  var viewState   = useState("full");
  var view        = viewState[0];
  var setView     = viewState[1];

  var selectedState = useState(null);
  var selectedCell  = selectedState[0];
  var setSelectedCell = selectedState[1];

  var tier = TIERS[activeTierIdx];
  var tc   = TC[activeTierIdx];

  // Spotlight: single capital + all risks
  var spotlightRows = RISK_STEPS.map(function(r) {
    return { risk: r, sc: calcROI(tier, activeCap, r) };
  });

  return (
    <div style={{ background:PAGE_BG, minHeight:"100vh", color:BODY, fontFamily:"Inter, sans-serif" }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <AnimBg />

      <div style={{ position:"relative", zIndex:1, maxWidth:1200, margin:"0 auto", padding:"32px 20px" }}>

        {/* ── HEADER ── */}
        <div className="fade-up" style={{ marginBottom:36 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ display:"flex", gap:5 }}>
              {[TEAL, BLUE, VIOLET].map(function(c, i) {
                return <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:c, animation:"blink " + (1.6 + i * 0.35) + "s " + (i * 0.15) + "s infinite" }} />;
              })}
            </div>
            <span style={{ fontSize:11, fontWeight:700, color:HINT, letterSpacing:0.5 }}>
              INVESTOR RISK MATRIX &bull; ROI PROJECTIONS &bull; JOURNEY PLANNER
            </span>
          </div>
          <h1 style={{ fontSize:42, fontWeight:800, color:INK, margin:0, fontFamily:"Georgia, serif", lineHeight:1.15 }}>
            Risk &amp; Return Matrix
          </h1>
          <p style={{ fontSize:14, color:SUB, marginTop:8, lineHeight:1.65, maxWidth:620 }}>
            Select your infrastructure tier, starting capital, and risk percentage per trade.
            The matrix shows your projected monthly profit, ROI, and annual return across all combinations.
            Click any cell to open your full 12-month compounding journey.
          </p>
        </div>

        {/* ── TIER SELECTOR ── */}
        <div style={{ marginBottom:22 }}>
          <div style={{ fontSize:10, fontWeight:700, color:HINT, letterSpacing:0.8, marginBottom:10 }}>
            1. SELECT INFRASTRUCTURE TIER
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap:8 }}>
            {TIERS.map(function(t, i) {
              return (
                <TierPill
                  key={i} idx={i} tier={t}
                  active={i === activeTierIdx}
                  onClick={function() { setActiveTierIdx(i); }}
                />
              );
            })}
          </div>
        </div>

        {/* ── TIER STATS ── */}
        <div style={{ background:WHITE, borderRadius:16, padding:"16px 20px", marginBottom:22, border:"1.5px solid " + tc.m, boxShadow:"0 4px 24px " + tc.a + "18" }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:20, alignItems:"center" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:99, color:tc.a, background:tc.s, border:"1px solid " + tc.m }}>{tier.grade}</span>
              <span style={{ fontSize:10, padding:"3px 10px", borderRadius:99, color:SUB, background:SURFACE_ALT, border:"1px solid " + BORDER }}>{tier.tag}</span>
            </div>
            {[
              { l:"Win Rate",    v:(tier.winRate * 100).toFixed(0) + "%", c:tc.a },
              { l:"R:R Ratio",   v:"1 : " + tier.rr,                      c:AMBER },
              { l:"Trades/Day",  v:tier.tradesDay,                         c:BLUE },
              { l:"Slippage",    v:(tier.slip * 10000).toFixed(1) + " bps", c:HINT },
              { l:"Infra Cost",  v:"$" + tier.budget.toLocaleString() + "/mo", c:ROSE },
            ].map(function(s) {
              return (
                <div key={s.l} style={{ display:"flex", flexDirection:"column", gap:2 }}>
                  <span style={{ fontSize:9, color:HINT, fontWeight:600 }}>{s.l}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:s.c }}>{s.v}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── VIEW TOGGLE ── */}
        <div style={{ display:"flex", gap:6, marginBottom:20, alignItems:"center" }}>
          <div style={{ fontSize:10, fontWeight:700, color:HINT, letterSpacing:0.5, marginRight:8 }}>VIEW:</div>
          {[["full","Full Risk x Capital Matrix"],["spotlight","Single Capital Deep Dive"]].map(function(tab) {
            var id = tab[0], lbl = tab[1];
            var active = view === id;
            return (
              <button
                key={id}
                onClick={function() { setView(id); }}
                style={{
                  padding:"8px 20px", borderRadius:99, fontSize:12, fontWeight:700,
                  cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s",
                  border:"1.5px solid " + (active ? tc.a : BORDER_MED),
                  background: active ? tc.s : WHITE,
                  color: active ? tc.a : SUB,
                  boxShadow: active ? "0 0 0 3px " + tc.a + "22" : "none",
                }}
              >
                {lbl}
              </button>
            );
          })}
        </div>

        {/* ── FULL MATRIX VIEW ── */}
        {view === "full" && (
          <div className="fade-up">
            {/* Risk selector */}
            <div style={{ background:WHITE, borderRadius:16, padding:"16px 20px", marginBottom:14, border:"1px solid " + BORDER }}>
              <div style={{ fontSize:10, fontWeight:700, color:HINT, letterSpacing:0.5, marginBottom:10 }}>
                2. FILTER BY RISK % (highlights column)
              </div>
              <RiskSlider value={activeRisk} onChange={setActiveRisk} />
            </div>

            {/* Matrix table */}
            <div style={{ background:WHITE, borderRadius:16, border:"1px solid " + BORDER, overflow:"hidden", boxShadow:"0 2px 12px rgba(15,23,42,0.07)", marginBottom:14 }}>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", minWidth:700 }}>
                  <thead>
                    <tr style={{ background:SURFACE }}>
                      <th style={{ padding:"12px 14px", fontSize:10, fontWeight:700, color:HINT, textAlign:"left", borderBottom:"1px solid " + BORDER, borderRight:"1px solid " + BORDER, whiteSpace:"nowrap", minWidth:90 }}>
                        RISK &darr; / CAPITAL &rarr;
                      </th>
                      {CAPITALS.map(function(cap) {
                        return (
                          <th key={cap} style={{ padding:"12px 14px", fontSize:11, fontWeight:700, color:INK, textAlign:"center", borderBottom:"1px solid " + BORDER, borderRight:"1px solid " + BORDER, whiteSpace:"nowrap" }}>
                            ${cap >= 1000 ? (cap / 1000) + "K" : cap}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {RISK_STEPS.map(function(risk) {
                      var isActiveRisk = risk === activeRisk;
                      return (
                        <tr key={risk} className="row-hov" style={{ background: isActiveRisk ? AMBER_SOFT : WHITE }}>
                          <td style={{ padding:"10px 14px", borderBottom:"1px solid " + BORDER, borderRight:"1px solid " + BORDER, whiteSpace:"nowrap" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                              <div style={{ width:3, height:24, borderRadius:2, background: isActiveRisk ? AMBER : BORDER }} />
                              <div>
                                <div style={{ fontSize:14, fontWeight:800, color: isActiveRisk ? AMBER : INK }}>{risk}%</div>
                                <div style={{ fontSize:9, color:HINT }}>risk/trade</div>
                              </div>
                            </div>
                          </td>
                          {CAPITALS.map(function(cap) {
                            var sc = calcROI(tier, cap, risk);
                            var isSelected = selectedCell && selectedCell.risk === risk && selectedCell.cap === cap;
                            return (
                              <HeatCell
                                key={cap} sc={sc} selected={isSelected}
                                onClick={function() {
                                  setSelectedCell({ risk:risk, cap:cap });
                                  setActiveRisk(risk);
                                  setActiveCap(cap);
                                  setModalOpen(true);
                                }}
                              />
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:14 }}>
              <span style={{ fontSize:10, color:HINT, fontWeight:700 }}>ROI COLOUR LEGEND:</span>
              {[
                { label:"0-5%",    text:"#92400E", bg:"#FFFBEB" },
                { label:"5-12%",   text:"#0369A1", bg:"#F0F9FF" },
                { label:"12-25%",  text:"#0D9488", bg:"#F0FDFA" },
                { label:"25-50%",  text:"#6D28D9", bg:"#F5F3FF" },
                { label:"50%+",    text:"#9F1239", bg:"#FFF1F2" },
              ].map(function(l) {
                return (
                  <span key={l.label} style={{ fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:99, color:l.text, background:l.bg }}>
                    {l.label}
                  </span>
                );
              })}
              <span style={{ fontSize:10, color:HINT }}>&bull; Click any cell for 12-month journey</span>
            </div>

            <div style={{ padding:"12px 16px", borderRadius:12, background:WHITE, border:"1px solid " + BORDER, fontSize:11, color:SUB, lineHeight:1.7 }}>
              Each cell shows: monthly profit / monthly ROI % / annual projection. Values use {tier.tradesDay} trades/day, {(tier.winRate*100).toFixed(0)}% win rate, 1:{tier.rr} R:R, {(tier.slip*10000).toFixed(1)}bps slippage, {Math.round((1-tier.ef)*100)}% error haircut.{" "}
              <strong style={{ color:ROSE }}>Not financial advice.</strong>
            </div>
          </div>
        )}

        {/* ── SPOTLIGHT VIEW: single capital, all risks ── */}
        {view === "spotlight" && (
          <div className="fade-up">
            <div style={{ background:WHITE, borderRadius:16, padding:"16px 20px", marginBottom:14, border:"1px solid " + BORDER }}>
              <div style={{ fontSize:10, fontWeight:700, color:HINT, letterSpacing:0.5, marginBottom:10 }}>
                2. SELECT STARTING CAPITAL
              </div>
              <CapitalSelector value={activeCap} onChange={setActiveCap} />
            </div>

            {/* Spotlight header stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginBottom:16 }}>
              {[
                { l:"Capital",      v:"$" + activeCap.toLocaleString(),                           c:TEAL },
                { l:"Best monthly", v:fmt(calcROI(tier, activeCap, 5).profit),                    c:"#9F1239", sub:"at 5% risk" },
                { l:"Best annual",  v:fmt(calcROI(tier, activeCap, 5).annual),                    c:VIOLET,    sub:"at 5% risk" },
                { l:"Conservative", v:fmt(calcROI(tier, activeCap, 1.5).profit) + "/mo",          c:BLUE,      sub:"at 1.5% risk" },
              ].map(function(s) {
                return (
                  <div key={s.l} style={{ background:WHITE, borderRadius:14, padding:"14px 16px", border:"1px solid " + BORDER, boxShadow:"0 1px 4px rgba(15,23,42,0.06)" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:HINT, letterSpacing:0.5, marginBottom:6 }}>{s.l}</div>
                    <div style={{ fontSize:22, fontWeight:800, color:s.c, fontFamily:"Georgia, serif", lineHeight:1 }}>{s.v}</div>
                    {s.sub && <div style={{ fontSize:11, color:SUB, marginTop:4 }}>{s.sub}</div>}
                  </div>
                );
              })}
            </div>

            {/* Detailed table for selected capital */}
            <div style={{ background:WHITE, borderRadius:16, border:"1px solid " + BORDER, overflow:"hidden", boxShadow:"0 2px 12px rgba(15,23,42,0.07)", marginBottom:14 }}>
              <div style={{ padding:"16px 20px", borderBottom:"1px solid " + BORDER }}>
                <div style={{ fontSize:12, fontWeight:700, color:INK }}>
                  All risk levels &mdash; ${activeCap.toLocaleString()} capital &mdash; {tier.grade} tier
                </div>
                <div style={{ fontSize:11, color:SUB, marginTop:2 }}>Click any row to open your 12-month compounding journey</div>
              </div>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:SURFACE }}>
                    {["Risk %","Position Size","Monthly Profit","Monthly ROI","Annual Profit","Annual ROI","Journey"].map(function(h) {
                      return <th key={h} style={{ padding:"10px 14px", fontSize:10, fontWeight:700, color:HINT, textAlign:"left", borderBottom:"1px solid " + BORDER, whiteSpace:"nowrap" }}>{h}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {spotlightRows.map(function(row) {
                    var sc  = row.sc;
                    var pal = roiColor(sc.roi);
                    var isActive = row.risk === activeRisk;
                    var posSize  = Math.round(activeCap * row.risk / 100);
                    return (
                      <tr
                        key={row.risk}
                        className="row-hov"
                        style={{ borderBottom:"1px solid " + BORDER, background: isActive ? pal.bg + "60" : WHITE, cursor:"pointer" }}
                        onClick={function() {
                          setActiveRisk(row.risk);
                          setSelectedCell({ risk:row.risk, cap:activeCap });
                          setModalOpen(true);
                        }}
                      >
                        <td style={{ padding:"12px 14px" }}>
                          <span style={{ fontSize:16, fontWeight:800, color: isActive ? pal.text : INK }}>{row.risk}%</span>
                          {isActive && <span style={{ marginLeft:6, fontSize:9, color:pal.text, fontWeight:700 }}>SELECTED</span>}
                        </td>
                        <td style={{ padding:"12px 14px", fontSize:12, color:SUB }}>${posSize.toLocaleString()}</td>
                        <td style={{ padding:"12px 14px" }}>
                          <span style={{ fontSize:15, fontWeight:700, color: sc.profit <= 0 ? HINT : INK }}>{fmt(sc.profit)}</span>
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <Chip roi={sc.roi} />
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <span style={{ fontSize:14, fontWeight:700, color:pal.text }}>{fmt(sc.annual)}</span>
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <span style={{ fontSize:12, fontWeight:700, color:pal.text }}>{sc.annROI}%</span>
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          <span style={{ fontSize:11, fontWeight:700, color:tc.a, padding:"4px 10px", borderRadius:99, background:tc.s, border:"1px solid " + tc.m, cursor:"pointer", whiteSpace:"nowrap" }}>
                            View journey &rarr;
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Visual bar comparison */}
            <div style={{ background:WHITE, borderRadius:16, padding:"20px 24px", border:"1px solid " + BORDER, boxShadow:"0 2px 12px rgba(15,23,42,0.07)" }}>
              <div style={{ fontSize:10, fontWeight:700, color:HINT, letterSpacing:0.5, marginBottom:16 }}>MONTHLY PROFIT BY RISK LEVEL</div>
              {spotlightRows.map(function(row) {
                var sc  = row.sc;
                var pal = roiColor(sc.roi);
                var maxP = calcROI(tier, activeCap, 5).profit;
                var pct  = maxP > 0 ? Math.max(2, (sc.profit / maxP) * 100) : 2;
                return (
                  <div key={row.risk} style={{ marginBottom:14 }} onClick={function() { setActiveRisk(row.risk); setSelectedCell({ risk:row.risk, cap:activeCap }); setModalOpen(true); }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <span style={{ fontSize:13, fontWeight:800, color:pal.text, minWidth:36 }}>{row.risk}%</span>
                        <span style={{ fontSize:11, color:HINT }}>risk per trade</span>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <Chip roi={sc.roi} />
                        <span style={{ fontSize:16, fontWeight:800, color:INK, fontFamily:"Georgia, serif" }}>{fmt(sc.profit)}/mo</span>
                      </div>
                    </div>
                    <div style={{ height:10, background:SURFACE_ALT, borderRadius:99, overflow:"hidden", cursor:"pointer" }}>
                      <div style={{ height:"100%", width:pct + "%", background:pal.text, borderRadius:99, transition:"width 0.5s ease" }} />
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", marginTop:3, fontSize:9, color:HINT }}>
                      <span>Position size: ${Math.round(activeCap * row.risk / 100).toLocaleString()}</span>
                      <span>Annual: {fmt(sc.annual)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DISCLAIMER ── */}
        <div style={{ marginTop:28, padding:"14px 18px", borderRadius:14, background:WHITE, border:"1px solid " + BORDER, display:"flex", alignItems:"flex-start", gap:12 }}>
          <div style={{ width:18, height:18, borderRadius:"50%", background:AMBER_SOFT, border:"1.5px solid " + AMBER, flexShrink:0, marginTop:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:AMBER }}>!</div>
          <div style={{ fontSize:11, color:SUB, lineHeight:1.75 }}>
            <strong style={{ color:BODY }}>Risk model:</strong> Position size = capital x risk%. {DAYS} trading days/month. Gross = (wins x reward) minus (losses x risk). Slippage and error haircut applied. Higher risk amplifies both gains and losses &mdash; risk management is your responsibility.{" "}
            <strong style={{ color:ROSE }}>Illustrative projections only. Not financial advice. Past performance does not guarantee future results.</strong>
          </div>
        </div>

      </div>

      {/* JOURNEY MODAL */}
      <JourneyModal
        open={modalOpen}
        tier={tier}
        tierIdx={activeTierIdx}
        capital={activeCap}
        riskPct={activeRisk}
        onClose={function() { setModalOpen(false); }}
      />
    </div>
  );
}
