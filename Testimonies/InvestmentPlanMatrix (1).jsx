import { useState } from "react";

const C = {
  pageBg:"#F0F4FB", white:"#FFFFFF", surface:"#F8FAFF", surfaceAlt:"#EEF2FF",
  border:"#E2E8F0", borderMed:"#CBD5E1",
  ink:"#0F172A", body:"#1E293B", sub:"#475569", hint:"#64748B",
  blue:"#1D4ED8", blueSoft:"#EFF6FF", blueMid:"#BFDBFE",
  teal:"#0D9488", tealSoft:"#F0FDFA", tealMid:"#99F6E4",
  violet:"#6D28D9", violetSoft:"#F5F3FF", violetMid:"#DDD6FE",
  amber:"#B45309", amberSoft:"#FFFBEB", amberMid:"#FDE68A",
  rose:"#BE123C", roseSoft:"#FFF1F2", roseMid:"#FECDD3",
  t0:"#64748B", t0s:"#F1F5F9", t0m:"#CBD5E1",
  t1:"#92400E", t1s:"#FFFBEB", t1m:"#FDE68A",
  t2:"#0369A1", t2s:"#F0F9FF", t2m:"#BAE6FD",
  t3:"#0D9488", t3s:"#F0FDFA", t3m:"#99F6E4",
  t4:"#6D28D9", t4s:"#F5F3FF", t4m:"#DDD6FE",
  t5:"#9F1239", t5s:"#FFF1F2", t5m:"#FECDD3",
};

const TC = [
  {a:C.t0,s:C.t0s,m:C.t0m},{a:C.t1,s:C.t1s,m:C.t1m},
  {a:C.t2,s:C.t2s,m:C.t2m},{a:C.t3,s:C.t3s,m:C.t3m},
  {a:C.t4,s:C.t4s,m:C.t4m},{a:C.t5,s:C.t5s,m:C.t5m},
];

const TIERS = [
  { budget:200,   label:"$200",  grade:"MVP",           tag:"Paper Trading",
    desc:"Free-tier APIs only. L1 quotes, basic AI sentiment. Pure proof-of-concept before committing live capital.",
    specs:["Scraper API ~$15","Finnhub free","FMP Starter $19","Alpha Vantage $30","Claude AI ~$65","Polygon free"],
    caps:["6 pipeline nodes","L1 data only","Basic sentiment","72% gate","Manual breaker","Paper only"],
    winRate:0.60,rr:1.5,tradesDay:6, slip:0.0015,ef:0.78},
  { budget:500,   label:"$500",  grade:"Early Live",    tag:"Small Fund",
    desc:"Real-time news stream and paid technical indicators. Still L1 constrained. Suitable for small live accounts.",
    specs:["Scraper API $25","Finnhub paid $50","FMP Pro $49","AV $100","Claude AI $120","Polygon free"],
    caps:["7 pipeline nodes","Real-time news","Tech indicators","Sentiment scoring","Soft breaker","Live possible"],
    winRate:0.63,rr:1.8,tradesDay:8, slip:0.0012,ef:0.80},
  { budget:1000,  label:"$1K",   grade:"Semi-Pro",      tag:"L2 Unlocked",
    desc:"True L2 order book active. Correlation matrix wired. Regime detection classifying every 15 minutes.",
    specs:["Polygon paid L2 $150","FMP Pro $79","AV Premium $100","Claude AI $200","Regime AI","Correlation guard"],
    caps:["9 pipeline nodes","True L2 depth","Regime switching","Correlation guard","Hard breaker","10 trades/day"],
    winRate:0.66,rr:2.0,tradesDay:10,slip:0.001, ef:0.83},
  { budget:2000,  label:"$2K",   grade:"Institutional", tag:"Full 11-Node",
    desc:"Options Greeks via ORATS. RL execution node live. Complete 11-node pipeline. Investor-presentable.",
    specs:["ORATS Greeks $199","Polygon paid $199","Databento $150","Claude AI $350","RL execution","Audit trail"],
    caps:["11 pipeline nodes","Options Greeks","RL execution","Full audit","AI anomaly","12 trades/day"],
    winRate:0.68,rr:2.4,tradesDay:12,slip:0.0008,ef:0.86},
  { budget:5000,  label:"$5K",   grade:"Professional",  tag:"Hedge Fund Grade",
    desc:"Bloomberg-equivalent stack. Multi-asset coverage. Dedicated VPS with co-location latency advantage.",
    specs:["Bloomberg alt $1200","ORATS full $399","Dedicated VPS $500","Claude AI $600","Co-location","Multi-asset"],
    caps:["Full + redundancy","L2/L3 data","Multi-asset","Co-location","Prop signals","15 trades/day"],
    winRate:0.72,rr:2.8,tradesDay:15,slip:0.0005,ef:0.90},
  { budget:10000, label:"$10K",  grade:"Full Institutional",tag:"No Ceiling",
    desc:"Nanosecond tick data, L3 order flow, HFT-lite routing, full hot-standby redundancy.",
    specs:["Databento L3 $800","Bloomberg alt $1200","Claude AI $1200","IBKR SmartRoute","Hot standby $1500","Multi-jurisdiction"],
    caps:["L3 tick data","HFT-lite exec","Prop AI signals","Full redundancy","Multi-jurisdiction","20 trades/day"],
    winRate:0.75,rr:3.2,tradesDay:20,slip:0.0003,ef:0.93},
];

