const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('c:/Users/saviour/Documents/Wilbak/Orthom8pro/Results/BUSINESS_CONTEXT_UPDATED_1.csv');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const businesses = {};
  
  for await (const line of rl) {
    if (!line.trim()) continue;
    
    // Simple CSV parser for quoted strings
    const row = [];
    let curVal = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            row.push(curVal);
            curVal = '';
        } else {
            curVal += char;
        }
    }
    row.push(curVal);

    if (row.length < 3 || !row[0]) continue;
    const biz = row[0];
    const param = row[1];
    const val = row[2];
    const note = row.length > 3 ? row[3] : "";
    
    if (biz === "Business_Name") continue;
    if (!businesses[biz]) {
      businesses[biz] = {};
    }
    businesses[biz][param] = { value: val, note: note };
  }

  const htmlContent = `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Business Context | Ortho'M8</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Fira+Code:wght@300;400;500&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="/Orthom8pro/shared-nav.css">
  <script src="/Orthom8pro/shared-nav.js"></script>

  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>

  <style>
    [x-cloak] { display: none !important; }
    
    .hero-section {
      padding: 12rem 0 6rem;
      text-align: center;
      position: relative;
    }

    .biz-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 2rem;
      padding: 2rem 0 6rem;
    }

    .biz-card {
      background: var(--surface-bg);
      border: 1px solid var(--brand-rule-strong);
      border-radius: 4px;
      overflow: hidden;
      transition: all 0.3s ease;
      cursor: pointer;
    }

    .biz-card:hover {
      border-color: var(--brand-cobalt);
      transform: translateY(-4px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }

    .biz-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--brand-rule);
      background: rgba(11,19,37,0.4);
    }

    .biz-name {
      font-family: 'Playfair Display', serif;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--tx-main);
    }

    .biz-type {
      font-family: 'Fira Code', monospace;
      font-size: 10px;
      color: var(--brand-gold-light);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-top: 0.5rem;
    }

    .biz-body {
      padding: 1.5rem;
    }

    .data-row {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px dashed var(--brand-rule);
    }

    .data-row:last-child {
      border-bottom: none;
    }

    .data-label {
      font-size: 12px;
      color: var(--tx-muted);
      font-weight: 500;
    }

    .data-value {
      font-family: 'IBM Plex Mono', monospace;
      font-size: 13px;
      color: var(--tx-main);
      font-weight: 600;
      text-align: right;
      max-width: 60%;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(6, 12, 24, 0.8);
      backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem;
    }

    .modal-content {
      background: var(--surface-bg);
      border: 1px solid var(--brand-rule-strong);
      width: 100%;
      max-width: 900px;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }

    .modal-close {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
      background: none;
      border: none;
      color: var(--tx-sub);
      font-size: 1.5rem;
      cursor: pointer;
      transition: color 0.2s;
    }
    
    .modal-close:hover {
      color: var(--brand-gold-light);
    }

    .modal-header {
      padding: 2.5rem;
      border-bottom: 1px solid var(--brand-rule-strong);
      background: rgba(11,19,37,0.6);
    }

    .modal-body {
      padding: 2.5rem;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
    }

    @media (max-width: 768px) {
      .detail-grid { grid-template-columns: 1fr; gap: 1.5rem; }
      .modal-content { max-height: 100vh; height: 100vh; max-width: 100%; border: none; }
      .modal-overlay { padding: 0; }
    }

    .detail-group {
        margin-bottom: 1.5rem;
    }

    .detail-label {
        font-family: 'Fira Code', monospace;
        font-size: 10px;
        color: var(--brand-cobalt);
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 0.5rem;
    }

    .detail-value {
        font-size: 15px;
        color: var(--tx-main);
        line-height: 1.6;
    }
    
    .detail-note {
        font-size: 12px;
        color: var(--tx-muted);
        margin-top: 0.35rem;
        font-style: italic;
    }
    
    .pill {
        display: inline-block;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        font-family: 'Fira Code', monospace;
        font-size: 10px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        margin-right: 0.5rem;
        margin-bottom: 0.5rem;
    }
  </style>
</head>
<body x-data="businessContextData()">

<div id="app">
  <div id="site-nav-root"></div>

  <main class="layout-container">
    <section class="hero-section anim-slide-up">
      <span class="text-eyebrow" style="justify-content:center; margin-bottom:1.5rem;">Market Intelligence</span>
      <h1 class="hero-heading" style="color:var(--tx-main); font-family: 'Playfair Display', serif; font-size: clamp(2rem, 4vw, 3.2rem); font-weight: 600; line-height: 1.1; letter-spacing: -0.02em;">
        Business <em>Context</em> <br><strong>Parameters.</strong>
      </h1>
      <p class="body-text" style="max-width:640px; margin: 1.5rem auto 0; font-size: 15px; line-height: 1.75; color: var(--tx-sub);">
        Review institutional framework configurations across multiple enterprise sectors. Click on any business to view their detailed risk and operational metrics.
      </p>
    </section>

    <!-- Grid of Businesses -->
    <div class="biz-grid">
      <template x-for="(biz, name, index) in businesses" :key="name">
        <div class="biz-card anim-slide-up" :style="'animation-delay: ' + (index * 0.1) + 's'" @click="openModal(name)">
          <div class="biz-header">
            <h3 class="biz-name" x-text="name.replace(/_/g, ' ')"></h3>
            <div class="biz-type" x-text="(biz.Business_Size ? biz.Business_Size.value : '') + ' Enterprise'"></div>
          </div>
          <div class="biz-body">
            <div class="data-row">
              <span class="data-label">Starting Capital</span>
              <span class="data-value" x-text="biz.Starting_Capital_USD ? biz.Starting_Capital_USD.value : ''"></span>
            </div>
            <div class="data-row">
              <span class="data-label">Risk Tolerance</span>
              <span class="data-value" x-text="biz.Risk_Tolerance ? biz.Risk_Tolerance.value : ''"></span>
            </div>
            <div class="data-row">
              <span class="data-label">Annual Goal</span>
              <span class="data-value" style="color: #27C93F;" x-text="biz.Annual_Return_Goal ? biz.Annual_Return_Goal.value : ''"></span>
            </div>
            <div class="data-row">
              <span class="data-label">Break Even Req.</span>
              <span class="data-value" style="color: var(--brand-gold-light);" x-text="biz.Break_Even_Return_Required ? biz.Break_Even_Return_Required.value : ''"></span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </main>

  <div id="site-footer-root"></div>

  <!-- Modal -->
  <div class="modal-overlay" x-show="isModalOpen" x-transition.opacity x-cloak>
    <div class="modal-content" @click.away="closeModal()" x-show="isModalOpen" x-transition:enter="transition ease-out duration-300" x-transition:enter-start="opacity-0 transform translate-y-4" x-transition:enter-end="opacity-100 transform translate-y-0">
      <button class="modal-close" @click="closeModal()">✕</button>
      
      <template x-if="selectedBiz">
        <div>
          <div class="modal-header">
            <span class="text-eyebrow" style="margin-bottom:0.75rem;" x-text="businesses[selectedBiz].Market_Position ? businesses[selectedBiz].Market_Position.value : ''"></span>
            <h2 class="section-heading" style="font-size: 2.5rem; margin-bottom: 0.5rem; font-family: 'Playfair Display', serif;" x-text="selectedBiz.replace(/_/g, ' ')"></h2>
            <div>
              <span class="pill" x-text="businesses[selectedBiz].Growth_Phase ? businesses[selectedBiz].Growth_Phase.value : ''"></span>
              <span class="pill" x-text="businesses[selectedBiz].Revenue_Model ? businesses[selectedBiz].Revenue_Model.value + ' Revenue' : ''"></span>
            </div>
          </div>
          
          <div class="modal-body">
            <div class="detail-grid">
              
              <!-- Column 1: Financials -->
              <div>
                <h4 class="text-eyebrow" style="margin-bottom: 2rem; color: var(--tx-main); border-bottom: 1px solid var(--brand-rule-strong); padding-bottom: 0.5rem; display: inline-block;">Financial Parameters</h4>
                
                <div class="detail-group">
                  <div class="detail-label">Starting Capital</div>
                  <div class="detail-value mono text-lg" x-text="businesses[selectedBiz].Starting_Capital_USD.value"></div>
                </div>
                
                <div class="detail-group">
                  <div class="detail-label">Annual Return Goal</div>
                  <div class="detail-value mono text-lg" style="color: #27C93F;" x-text="businesses[selectedBiz].Annual_Return_Goal.value"></div>
                </div>

                <div class="detail-group">
                  <div class="detail-label">Monthly Running Cost</div>
                  <div class="detail-value mono" x-text="businesses[selectedBiz].Monthly_Running_Cost_USD.value + ' (' + businesses[selectedBiz].Monthly_Running_Cost_Pct.value + ')'"></div>
                  <div class="detail-note" x-text="businesses[selectedBiz].Monthly_Running_Cost_Pct.note"></div>
                </div>
                
                <div class="detail-group">
                  <div class="detail-label">Annual Running Cost</div>
                  <div class="detail-value mono" x-text="businesses[selectedBiz].Annual_Running_Cost_USD.value"></div>
                  <div class="detail-note" x-text="businesses[selectedBiz].Annual_Running_Cost_USD.note"></div>
                </div>
                
                <div class="detail-group">
                  <div class="detail-label">Net Capital After Year 1 Cost</div>
                  <div class="detail-value mono" style="color:#27C93F;" x-text="businesses[selectedBiz].Net_Capital_After_Year1_Cost.value"></div>
                  <div class="detail-note" x-text="businesses[selectedBiz].Net_Capital_After_Year1_Cost.note"></div>
                </div>
              </div>
              
              <!-- Column 2: Risk & Operations -->
              <div>
                <h4 class="text-eyebrow" style="margin-bottom: 2rem; color: var(--tx-main); border-bottom: 1px solid var(--brand-rule-strong); padding-bottom: 0.5rem; display: inline-block;">Operational Risk & Strategy</h4>
                
                <div class="detail-group">
                  <div class="detail-label">Risk Tolerance & Drawdown</div>
                  <div class="detail-value" x-text="businesses[selectedBiz].Risk_Tolerance.value + ' / Max ' + businesses[selectedBiz].Maximum_Drawdown.value"></div>
                  <div class="detail-note" x-text="businesses[selectedBiz].Maximum_Drawdown.note"></div>
                </div>

                <div class="detail-group">
                  <div class="detail-label">Hedge Strategy</div>
                  <div class="detail-value" x-text="businesses[selectedBiz].Hedge_Instruments.value"></div>
                  <div class="detail-note" x-text="'Ratio: ' + businesses[selectedBiz].Hedge_Ratio.value + ' | Frequency: ' + businesses[selectedBiz].Hedge_Frequency.value"></div>
                </div>
                
                <div class="detail-group">
                  <div class="detail-label">Market Sensitivity</div>
                  <div class="detail-value" x-text="businesses[selectedBiz].Market_Sensitivity.value"></div>
                  <div class="detail-note" x-text="businesses[selectedBiz].Market_Sensitivity.note"></div>
                </div>
                
                <div class="detail-group">
                  <div class="detail-label">Key Drivers</div>
                  <div class="detail-value" x-text="businesses[selectedBiz].Key_Drivers.value"></div>
                </div>
                
                <div class="detail-group">
                  <div class="detail-label">Running Cost Breakdown (Year 1 Projection)</div>
                  <div class="detail-value" style="font-size: 13px;" x-text="businesses[selectedBiz].Running_Cost_Breakdown.value"></div>
                </div>
                
                <div class="detail-group">
                  <div class="detail-label">Exit Strategy</div>
                  <div class="detail-value" x-text="businesses[selectedBiz].Exit_Strategy.value"></div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </template>
    </div>
  </div>

</div>

<script>
  const bizData = \` + JSON.stringify(businesses) + \`;
  
  document.addEventListener('alpine:init', () => {
    Alpine.data('businessContextData', () => ({
      businesses: JSON.parse(bizData),
      isModalOpen: false,
      selectedBiz: null,
      
      openModal(name) {
        this.selectedBiz = name;
        this.isModalOpen = true;
        document.body.style.overflow = 'hidden';
      },
      closeModal() {
        this.isModalOpen = false;
        setTimeout(() => {
            this.selectedBiz = null;
            document.body.style.overflow = '';
        }, 300);
      }
    }));
  });
</script>

</body>
</html>
\`

  try {
      if (!fs.existsSync('c:/Users/saviour/Documents/Wilbak/Orthom8pro/business-context')) {
        fs.mkdirSync('c:/Users/saviour/Documents/Wilbak/Orthom8pro/business-context');
      }
      fs.writeFileSync('c:/Users/saviour/Documents/Wilbak/Orthom8pro/business-context/index.html', htmlContent);
      console.log('Successfully generated business-context/index.html');
  } catch (err) {
      console.error(err);
  }
}

processLineByLine();
