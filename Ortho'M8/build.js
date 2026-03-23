const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const DIST_DIR = path.join(__dirname, 'dist');

// Ensure dist exists
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

// Load Data
const siteContent = JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'data', 'site-content.json'), 'utf8'));
const engineNodes = fs.existsSync(path.join(SRC_DIR, 'data', 'engine_nodes.json')) 
    ? JSON.parse(fs.readFileSync(path.join(SRC_DIR, 'data', 'engine_nodes.json'), 'utf8')) 
    : { nodes: [], tiers: [], risk_matrix: [] };

// Load Template
const templateHtml = fs.readFileSync(path.join(SRC_DIR, 'templates', 'page-template.html'), 'utf8');

// Simple pattern extractor (regex)
const patterns = {};
const patternRegex = /<!-- ── PATTERN ([A-Z_]+): .*? ──+ -->([\s\S]*?)(?=<!-- ── PATTERN|<!-- ═════)/g;
let match;
while ((match = patternRegex.exec(templateHtml)) !== null) {
  patterns[match[1]] = match[2].trim();
}

// Modal extractor
const modalMatch = templateHtml.match(/<!-- Example modal -->([\s\S]*?)<!-- ═════/);
let modalTemplate = modalMatch ? modalMatch[1].trim() : '';

// Data resolver
function resolveData(source) {
    if (!source) return null;
    const parts = source.includes('#') ? source.split('#') : [source];
    const key = parts[1];
    return engineNodes[key] || null;
}

// Zero-dep builder
function buildPage(pageKey, pageData) {
    console.log(`Building: ${pageKey} -> ${pageData.file}`);
    let html = templateHtml;

    // 1. Meta / SEO (Regex based)
    if (pageData.meta) {
        html = html.replace(/<title>.*?<\/title>/, `<title>${pageData.meta.title}<\/title>`);
        html = html.replace(/<meta property="og:title" content=".*?">/, `<meta property="og:title" content="${pageData.meta.title}">`);
        html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${pageData.meta.description}">`);
        // ... and so on for others if needed
    }

    // 2. Adjust paths (depth based)
    if (pageData.folder_depth === 0) {
        html = html.split('../assets/').join('./assets/');
        html = html.split('../index.html').join('./index.html');
    }

    // 3. activeNav attribute in header
    if (pageData.o8_config && pageData.o8_config.activeNav) {
        // Find the link with data-nav and mark it active
        const navRegex = new RegExp(`(data-nav="${pageData.o8_config.activeNav}")`, 'g');
        html = html.replace(navRegex, `$1 class="o8-nav-link active"`);
    }

    // 4. Inject o8_config into script
    if (pageData.o8_config) {
        const configStr = `window.O8 = ${JSON.stringify(pageData.o8_config, null, 2)};`;
        html = html.replace(/window\.O8 = \{[\s\S]*?\};/, configStr);
    }

    // 5. Build sections
    let sectionsHtml = '';
    (pageData.sections || []).forEach(section => {
        let secTemplate = patterns[section.pattern] || `<!-- Missing Pattern ${section.pattern} -->`;
        
        // Basic mapping for titles/body (string replace)
        let s = secTemplate;
        
        // Section attributes
        if (section.id) s = s.replace(/id=".*?"/, `id="${section.id}"`);
        if (section.bg === 'off') s = s.replace('class="o8-section"', 'class="o8-section o8-section--off"');
        if (section.bg === 'dark') s = s.replace('class="o8-section"', 'class="o8-section o8-section--dark"');

        // Fields
        if (section.eyebrow) s = s.replace(/Section Category · Subsection/, section.eyebrow);
        if (section.section_num) s = s.replace(/0\d — [^<]+/, section.section_num);
        if (section.title) {
           s = s.replace(/Page Heading<br>\s*<em>.*?<\/em>/, `${section.title}<br><em>${section.title_em || ''}<\/em>`);
           s = s.replace(/Section Heading <em>.*?<\/em>/, `${section.title} <em>${section.title_em || ''}<\/em>`);
        }
        if (section.body) {
           s = s.replace(/One or two sentences introducing this page\.[^<]+/, section.body);
           s = s.replace(/Optional lead paragraph below the heading\.[^<]+/, section.body);
        }

        // Tier Tabs (Pattern J)
        if (section.pattern === 'J' && section.tabs) {
            const tabsHtml = section.tabs.map((t, i) => `<div class="o8-tab ${i===0?'active':''}" onclick="o8SwitchTab('tiersTabs', ${i})">${t.label}</div>`).join('\n');
            s = s.replace(/<div class="o8-tab active".*?<\/div>[\s\S]*?<div class="o8-tab".*?<\/div>/, tabsHtml);
            
            // Note: zero-dep approach for complex inner mappings (like tabs data) 
            // is best done via template injection placeholders if we don't have cheerio.
            // For now we'll use a simpler placeholder approach for the most complex bits.
        }

        sectionsHtml += s + '\n\n';
    });

    // Replace page content block
    const markerStart = '<!-- ── PATTERN A: Page Hero ────────────────────── -->';
    const markerEnd = '<!-- ═══════════════════════════════════════════════\n       MODALS';
    
    const parts = html.split(markerStart);
    if (parts.length > 1) {
        const afterHero = parts[1].split(markerEnd);
        html = parts[0] + sectionsHtml + markerEnd + afterHero[1];
    }

    // 6. Build Modals
    let modalsHtml = '';
    (pageData.modals || []).forEach(modal => {
        let m = modalTemplate.split('id="exampleModal"').join(`id="${modal.id}"`);
        m = m.split('exampleModal').join(modal.id);
        if (modal.eyebrow) m = m.replace(/Modal Category/, modal.eyebrow);
        if (modal.title) m = m.replace(/Modal Title/, modal.title);
        // ... simpler modal body replacement
        modalsHtml += m + '\n';
    });
    
    html = html.replace(/<!-- Example modal -->[\s\S]*?<!-- ═════/, modalsHtml + '\n<!-- ═════');

    // Write file
    const filePath = path.join(DIST_DIR, pageData.file);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, html, 'utf8');
}

// Directory copy helper
function copyDirSync(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(item => {
        const s = path.join(src, item);
        const d = path.join(dest, item);
        if (fs.lstatSync(s).isDirectory()) copyDirSync(s, d);
        else fs.copyFileSync(s, d);
    });
}

console.log('--- ORTHOM8pro Zero-Dep Build ---');

// Assets
console.log('Copying assets...');
copyDirSync(path.join(SRC_DIR, 'assets'), path.join(DIST_DIR, 'assets'));

// Build Pages
Object.keys(siteContent.pages).forEach(key => buildPage(key, siteContent.pages[key]));

console.log('Build complete.');