const CAPS = [1000,2000,5000,10000];
const DAYS = 21;

function calc(t,cap){
  const pos=cap*0.02, n=t.tradesDay*DAYS;
  const gross=(n*t.winRate*pos*t.rr)-(n*(1-t.winRate)*pos);
  const net=Math.round((gross-n*pos*t.slip)*t.ef);
  const roi=parseFloat(((net/cap)*100).toFixed(1));
  return{profit:net,roi,low:Math.round(net*.72),high:Math.round(net*1.28),annual:Math.round(net*12)};
}

function roiPalette(roi){
  if(roi<8)  return{text:C.t1,bg:C.t1s,mid:C.t1m};
  if(roi<20) return{text:C.t3,bg:C.t3s,mid:C.t3m};
  if(roi<40) return{text:C.blue,bg:C.blueSoft,mid:C.blueMid};
  return{text:C.t5,bg:C.t5s,mid:C.t5m};
}

function Spark({tier,tc}){
  const profits=CAPS.map(c=>Math.max(0,calc(tier,c).profit));
  const mx=Math.max(...profits);
  const W=130,H=34;
  const pts=profits.map((p,i)=>({x:(i/(profits.length-1))*W,y:mx===0?H:H-(p/mx)*(H-4)-2}));
  const d=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return(
    <svg width={W} height={H} style={{display:"block",overflow:"visible"}}>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={tc.a} fillOpacity={.12}/>
      <path d={d} fill="none" stroke={tc.a} strokeWidth={2} strokeLinejoin="round"/>
      {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={3} fill={C.white} stroke={tc.a} strokeWidth={1.5}/>)}
    </svg>
  );
}

function Bar({pct,color,h=6}){
  return(
    <div style={{height:h,background:C.surfaceAlt,borderRadius:99,overflow:"hidden"}}>
      <div style={{height:"100%",width:`${Math.min(100,Math.max(1,pct))}%`,background:color,borderRadius:99,transition:"width .6s ease"}}/>
    </div>
  );
}

function Chip({roi}){
  const{text,bg}=roiPalette(roi);
  return<span style={{display:"inline-block",fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:99,color:text,background:bg}}>{roi}%/mo</span>;
}

