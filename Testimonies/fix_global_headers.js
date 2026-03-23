const fs = require('fs');
const path = require('path');

const E = {
    '01': '<svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>',
    '02': '<svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" /></svg>',
    '03': '<svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg>',
    '04': '<svg class="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>',
    '05': '<svg class="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" /></svg>',
    '06': '<svg class="w-4 h-4 text-violet-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>',
    '07': '<svg class="w-4 h-4 text-violet-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" /></svg>',
    '08': '<svg class="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" /></svg>',
    '09': '<svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" /></svg>',
    '10': '<svg class="w-4 h-4 text-violet-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>',
    '11': '<svg class="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3Z" /></svg>'
};

const T = {
    'thorne': '<svg class="w-4 h-4 text-slate-800 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>',
    'beijing': '<svg class="w-4 h-4 text-amber-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" /></svg>',
    'northstar': '<svg class="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" /></svg>',
    'dubai_auto': '<svg class="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125-1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375M5.25 8.25V6.375c0-.621.504-1.125 1.125-1.125h11.25c.621 0 1.125.504 1.125 1.125v1.875m-13.5 0h13.5m-13.5 0v5.625m13.5-5.625v5.625m-13.5 0h13.5" /></svg>',
    'oudh': '<svg class="w-4 h-4 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" /></svg>',
    'agri': '<svg class="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0 0 12 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75Z" /></svg>',
    'valle': '<svg class="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" /></svg>',
    'keystone': '<svg class="w-4 h-4 text-slate-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" /></svg>'
};

const P = {
    '01': '<svg class="w-4 h-4 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>',
    '02': '<svg class="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" /></svg>',
    '03': '<svg class="w-4 h-4 text-slate-900 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" /></svg>'
};

const files = [
    {path: 'index.html', pre: ''},
    {path: 'the-engine/engine_nodes.html', pre: '../'},
    {path: 'view-schema/view-schema.html', pre: '../'},
    {path: 'testimony/master-matrix.html', pre: '../'},
    {path: 'risktable/investor-risk-matrix.html', pre: '../'},
    {path: 'about/about.html', pre: '../'},
    {path: 'submit-asset/submit-asset.html', pre: '../'}
];