function Modal({sc,tier,tc,capital,onClose}){
  if(!sc)return null;
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(15,23,42,.5)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.white,borderRadius:20,width:"100%",maxWidth:520,boxShadow:"0 32px 80px rgba(15,23,42,.2)",animation:"modalIn .22s ease",overflow:"hidden"}}>
        {/* header */}
        <div style={{background:tc.s,padding:"22px 24px",borderBottom:`1.5px solid ${tc.m}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,color:tc.a,letterSpacing:.6,marginBottom:6}}>{tier.grade} TIER · ${capital.toLocaleString()} CAPITAL</div>
              <div style={{fontSize:32,fontWeight:800,color:C.ink,fontFamily:"'Georgia',serif",lineHeight:1}}>${sc.profit.toLocaleString()}<span style={{fontSize:14,fontWeight:500,color:C.sub,marginLeft:6}}>/month</span></div>
              <div style={{fontSize:12,color:C.sub,marginTop:5}}>Range: ${sc.low.toLocaleString()} – ${sc.high.toLocaleString()}&ensp;·&ensp;<Chip roi={sc.roi}/></div>
            </div>
            <button onClick={onClose} style={{background:C.white,border:`1px solid ${C.borderMed}`,borderRadius:8,width:34,height:34,cursor:"pointer",color:C.sub,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
          </div>
        </div>
        {/* body */}
        <div style={{padding:"20px 24px"}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:18}}>
            {[["Monthly ROI",`${sc.roi}%`,roiPalette(sc.roi).text],["Annual",`$${sc.annual.toLocaleString()}`,C.blue],["Infra/mo",`$${tier.budget.toLocaleString()}`,C.sub],["Win Rate",`${(tier.winRate*100).toFixed(0)}%`,C.teal],["Risk:Reward",`1 : ${tier.rr}`,C.violet],["Trades/Day",tier.tradesDay,C.ink]].map(([l,v,c])=>(
              <div key={l} style={{background:C.surface,borderRadius:10,padding:"10px 12px",border:`1px solid ${C.border}`}}>
                <div style={{fontSize:9,color:C.hint,marginBottom:3,fontWeight:600,letterSpacing:.3}}>{l}</div>
                <div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{background:C.surfaceAlt,borderRadius:12,padding:"14px 16px",marginBottom:16}}>
            <div style={{fontSize:10,fontWeight:700,color:C.sub,letterSpacing:.5,marginBottom:10}}>CALCULATION INPUTS</div>
            {[["Position size","2% of capital per trade"],["Trading days","21 days / month"],["Slippage",`${(tier.slip*10000).toFixed(1)} bps per trade`],["Error haircut",`${Math.round((1-tier.ef)*100)}% noise reduction applied`],["AI gate","72% composite score required"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                <span style={{color:C.sub}}>{k}</span>
                <span style={{color:C.body,fontWeight:600}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,fontWeight:700,color:C.sub,letterSpacing:.5,marginBottom:8}}>CAPABILITIES AT THIS TIER</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {tier.caps.map(c=><span key={c} style={{fontSize:11,padding:"4px 10px",borderRadius:99,background:tc.s,color:tc.a,border:`1px solid ${tc.m}`,fontWeight:500}}>{c}</span>)}
          </div>
        </div>
        <div style={{padding:"12px 24px",borderTop:`1px solid ${C.border}`,fontSize:10,color:C.hint}}>
          Illustrative projections only · Not financial advice · Infrastructure costs separate from IBKR capital
        </div>
      </div>
    </div>
  );
}

export default function InvestmentPlanMatrix(){
  const[activeTier,setActiveTier]=useState(3);
  const[view,setView]=useState("matrix");
  const[modal,setModal]=useState(null);
  const[activeCap,setActiveCap]=useState(1);
  const[animKey,setAnimKey]=useState(0);

  const tier=TIERS[activeTier], tc=TC[activeTier];

  const changeTier=i=>{setActiveTier(i);setAnimKey(k=>k+1);};

  return(
    <div style={{background:C.pageBg,minHeight:"100vh",color:C.body,fontFamily:"'Inter','Segoe UI',system-ui,sans-serif"}}>

      {/* Animated background */}
      <div style={{position:"fixed",inset:0,zIndex:0,overflow:"hidden",pointerEvents:"none"}}>
        <div style={{position:"absolute",inset:0,backgroundImage:"radial-gradient(#CBD5E1 1px,transparent 1px)",backgroundSize:"28px 28px",opacity:.5}}/>
        <div style={{position:"absolute",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,#BFDBFE50 0%,transparent 65%)",top:-200,left:-150,animation:"orb1 20s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,#DDD6FE40 0%,transparent 65%)",bottom:-150,right:-100,animation:"orb2 25s ease-in-out infinite"}}/>
        <div style={{position:"absolute",width:400,height:400,borderRadius:"50%",background:"radial-gradient(circle,#99F6E438 0%,transparent 65%)",top:"45%",right:"20%",animation:"orb3 17s ease-in-out infinite"}}/>
      </div>

      <style>{`
        @keyframes orb1{0%,100%{transform:translate(0,0)}50%{transform:translate(50px,70px)}}
        @keyframes orb2{0%,100%{transform:translate(0,0)}50%{transform:translate(-60px,-50px)}}
        @keyframes orb3{0%,100%{transform:translate(0,0)}50%{transform:translate(40px,-60px)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
        @keyframes modalIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}
        .fade-up{animation:fadeUp .35s ease forwards}
        .hov{transition:transform .2s,box-shadow .2s}
        .hov:hover{transform:translateY(-3px);box-shadow:0 10px 36px rgba(15,23,42,.12)!important}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:3px}
      `}</style>

      <div style={{position:"relative",zIndex:1,maxWidth:1080,margin:"0 auto",padding:"32px 20px"}}>

        {/* ── HEADER ── */}
        <div className="fade-up" style={{marginBottom:36}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{display:"flex",gap:5}}>
              {[C.t3,C.blue,C.t4].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:c,animation:`blink ${1.6+i*.35}s ${i*.15}s infinite`}}/>)}
            </div>
            <span style={{fontSize:11,fontWeight:700,color:C.hint,letterSpacing:.5}}>IBKR API · AI PIPELINE · MONTHLY PROJECTIONS</span>
          </div>
          <h1 style={{fontSize:"clamp(26px,4vw,44px)",fontWeight:800,color:C.ink,margin:0,fontFamily:"'Georgia','Cambria',serif",lineHeight:1.15}}>
            Investment Plan Matrix
          </h1>
          <p style={{fontSize:14,color:C.sub,marginTop:8,lineHeight:1.65,maxWidth:560}}>
            6 infrastructure budget tiers × 4 IBKR starting capital levels. Error-adjusted monthly profit projections with ±28% scenario range.
          </p>
          {/* Summary stat row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:22}}>
            {[["Best Monthly","$9,740","$10K tier · $10K capital",C.t5],["Min Capital","$1,000","IBKR funded account",C.t3],["AI Gate","72%+","Confidence required",C.blue],["Trading Days","21/mo","5 days × ~4.2 wks",C.t4]].map(([l,v,s,a])=>(
              <div key={l} style={{background:C.white,borderRadius:14,padding:"16px 18px",border:`1px solid ${C.border}`,boxShadow:"0 1px 4px rgba(15,23,42,.06)"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.hint,letterSpacing:.5,marginBottom:6}}>{l}</div>
                <div style={{fontSize:24,fontWeight:800,color:a,fontFamily:"'Georgia',serif",lineHeight:1}}>{v}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:4}}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TIER SELECTOR ── */}
        <div style={{marginBottom:22}}>
          <div style={{fontSize:10,fontWeight:700,color:C.hint,letterSpacing:.8,marginBottom:10}}>SELECT INFRASTRUCTURE TIER</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:8}}>
            {TIERS.map((t,i)=>{
              const ttc=TC[i],active=i===activeTier;
              return(
                <div key={i} onClick={()=>changeTier(i)} className="hov" style={{
                  background:active?ttc.s:C.white,border:`${active?2:1}px solid ${active?ttc.a:C.border}`,
                  borderRadius:14,padding:"13px 14px",cursor:"pointer",
                  boxShadow:active?`0 4px 18px ${ttc.a}22`:"0 1px 3px rgba(15,23,42,.05)",transition:"all .2s"
                }}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:6}}>
                    <div style={{width:7,height:7,borderRadius:"50%",background:ttc.a,flexShrink:0,animation:active?"blink 2s infinite":"none"}}/>
                    <span style={{fontSize:9,fontWeight:700,color:ttc.a,letterSpacing:.4}}>{t.grade}</span>
                  </div>
                  <div style={{fontSize:20,fontWeight:800,color:C.ink,fontFamily:"'Georgia',serif",lineHeight:1}}>{t.label}</div>
                  <div style={{fontSize:9,color:C.hint,marginTop:2}}>/mo infra</div>
                  <div style={{fontSize:10,color:C.sub,marginTop:5,lineHeight:1.4}}>{t.tag}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── ACTIVE TIER BANNER ── */}
        <div key={`banner-${animKey}`} className="fade-up" style={{
          background:C.white,borderRadius:16,padding:"20px 24px",marginBottom:22,
          border:`1.5px solid ${tc.m}`,boxShadow:`0 4px 28px ${tc.a}18`
        }}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:20,alignItems:"start"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:99,color:tc.a,background:tc.s,border:`1px solid ${tc.m}`}}>{tier.grade}</span>
                <span style={{fontSize:10,fontWeight:600,padding:"3px 10px",borderRadius:99,color:C.sub,background:C.surfaceAlt,border:`1px solid ${C.border}`}}>{tier.tag}</span>
              </div>
              <div style={{fontSize:14,color:C.body,lineHeight:1.65,marginBottom:12}}>{tier.desc}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {tier.specs.map(s=><span key={s} style={{fontSize:11,padding:"3px 10px",borderRadius:99,background:tc.s,color:tc.a,border:`1px solid ${tc.m}`,fontWeight:500}}>{s}</span>)}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:7,minWidth:160}}>
              {[["Win Rate",`${(tier.winRate*100).toFixed(0)}%`,tc.a],["Risk/Reward",`1 : ${tier.rr}`,C.amber],["Trades/Day",tier.tradesDay,C.blue],["Slippage",`${(tier.slip*10000).toFixed(1)} bps`,C.hint],["Error Buffer",`${Math.round((1-tier.ef)*100)}% haircut`,C.hint]].map(([l,v,c])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,paddingBottom:6,borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:11,color:C.hint}}>{l}</span>
                  <span style={{fontSize:12,fontWeight:700,color:c}}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── VIEW TABS ── */}
        <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
          {[["matrix","◫ Scenario Cards"],["table","⊞ Full Table"],["compare","⇄ Compare All"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>setView(id)} style={{
              padding:"8px 20px",borderRadius:99,border:"1.5px solid",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",
              borderColor:view===id?tc.a:C.borderMed,background:view===id?tc.s:C.white,
              color:view===id?tc.a:C.sub,boxShadow:view===id?`0 0 0 3px ${tc.a}18`:"none"
            }}>{lbl}</button>
          ))}
        </div>

        {/* ── SCENARIO CARDS ── */}
        {view==="matrix"&&(
          <div key={`m-${animKey}`} className="fade-up">
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:14,marginBottom:16}}>
              {CAPS.map(cap=>{
                const sc=calc(tier,cap);
                const maxP=calc(TIERS[5],cap).profit;
                const{text:rt}=roiPalette(sc.roi);
                return(
                  <div key={cap} onClick={()=>setModal({sc,capital:cap})} className="hov" style={{
                    background:C.white,borderRadius:16,padding:"20px 18px",border:`1px solid ${C.border}`,
                    cursor:"pointer",boxShadow:"0 1px 4px rgba(15,23,42,.06)"
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:12}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:C.hint,letterSpacing:.5,marginBottom:4}}>${cap.toLocaleString()} CAPITAL</div>
                        <div style={{fontSize:28,fontWeight:800,color:C.ink,fontFamily:"'Georgia',serif",lineHeight:1}}>${sc.profit.toLocaleString()}</div>
                        <div style={{fontSize:10,color:C.sub,marginTop:3}}>${sc.low.toLocaleString()} – ${sc.high.toLocaleString()}</div>
                      </div>
                      <Chip roi={sc.roi}/>
                    </div>
                    <Bar pct={(sc.profit/maxP)*100} color={tc.a}/>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:12}}>
                      <div>
                        <div style={{fontSize:9,color:C.hint,marginBottom:2}}>Annual</div>
                        <div style={{fontSize:14,fontWeight:700,color:rt}}>${sc.annual.toLocaleString()}</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:9,color:C.hint,marginBottom:2}}>Infra covered?</div>
                        <div style={{fontSize:11,fontWeight:700,color:sc.profit>tier.budget?C.teal:C.amber}}>
                          {sc.profit>tier.budget?"✓ Yes":"⚠ Scale up"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{padding:"12px 16px",borderRadius:12,background:C.white,border:`1px solid ${C.border}`,fontSize:11,color:C.sub,lineHeight:1.7}}>
              Click any card to open the full scenario breakdown modal. Range ±28% accounts for drawdown, bad signal days, and latency. <strong style={{color:C.rose}}>Not financial advice.</strong>
            </div>
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {view==="table"&&(
          <div key={`t-${animKey}`} className="fade-up">
            <div style={{background:C.white,borderRadius:16,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:"0 2px 10px rgba(15,23,42,.06)"}}>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:560}}>
                  <thead>
                    <tr style={{background:C.surface}}>
                      <th style={{padding:"14px 18px",fontSize:11,fontWeight:700,color:C.hint,letterSpacing:.5,textAlign:"left",borderBottom:`1px solid ${C.border}`}}>TIER / CAPITAL →</th>
                      {CAPS.map(cap=><th key={cap} style={{padding:"14px 16px",fontSize:12,fontWeight:700,color:C.ink,textAlign:"center",borderBottom:`1px solid ${C.border}`,whiteSpace:"nowrap"}}>${cap.toLocaleString()}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {TIERS.map((t,ti)=>{
                      const ttc=TC[ti],isA=ti===activeTier;
                      return(
                        <tr key={ti} style={{background:isA?ttc.s:C.white,borderBottom:`1px solid ${C.border}`,cursor:"pointer",transition:"background .15s"}} onClick={()=>changeTier(ti)}>
                          <td style={{padding:"14px 18px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <div style={{width:9,height:9,borderRadius:"50%",background:ttc.a,flexShrink:0}}/>
                              <div>
                                <div style={{fontSize:13,fontWeight:700,color:ttc.a}}>{t.label}/mo</div>
                                <div style={{fontSize:10,color:C.hint}}>{t.grade}</div>
                              </div>
                            </div>
                          </td>
                          {CAPS.map((cap,ci)=>{
                            const sc=calc(t,cap);
                            const{text:rt,bg:rb}=roiPalette(sc.roi);
                            return(
                              <td key={ci} style={{padding:"12px 16px",textAlign:"center",background:isA?`${ttc.a}08`:"transparent"}}
                                onClick={e=>{e.stopPropagation();changeTier(ti);setModal({sc,capital:cap});}}>
                                <div style={{fontSize:15,fontWeight:700,color:C.ink}}>${sc.profit.toLocaleString()}</div>
                                <span style={{fontSize:10,padding:"1px 7px",borderRadius:99,background:rb,color:rt,fontWeight:700}}>{sc.roi}%</span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div style={{marginTop:10,fontSize:11,color:C.hint,padding:"10px 14px",background:C.white,borderRadius:10,border:`1px solid ${C.border}`}}>
              Click a row to select that tier · Click a cell to open the scenario detail modal
            </div>
          </div>
        )}

        {/* ── COMPARE VIEW ── */}
        {view==="compare"&&(
          <div key="cmp" className="fade-up">
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              <span style={{fontSize:10,fontWeight:700,color:C.hint,letterSpacing:.5}}>IBKR CAPITAL:</span>
              {CAPS.map((cap,ci)=>(
                <button key={ci} onClick={()=>setActiveCap(ci)} style={{
                  padding:"6px 18px",borderRadius:99,border:"1.5px solid",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",transition:"all .2s",
                  borderColor:ci===activeCap?C.blue:C.borderMed,background:ci===activeCap?C.blueSoft:C.white,
                  color:ci===activeCap?C.blue:C.sub
                }}>${cap.toLocaleString()}</button>
              ))}
            </div>

            {/* Horizontal bars */}
            <div style={{background:C.white,borderRadius:16,padding:"22px 24px",border:`1px solid ${C.border}`,boxShadow:"0 2px 10px rgba(15,23,42,.06)",marginBottom:14}}>
              <div style={{fontSize:10,fontWeight:700,color:C.hint,letterSpacing:.5,marginBottom:18}}>
                MONTHLY PROFIT COMPARISON — ${CAPS[activeCap].toLocaleString()} CAPITAL
              </div>
              {TIERS.map((t,i)=>{
                const sc=calc(t,CAPS[activeCap]);
                const maxP=calc(TIERS[5],CAPS[activeCap]).profit;
                const pct=Math.max(2,(sc.profit/maxP)*100);
                const ttc=TC[i];
                const{text:rt}=roiPalette(sc.roi);
                return(
                  <div key={i} style={{marginBottom:20,cursor:"pointer"}} onClick={()=>changeTier(i)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:7}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div style={{width:10,height:10,borderRadius:"50%",background:ttc.a,flexShrink:0}}/>
                        <span style={{fontSize:13,fontWeight:700,color:ttc.a}}>{t.label}/mo</span>
                        <span style={{fontSize:11,color:C.hint}}>{t.grade}</span>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <Chip roi={sc.roi}/>
                        <span style={{fontSize:18,fontWeight:800,color:C.ink,fontFamily:"'Georgia',serif"}}>${sc.profit.toLocaleString()}</span>
                      </div>
                    </div>
                    <Bar pct={pct} color={ttc.a} h={10}/>
                    <div style={{display:"flex",justifyContent:"space-between",marginTop:5,fontSize:10,color:C.hint}}>
                      <span>Range ${sc.low.toLocaleString()} – ${sc.high.toLocaleString()}</span>
                      <span>Annual: ${sc.annual.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sparkline grid */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
              {TIERS.map((t,i)=>{
                const ttc=TC[i];
                const sc=calc(t,CAPS[activeCap]);
                return(
                  <div key={i} className="hov" onClick={()=>{changeTier(i);setView("matrix");}} style={{
                    background:C.white,borderRadius:14,padding:"14px 16px",border:`1px solid ${C.border}`,cursor:"pointer"
                  }}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",marginBottom:8}}>
                      <div>
                        <div style={{fontSize:10,fontWeight:700,color:ttc.a,letterSpacing:.3}}>{t.label}/mo</div>
                        <div style={{fontSize:20,fontWeight:700,color:C.ink,fontFamily:"'Georgia',serif"}}>${sc.profit.toLocaleString()}</div>
                      </div>
                      <Chip roi={sc.roi}/>
                    </div>
                    <Spark tier={t} tc={ttc}/>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:C.hint,marginTop:4}}>
                      {CAPS.map(c=><span key={c}>${c>=1000?(c/1000)+"k":c}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── DISCLAIMER ── */}
        <div style={{marginTop:28,padding:"14px 18px",borderRadius:14,background:C.white,border:`1px solid ${C.border}`,display:"flex",alignItems:"start",gap:12}}>
          <div style={{width:18,height:18,borderRadius:"50%",background:C.amberSoft,border:`1.5px solid ${C.amber}`,flexShrink:0,marginTop:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:C.amber}}>!</div>
          <div style={{fontSize:11,color:C.sub,lineHeight:1.75}}>
            <strong style={{color:C.body}}>Calculation model:</strong> 2% position size · {DAYS} trading days · Gross = (wins × reward) − (losses × risk) · Slippage deducted per trade · Error haircut 22% ($200) → 7% ($10K) · Range ±28% for drawdown, bad signals, API latency. Infrastructure costs paid separately from IBKR capital.{" "}
            <strong style={{color:C.rose}}>Illustrative projections only. Not financial advice.</strong>
          </div>
        </div>

      </div>

      {/* MODAL */}
      {modal&&<Modal sc={modal.sc} tier={tier} tc={tc} capital={modal.capital} onClose={()=>setModal(null)}/>}
    </div>
  );
}