files.forEach(f => {
    const fullPath = path.resolve(__dirname, f.path);
    if (!fs.existsSync(fullPath)) {
        console.log(`Skipping: ${f.path} (not found)`);
        return;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    const p = f.pre;
    
    // Define the full header block
    const headerHtml = `    <!-- NAVIGATION -->
    <nav class="app-header">
        <div class="flex items-center gap-3">
            <a href="${p}index.html" class="brand-link">
                <div class="brand-icon">O8</div>
                <span class="brand-text">ORTHOM8pro</span>
            </a>
        </div>
        <div class="flex items-center gap-4">
            <!-- Desktop Nav -->
            <div class="desktop-nav">
                <a href="${p}index.html" class="nav-link">Home</a>
                <div class="dropdown">
                    <a href="${p}the-engine/engine_nodes.html" class="dropdown-trigger nav-link flex items-center gap-1 group">
                        <span>The Engine</span>
                        <svg class="dropdown-arrow w-3 h-3 cursor-pointer group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </a>
                    <div class="dropdown-content">
                        <a href="${p}the-engine/engine_nodes.html#node-01" class="dropdown-item">${E['01']}<span>Data Ingest</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-02" class="dropdown-item">${E['02']}<span>Null Triage</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-03" class="dropdown-item">${E['03']}<span>Multi-Provider Enrichers</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-04" class="dropdown-item">${E['04']}<span>L2 Order Book Snapshot</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-05" class="dropdown-item">${E['05']}<span>Options Greeks Engine</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-06" class="dropdown-item">${E['06']}<span>Regime Detection AI</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-07" class="dropdown-item">${E['07']}<span>AI Sentiment Scrape</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-08" class="dropdown-item">${E['08']}<span>Correlation Guard</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-09" class="dropdown-item">${E['09']}<span>Confidence Gate</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-10" class="dropdown-item">${E['10']}<span>RL Execution Node</span></a>
                        <a href="${p}the-engine/engine_nodes.html#node-11" class="dropdown-item">${E['11']}<span>Circuit Breaker</span></a>
                    </div>
                </div>
                <a href="${p}index.html#performance" class="nav-link">Performance</a>
                <div class="dropdown">
                    <a href="${p}testimony/master-matrix.html" class="dropdown-trigger nav-link flex items-center gap-1 group">
                        <span>Testimonies</span>
                        <svg class="dropdown-arrow w-3 h-3 cursor-pointer group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </a>
                    <div class="dropdown-content">
                        <a href="${p}testimony/master-matrix.html?partner=thorne" class="dropdown-item">${T['thorne']}<span>Thorne-Blackwood</span></a>
                        <a href="${p}testimony/master-matrix.html?partner=beijing" class="dropdown-item">${T['beijing']}<span>Beijing Power</span></a>
                        <a href="${p}testimony/master-matrix.html?partner=northstar" class="dropdown-item">${T['northstar']}<span>NorthStar Motors</span></a>
                        <a href="${p}testimony/master-matrix.html?partner=dubai_auto" class="dropdown-item">${T['dubai_auto']}<span>Al-Maktoum Auto</span></a>
                        <a href="${p}testimony/master-matrix.html?partner=oudh" class="dropdown-item">${T['oudh']}<span>Oudh & Gold</span></a>
                        <a href="${p}testimony/master-matrix.html?partner=agri" class="dropdown-item">${T['agri']}<span>Agri-Growth</span></a>
                        <a href="${p}testimony/master-matrix.html?partner=valle" class="dropdown-item">${T['valle']}<span>Valle de Oro</span></a>
                        <a href="${p}testimony/master-matrix.html?partner=keystone" class="dropdown-item">${T['keystone']}<span>Keystone CM</span></a>
                    </div>
                </div>
                <div class="dropdown">
                    <a href="${p}view-schema/view-schema.html" class="dropdown-trigger nav-link flex items-center gap-1 group">
                        <span>View Schema</span>
                        <svg class="dropdown-arrow w-3 h-3 cursor-pointer group-hover:translate-y-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                    </a>
                    <div class="dropdown-content">
                        <a href="${p}view-schema/view-schema.html#pipeline" class="dropdown-item">${P['01']}<span>Phase 01: Ingest</span></a>
                        <a href="${p}view-schema/view-schema.html#pipeline" class="dropdown-item">${P['02']}<span>Phase 02: Gate</span></a>
                        <a href="${p}view-schema/view-schema.html#pipeline" class="dropdown-item">${P['03']}<span>Phase 03: Exit</span></a>
                    </div>
                </div>
                <a href="${p}risktable/investor-risk-matrix.html" class="nav-link">Risk Analysis</a>
                <a href="${p}about/about.html" class="nav-link text-blue-600">About</a>
            </div>
            <a href="${p}submit-asset/submit-asset.html" class="cta-outline">Audit Asset</a>

            <button id="mobile-menu-btn" class="hamburger-btn" aria-label="Open menu">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
        </div>
    </nav>

    <!-- MOBILE MENU -->
    <div id="mobile-menu" class="mobile-menu-panel translate-x-full">
        <div class="mobile-menu-header">
            <div class="flex items-center gap-3">
                <div class="brand-icon">O8</div>
                <span class="brand-text">ORTHOM8pro</span>
            </div>
            <button id="mobile-menu-close" class="p-2" aria-label="Close menu">
                <svg class="w-6 h-6 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
        <nav class="flex flex-col px-8 py-10 gap-2">
            <a href="${p}index.html" class="mobile-nav-link">Home</a>
            
            <a href="${p}the-engine/engine_nodes.html" class="mobile-nav-link">The Engine</a>
            <div class="mobile-sub-nav">
                <a href="${p}the-engine/engine_nodes.html#node-01" class="mobile-sub-link flex items-center gap-2">${E['01']} Data Ingest</a>
                <a href="${p}the-engine/engine_nodes.html#node-02" class="mobile-sub-link flex items-center gap-2">${E['02']} Null Triage</a>
                <a href="${p}the-engine/engine_nodes.html#node-03" class="mobile-sub-link flex items-center gap-2">${E['03']} Multi-Provider Enrichers</a>
                <a href="${p}the-engine/engine_nodes.html#node-04" class="mobile-sub-link flex items-center gap-2">${E['04']} L2 Order Book Snapshot</a>
                <a href="${p}the-engine/engine_nodes.html#node-05" class="mobile-sub-link flex items-center gap-2">${E['05']} Options Greeks Engine</a>
                <a href="${p}the-engine/engine_nodes.html#node-06" class="mobile-sub-link flex items-center gap-2">${E['06']} Regime Detection AI</a>
                <a href="${p}the-engine/engine_nodes.html#node-07" class="mobile-sub-link flex items-center gap-2">${E['07']} AI Sentiment Scrape</a>
                <a href="${p}the-engine/engine_nodes.html#node-08" class="mobile-sub-link flex items-center gap-2">${E['08']} Correlation Guard</a>
                <a href="${p}the-engine/engine_nodes.html#node-09" class="mobile-sub-link flex items-center gap-2">${E['09']} Confidence Gate</a>
                <a href="${p}the-engine/engine_nodes.html#node-10" class="mobile-sub-link flex items-center gap-2">${E['10']} RL Execution Node</a>
                <a href="${p}the-engine/engine_nodes.html#node-11" class="mobile-sub-link flex items-center gap-2">${E['11']} Circuit Breaker</a>
            </div>

            <a href="${p}index.html#performance" class="mobile-nav-link">Performance</a>

            <a href="${p}testimony/master-matrix.html" class="mobile-nav-link text-blue-600">Testimonies</a>
            <div class="mobile-sub-nav">
                <a href="${p}testimony/master-matrix.html?partner=thorne" class="mobile-sub-link flex items-center gap-2">${T['thorne']} Thorne-Blackwood</a>
                <a href="${p}testimony/master-matrix.html?partner=beijing" class="mobile-sub-link flex items-center gap-2">${T['beijing']} Beijing Power</a>
                <a href="${p}testimony/master-matrix.html?partner=northstar" class="mobile-sub-link flex items-center gap-2">${T['northstar']} NorthStar Motors</a>
                <a href="${p}testimony/master-matrix.html?partner=dubai_auto" class="mobile-sub-link flex items-center gap-2">${T['dubai_auto']} Al-Maktoum Auto</a>
                <a href="${p}testimony/master-matrix.html?partner=oudh" class="mobile-sub-link flex items-center gap-2">${T['oudh']} Oudh & Gold</a>
                <a href="${p}testimony/master-matrix.html?partner=agri" class="mobile-sub-link flex items-center gap-2">${T['agri']} Agri-Growth</a>
                <a href="${p}testimony/master-matrix.html?partner=valle" class="mobile-sub-link flex items-center gap-2">${T['valle']} Valle de Oro</a>
                <a href="${p}testimony/master-matrix.html?partner=keystone" class="mobile-sub-link flex items-center gap-2">${T['keystone']} Keystone CM</a>
            </div>

            <a href="${p}view-schema/view-schema.html" class="mobile-nav-link">View Schema</a>
            <div class="mobile-sub-nav">
                <a href="${p}view-schema/view-schema.html#pipeline" class="mobile-sub-link flex items-center gap-2">${P['01']} Phase 01: Ingest</a>
                <a href="${p}view-schema/view-schema.html#pipeline" class="mobile-sub-link flex items-center gap-2">${P['02']} Phase 02: Gate</a>
                <a href="${p}view-schema/view-schema.html#pipeline" class="mobile-sub-link flex items-center gap-2">${P['03']} Phase 03: Exit</a>
            </div>

            <a href="${p}risktable/investor-risk-matrix.html" class="mobile-nav-link">Risk Analysis</a>
            <a href="${p}about/about.html" class="mobile-nav-link text-blue-600">About</a>
        </nav>
        <div class="mt-auto px-8 pb-12">
            <a href="${p}submit-asset/submit-asset.html" class="cta-primary w-full text-center block">Audit Asset</a>
        </div>
    </div>`;

    // Try multiple start tags
    const startTags = ['<!-- NAVIGATION -->', '<nav'];
    let startIdx = -1;
    let foundTag = '';
    
    for (const tag of startTags) {
        startIdx = content.indexOf(tag);
        if (startIdx !== -1) {
            foundTag = tag;
            break;
        }
    }
    
    if (startIdx === -1) {
        console.log(`Skipping: ${f.path} (no nav tag found)`);
        return;
    }

    // Find the end tag (where the next section starts)
    const endMarkers = [
        '<!-- HERO SECTION',
        '<!-- HERO —',
        '<header',
        '<section',
        '<main',
        '<div class="blueprint-bg"',
        '<div id="hero"'
    ];

    let endIdx = -1;
    for (const marker of endMarkers) {
        const idx = content.indexOf(marker, startIdx + (foundTag ? foundTag.length : 10));
        if (idx !== -1 && (endIdx === -1 || idx < endIdx)) {
            endIdx = idx;
        }
    }

    if (endIdx === -1) {
        // Fallback for pages that might just have the nav and nothing else identifiable immediately
        console.log(`Warning: ${f.path} (end marker unclear, using simple fallback)`);
        // If we can find the next major tag after </nav>
        const navEndIdx = content.indexOf('</nav>', startIdx);
        if (navEndIdx !== -1) {
            // Find the first tag after </nav>
            const nextTagIdx = content.indexOf('<', navEndIdx + 6);
            if (nextTagIdx !== -1) {
                endIdx = nextTagIdx;
            }
        }
    }

    if (endIdx === -1) {
        console.log(`Skipping: ${f.path} (could not find clean end of nav)`);
        return;
    }

    // Apply replacement
    const newContent = content.substring(0, startIdx) + headerHtml + '\n\n    ' + content.substring(endIdx);
    fs.writeFileSync(fullPath, newContent);
    console.log(`Fixed: ${f.path}`);
});
