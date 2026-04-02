const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const { PrismaClient } = require('@prisma/client');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();

// Cloudinary Handshake
if (process.env.CLOUDINARY_URL) {
    const url = process.env.CLOUDINARY_URL;
    const parts = url.split('://')[1].split('@');
    const [apiKey, apiSecret] = parts[0].split(':');
    const cloudName = parts[1];
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true
    });
}
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Health Check Protocol (Required by railway.toml)
app.get('/health', (req, res) => res.status(200).json({ status: 'HEALTHY', timestamp: new Date() }));
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (req, file, cb) => {
        if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: JPEG, PNG, WEBP, GIF`));
        }
    }
});

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : [
        'https://wilbak.up.railway.app',
        'https://wilbak-production.up.railway.app',
        'http://localhost:4000',
        'http://127.0.0.1:4000'
    ];
app.use(cors({
    origin: (origin, callback) => {
        // Always allow no-origin requests (same-origin, curl, mobile)
        if (!origin) return callback(null, true);
        
        // In non-production allow all origins (dev proxy, browser preview, localhost)
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        
        // Production: check against whitelist or any railway.app subdomain
        if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.railway.app')) {
            return callback(null, true);
        }

        callback(new Error(`CORS: origin ${origin} not permitted`));
    },
    credentials: true
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/Orthom8', express.static(path.join(__dirname, 'Orthom8')));
app.use('/audit', express.static(path.join(__dirname, 'audit')));
// Serve only specific root-level static assets — never the entire project root
// (serving __dirname would expose .env, server.js, prisma/schema.prisma, etc.)
const ROOT_STATIC_FILES = [
    'i18n-loader.js', 'wilbak-base.css', 'favicon.svg', 'logo.png',
    'index.html', 'news.html', 'admin.html',
    'tailwind.config.js', 'animations.js'
];
ROOT_STATIC_FILES.forEach(file => {
    app.get(`/${file}`, (_req, res) => res.sendFile(path.join(__dirname, file)));
});
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
// Named page directories that are safe to serve statically
['about', 'contact', 'projects', 'insight', 'legal', 'page-data', 'src'].forEach(dir => {
    app.use(`/${dir}`, express.static(path.join(__dirname, dir)));
});
// Serve locale data files at root level (index_data.*.json, translations.*.json)
app.get(/^\/(index_data|translations|data)\.[a-z]{2}\.json$/, (req, res) => {
    const file = path.join(__dirname, req.path.replace(/^\//, ''));
    res.sendFile(file, err => { if (err) res.status(404).end(); });
});

// Session ID Middleware
app.use((req, res, next) => {
    let sessionId = req.cookies.session_id;
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        res.cookie('session_id', sessionId, {
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
    }
    req.sessionId = sessionId;
    next();
});

// Telegram Config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_USER_ID = String(process.env.TELEGRAM_USER_ID || '').trim();

// Middleware: Validate Telegram WebApp Data
const verifyTelegramAdmin = (req, res, next) => {
    const initData = req.headers['x-telegram-init-data'];
    if (!initData) return res.status(401).json({ error: 'Missing Protocol Signature' });

    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        urlParams.delete('hash');
        urlParams.sort();

        let dataCheckString = '';
        for (const [key, value] of urlParams.entries()) {
            dataCheckString += `${key}=${value}\n`;
        }
        dataCheckString = dataCheckString.slice(0, -1);

        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(TELEGRAM_BOT_TOKEN).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (!hash || hash.length !== calculatedHash.length ||
            !crypto.timingSafeEqual(Buffer.from(calculatedHash), Buffer.from(hash))
        ) return res.status(401).json({ error: 'Signature Mismatch' });

        const userParam = urlParams.get('user');
        if (!userParam) return res.status(401).json({ error: 'Identity Context Missing' });

        const user = JSON.parse(userParam);
        if (String(user.id) !== TELEGRAM_USER_ID) {
            console.error(`[ADMIN_GATE] Unauthorized ID: ${user.id}. Expected: ${TELEGRAM_USER_ID}`);
            return res.status(403).json({ error: 'Unauthorized Operative' });
        }

        req.admin = user;
        next();
    } catch (e) {
        console.error('[ADMIN_GATE] Security Engine Error:', e);
        return res.status(500).json({ error: 'Security Engine Failure' });
    }
};

// ---------------------------------------------------------------------------
// Simple in-process rate limiter (no external dependency)
// Usage: rateLimit({ windowMs, max }) returns an Express middleware
// ---------------------------------------------------------------------------
const rateLimit = ({ windowMs = 60000, max = 60, message = 'Too many requests' } = {}) => {
    const hits = new Map(); // ip → { count, resetAt }
    // Purge stale entries every window to prevent memory growth
    setInterval(() => {
        const now = Date.now();
        for (const [ip, entry] of hits) {
            if (entry.resetAt <= now) hits.delete(ip);
        }
    }, windowMs);
    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        let entry = hits.get(ip);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(ip, entry);
        }
        entry.count++;
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - entry.count));
        if (entry.count > max) {
            return res.status(429).json({ error: message });
        }
        next();
    };
};

// Escape HTML special characters to prevent XSS in server-rendered templates
const escapeHtml = (str) =>
    String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

const safeJsonParse = (val) => {
    if (typeof val === 'object' && val !== null) return val;
    if (typeof val !== 'string' || !val.trim()) return null;
    try {
        const cleaned = val.trim();
        if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
            return JSON.parse(cleaned);
        }
        return null;
    } catch (e) {
        return null;
    }
};

const sanitizeNodeData = (raw) => {
    const { id, likes, dislikes, votes, leads, ...data } = raw;
    return data;
};

const sendTelegramMessage = (message) => {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            chat_id: TELEGRAM_USER_ID,
            text: message,
            parse_mode: 'HTML'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) resolve(body);
                else reject(new Error(`Telegram API Error: ${res.statusCode}`));
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
};

const sendTelegramDocument = (filename, content) => {
    return new Promise((resolve, reject) => {
        const boundary = '----WilbakBoundary' + Math.random().toString(16).slice(2);
        const header = `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${TELEGRAM_USER_ID}\r\n--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="${filename}"\r\nContent-Type: text/csv\r\n\r\n`;
        const footer = `\r\n--${boundary}--\r\n`;

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_BOT_TOKEN}/sendDocument`,
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) resolve(body);
                else reject(new Error(`Telegram API Error: ${res.statusCode}`));
            });
        });

        req.on('error', (e) => reject(e));
        req.write(header);
        req.write(content);
        req.write(footer);
        req.end();
    });
};

// --- API ENDPOINTS ---

// Audit Submission
const auditLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 10, message: 'Audit submission limit reached. Try again in 1 hour.' });
app.post('/api/audit', auditLimiter, async (req, res) => {
    try {
        const data = req.body;

        // Save to Database
        const lead = await prisma.lead.create({
            data: {
                industry: data.industry,
                businessDetail: data.businessDetail,
                hours: parseInt(data.hours, 10) || 0,
                workflow: data.workflow,
                auditName: data.auditName,
                auditEmail: data.auditEmail,
                auditPhone: data.auditPhone,
                status: 'NEW'
            }
        });

        const message = `
<b>🚨 NEW AUDIT PROTOCOL INITIATED</b>
--------------------------------
<b>User:</b> ${escapeHtml(data.auditName)}
<b>Email:</b> ${escapeHtml(data.auditEmail)}
<b>Phone:</b> ${escapeHtml(data.auditPhone)}

<b>Sector:</b> ${escapeHtml(data.industry)}
<b>Manual Waste:</b> ${escapeHtml(data.hours)} hrs/week
<b>Efficiency Loss:</b> ${(parseFloat(data.hours) * 1.5 || 0).toFixed(0)}%

<b>Business DNA:</b>
<i>${escapeHtml(data.businessDetail)}</i>
--------------------------------
[ ID: ${escapeHtml(lead.id)} | Protocol v3.1 ]
        `;

        await sendTelegramMessage(message);
        res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
        console.error('Audit Error:', error);
        res.status(500).json({ success: false });
    }
});

// OrthoM8 Client Onboarding
const onboardingLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: 'Submission limit reached. Try again in 1 hour.' });
app.post('/api/onboarding', onboardingLimiter, async (req, res) => {
    try {
        const { sector, concerns, capitalRange, name, email, company, phone, callTime, message, source } = req.body;

        if (!name || !email) {
            return res.status(400).json({ success: false, error: 'Name and email are required.' });
        }

        const lead = await prisma.orthoM8Lead.create({
            data: {
                sector: sector || null,
                concerns: concerns || [],
                capitalRange: capitalRange || null,
                name,
                email,
                company: company || null,
                phone: phone || null,
                callTime: callTime || null,
                message: message || null,
                source: source || 'orthom8-onboarding',
                status: 'NEW'
            }
        });

        const concernList = Array.isArray(concerns) && concerns.length > 0
            ? concerns.join(', ')
            : 'Not specified';

        const tgMessage = `
<b>🛡️ NEW ORTHO'M8 CLIENT INQUIRY</b>
--------------------------------
<b>Name:</b> ${escapeHtml(name)}
<b>Email:</b> ${escapeHtml(email)}
<b>Company:</b> ${escapeHtml(company || '—')}
<b>Phone:</b> ${escapeHtml(phone || '—')}
<b>Call Time:</b> ${escapeHtml(callTime || 'Flexible')}

<b>Sector:</b> ${escapeHtml(sector || '—')}
<b>Concerns:</b> ${escapeHtml(concernList)}
<b>Capital Range:</b> ${escapeHtml(capitalRange || '—')}

<b>Message:</b>
<i>${escapeHtml(message || '—')}</i>
--------------------------------
[ ID: ${lead.id} | Source: ${escapeHtml(source || 'orthom8-onboarding')} ]
        `;

        await sendTelegramMessage(tgMessage);
        res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
        console.error('OrthoM8 Onboarding Error:', error);
        res.status(500).json({ success: false, error: 'Submission failed. Please try again.' });
    }
});

// OrthoM8 Admin — List all onboarding leads
app.get('/api/admin/orthom8-leads', verifyTelegramAdmin, async (req, res) => {
    try {
        const leads = await prisma.orthoM8Lead.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(leads);
    } catch (e) {
        res.status(500).json({ error: 'Database access failure' });
    }
});

// OrthoM8 Admin — Update lead status
app.patch('/api/admin/orthom8-leads/:id/status', verifyTelegramAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['NEW', 'CONTACTED', 'QUALIFIED', 'ARCHIVED'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const lead = await prisma.orthoM8Lead.update({
            where: { id: req.params.id },
            data: { status }
        });
        res.json({ success: true, lead });
    } catch (e) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// Admin Lead Management (Mini App)
app.get('/api/admin/leads', verifyTelegramAdmin, async (req, res) => {
    try {
        const page = Math.max(0, parseInt(req.query.page, 10) || 0);
        const take = 200;
        const leads = await prisma.lead.findMany({
            orderBy: { createdAt: 'desc' },
            take,
            skip: page * take
        });
        res.json(leads);
    } catch (e) {
        res.status(500).json({ error: 'Database access failure' });
    }
});

// Admin Config
app.get('/api/admin/config', verifyTelegramAdmin, (req, res) => {
    res.json({
        telegramUserId: TELEGRAM_USER_ID
    });
});

// CSV Export - Direct to Bot (Leads)
app.get('/api/admin/leads/export-csv', verifyTelegramAdmin, async (req, res) => {
    try {
        const leads = await prisma.lead.findMany();
        const json2csvParser = new Parser();
        const csvData = json2csvParser.parse(leads);
        const filename = `wilbak_leads_${Date.now()}.csv`;

        await sendTelegramDocument(filename, csvData);
        res.json({ success: true, message: 'File sent to your Telegram chat.' });
    } catch (e) {
        console.error('Export Error:', e);
        res.status(500).json({ error: 'Export failed' });
    }
});

// --- INTELLIGENCE ENGINE: SCHEDULER & ORCHESTRATION ---

const triggerResearchProtocol = async (query = "Finance Business") => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
    let createdCount = 0;

    if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY missing - Configure in environment');
    if (!BRIGHTDATA_API_KEY) throw new Error('BRIGHTDATA_API_KEY missing - Configure in environment');

    const securePost = (url, headers, body) => {
        return new Promise((resolve) => {
            const parsedUrl = new URL(url);
            const options = {
                hostname: parsedUrl.hostname,
                path: parsedUrl.pathname + (parsedUrl.search || ''),
                method: 'POST',
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Wilbak-Intelligence-Engine/2.0'
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    const response = { ok: res.statusCode < 300, status: res.statusCode, data: data };
                    if (!response.ok) {
                        console.error(`[AUTONOMOUS_PULSE] API ERROR: ${parsedUrl.hostname} returned status ${res.statusCode} | Body: ${data.slice(0, 100)}`);
                    }
                    resolve(response);
                });
            });
            req.on('error', (e) => {
                console.error(`[AUTONOMOUS_PULSE] NETWORK FAILURE: ${parsedUrl.hostname} - ${e.message}`);
                resolve({ ok: false, status: 500, data: e.message });
            });
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    };

    try {
        console.log(`[AUTONOMOUS_PULSE] Initiating Targeted Scan: "${query}" (USA/Canada/Europe Focus)`);
        let rawSignals = [];

        // 1. SENSOR (Bright Data)
        // Request up to 10 results to ensure we find unique ones.
        const resA = await securePost('https://api.brightdata.com/serp/query',
            { 'Authorization': `Bearer ${BRIGHTDATA_API_KEY}` },
            { 
                "count": 10, 
                "query": { "q": `${query} market logic business impact "USA" OR "Canada" OR "Europe"` }, 
                "search_engine": "google" 
            }
        );

        if (!resA.ok) {
            throw new Error(`BrightData API failed: Status ${resA.status}. Ensure BrightData SERP API is enabled & key is correct.`);
        }

        try {
            const serp = JSON.parse(resA.data);
            if (serp.organic) {
                rawSignals = serp.organic.map(item => ({
                    sector: query.toUpperCase(),
                    title: item.title,
                    details: item.description || item.snippet,
                    url: item.link || ''
                })).filter(s => s.details && s.url);
            }
        } catch (pe) {
            throw new Error('BrightData Parsing Error. Unrecognized response shape.');
        }

        if (rawSignals.length === 0) {
            throw new Error('BrightData returned 0 valid organic search results for this sector.');
        }

        console.log(`[AUTONOMOUS_PULSE] Found ${rawSignals.length} raw signals. Deduplicating...`);
        let uniqueSignals = [];

        // DB Deduplication
        for (const signal of rawSignals) {
            if (uniqueSignals.length >= 2) break; // Limit to 2 distinct insights per run
            
            const existing = await prisma.intelligenceNode.findFirst({
                where: { sourceUrl: signal.url }
            });
            
            if (!existing) {
                uniqueSignals.push(signal);
            }
        }

        if (uniqueSignals.length === 0) {
            throw new Error('Found news, but all articles have already been processed in the database. Try a more specific sector.');
        }

        // 2. ORCHESTRATOR (Groq) - Template Driven
        const templatePath = path.join(__dirname, 'newsdata-template.json');
        const templateStr = fs.readFileSync(templatePath, 'utf8');

        for (const signal of uniqueSignals) {
            const prompt = `SYSTEM: Wilhelm Rybak, CEO. High-Performance Strategist. Focus heavily on North American/European business impact.
SPEAK: Clear, Executive English. Sophisticated but direct.
TASK: Analyze the provided business signal and generate a high-fidelity strategic report.
INPUT: ${signal.title} - ${signal.details}
REQUIRED FORMAT: You must output ONLY a raw JSON object perfectly matching the structure of this template. Do not wrap it in markdown block quotes. Fill in every field with original, deep intellectual analysis based on the INPUT. Keep the exact nested JSON keys.
TEMPLATE:
${templateStr}`;

            const groqRes = await securePost('https://api.groq.com/openai/v1/chat/completions',
                { 'Authorization': `Bearer ${GROQ_API_KEY}` },
                {
                    model: 'llama-3.1-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                }
            );

            if (groqRes.ok) {
                try {
                    const groqData = JSON.parse(groqRes.data);
                    const analysisStr = groqData.choices[0].message.content;
                    // In case model wraps in markdown
                    const cleanAnalysisStr = analysisStr.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
                    const analysis = JSON.parse(cleanAnalysisStr);

                    const defaultImages = [
                        `https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop`,
                        `https://images.unsplash.com/photo-1551288049-bbbda5e66ef2?q=80&w=800&auto=format&fit=crop`,
                        `https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?q=80&w=800&auto=format&fit=crop`
                    ];
                    await prisma.intelligenceNode.create({
                        data: {
                            sector: query.toUpperCase(),
                            title: analysis.title || analysis.headline || signal.title,
                            insight: analysis.insight || analysis.mainPoint || "No insight provided.",
                            marketEvent: analysis.marketEvent || analysis.marketContext || signal.details,
                            logicAnalysis: analysis.logicAnalysis || analysis.insight,
                            logicFramework: analysis.logicFramework || null,
                            conversionStep: analysis.conversionStep || null,
                            strategicConclusion: analysis.strategicConclusion || "",
                            sourceUrl: signal.url || null,
                            images: [defaultImages[Math.floor(Math.random() * defaultImages.length)]]
                        }
                    });
                    createdCount++;
                    console.log(`[AUTONOMOUS_PULSE] Generated & persisted: ${signal.title.substring(0, 40)}...`);
                } catch (e) {
                    console.error('[AUTONOMOUS_PULSE] AI JSON Parsing/Persistence Error:', e);
                }
            } else {
                console.error('[AUTONOMOUS_PULSE] Groq generation failed. Status:', groqRes.status);
            }
        }

        // Fallback catch if Llama-3 parsing failed on both
        if (createdCount === 0) {
            throw new Error('News successfully extracted, but AI failed to format it according to the template pipeline.');
        }

        return createdCount;
    } catch (e) {
        console.error('[AUTONOMOUS_PULSE] Protocol Loop Failure:', e.message);
        throw e; // Bubble the precise error to the admin frontend
    }
};


// Mutex: prevent overlapping scheduler runs (each scan can take 30s+)
let _researchRunning = false;
const safeResearchRun = async (query) => {
    if (_researchRunning) {
        console.log('[SCHEDULER] Skipped — previous run still in progress.');
        return;
    }
    _researchRunning = true;
    try {
        await triggerResearchProtocol(query);
    } catch (e) {
        console.error('[SCHEDULER] Run failed:', e.message);
    } finally {
        _researchRunning = false;
    }
};

// Start 6-hour Scheduler (21,600,000 ms)
setInterval(() => safeResearchRun(), 21600000);
// Trigger once on system boot to ensure data availability (Delayed 10s for stability)
setTimeout(() => safeResearchRun("Iran Israel USA Business Impact Opportunities"), 10000);

// Intelligence Hub Endpoints
app.get('/api/intelligence', async (req, res) => {
    try {
        const sessionId = req.sessionId;
        let nodes = await prisma.intelligenceNode.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: {
                votes: {
                    where: { sessionId }
                }
            }
        });

        // Add userVote field to each node for the frontend
        nodes = nodes.map(node => ({
            ...node,
            userVote: node.votes && node.votes.length > 0 ? node.votes[0].type : null,
            votes: undefined // Don't leak all vote technical data
        }));

        if (nodes.length === 0) {
            nodes = [
                {
                    id: 'placeholder-1',
                    sector: 'SYSTEM',
                    title: 'Intelligence Center Active',
                    insight: 'We are currently tracking world events to find your next opportunity.',
                    marketEvent: 'System starting up. Our AI is scanning Global News right now.',
                    logicAnalysis: 'This page will automatically show you updates on how to keep your business safe and profitable.',
                    conversionStep: 'Need a custom check on your business? Click below for an Audit.',
                    likes: 0,
                    dislikes: 0,
                    createdAt: new Date()
                }
            ];
        }
        res.json(nodes);
    } catch (e) {
        res.status(500).json({ error: 'Data link failure' });
    }
});

// Diagnostic Manual Trigger (Admin only — triggers paid external API calls)
app.get('/api/intelligence/retest', verifyTelegramAdmin, async (req, res) => {
    try {
        console.log('[DIAGNOSTIC] Manual retest requested.');
        await triggerResearchProtocol("Finance AI Business");
        res.json({ success: true, message: 'Retest pulse sent. Check ledger in 30 seconds.' });
    } catch (e) {
        res.status(500).json({ error: 'Retest failed' });
    }
});


// Like/Dislike Endpoint (One vote per person per node)
const voteLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, message: 'Vote rate limit exceeded.' });
app.post('/api/intelligence/:id/vote', voteLimiter, async (req, res) => {
    const { id } = req.params;
    const { type } = req.body;
    const sessionId = req.sessionId;

    if (!type || !['LIKE', 'DISLIKE'].includes(String(type).toUpperCase())) {
        return res.status(400).json({ error: 'Invalid vote type. Must be LIKE or DISLIKE.' });
    }
    const voteType = type.toUpperCase();

    try {
        // Enforce structural integrity: users can only switch their vote or create a new one
        const existingVote = await prisma.vote.findUnique({
            where: {
                nodeId_sessionId: { nodeId: id, sessionId }
            }
        });

        if (existingVote) {
            if (existingVote.type === voteType) {
                // Remove vote if same button clicked again
                await prisma.$transaction([
                    prisma.vote.delete({ where: { id: existingVote.id } }),
                    prisma.intelligenceNode.update({
                        where: { id },
                        data: voteType === 'LIKE' ? { likes: { decrement: 1 } } : { dislikes: { decrement: 1 } }
                    })
                ]);
                return res.json({ success: true, userVote: null });
            } else {
                // Switch vote (e.g., LIKE to DISLIKE)
                await prisma.$transaction([
                    prisma.vote.update({
                        where: { id: existingVote.id },
                        data: { type: voteType }
                    }),
                    prisma.intelligenceNode.update({
                        where: { id },
                        data: voteType === 'LIKE'
                            ? { likes: { increment: 1 }, dislikes: { decrement: 1 } }
                            : { dislikes: { increment: 1 }, likes: { decrement: 1 } }
                    })
                ]);
                return res.json({ success: true, userVote: voteType });
            }
        }

        // New Vote
        await prisma.$transaction([
            prisma.vote.create({
                data: {
                    nodeId: id,
                    sessionId: sessionId,
                    type: voteType
                }
            }),
            prisma.intelligenceNode.update({
                where: { id },
                data: voteType === 'LIKE' ? { likes: { increment: 1 } } : { dislikes: { increment: 1 } }
            })
        ]);

        res.json({ success: true, userVote: voteType });
    } catch (e) {
        console.error('Vote Error:', e);
        res.status(500).json({ error: 'Vote registration failure' });
    }
});

// Admin Trigger (Manual AI Scan)
app.post('/api/admin/intelligence/trigger', verifyTelegramAdmin, async (req, res) => {
    const { query } = req.body;
    try {
        const count = await triggerResearchProtocol(query || "Finance Business");
        res.json({ success: true, count });
    } catch (e) {
        res.status(500).json({ error: e.message || 'Manual Protocol Failure' });
    }
});

// Admin Image Upload to Cloudinary
app.post('/api/admin/upload-image', verifyTelegramAdmin, upload.single('image'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    try {
        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'wilbak_intelligence',
            resource_type: 'auto'
        });
        res.json({ success: true, url: result.secure_url });
    } catch (e) {
        console.error('Upload Error:', e);
        res.status(500).json({ error: 'Cloudinary transmission failed' });
    } finally {
        // Always clean up temp file — even when Cloudinary throws
        fs.unlink(req.file.path, (err) => {
            if (err) console.error('[UPLOAD] Temp file cleanup failed:', err.message);
        });
    }
});

// Admin Intelligence Node List (Full Data)
app.get('/api/admin/intelligence/list', verifyTelegramAdmin, async (req, res) => {
    try {
        const page = Math.max(0, parseInt(req.query.page, 10) || 0);
        const take = 200;
        const nodes = await prisma.intelligenceNode.findMany({
            orderBy: { createdAt: 'desc' },
            take,
            skip: page * take
        });
        res.json(nodes);
    } catch (e) {
        res.status(500).json({ error: 'Intelligence retrieval failure' });
    }
});

// Single Insight View with SEO Injection
app.get('/insight/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const node = await prisma.intelligenceNode.findUnique({ where: { id } });

        if (!node) {
            return res.status(404).send('Intelligence Node Not Found');
        }

        let template = fs.readFileSync(path.join(__dirname, 'news.html'), 'utf8');

        // Dynamic Injections for SEO and Display
        const sessionId = req.sessionId;
        const existingVote = await prisma.vote.findUnique({
            where: { nodeId_sessionId: { nodeId: node.id, sessionId } }
        });

        const replacements = {
            '{{ID}}':                   escapeHtml(node.id),
            '{{TITLE}}':                escapeHtml(node.title),
            '{{SECTOR}}':               escapeHtml(node.sector),
            '{{INSIGHT}}':              escapeHtml(node.insight),
            '{{MARKET_EVENT}}':         escapeHtml(node.marketEvent),
            '{{LOGIC_ANALYSIS}}':       escapeHtml(node.logicAnalysis),
            '{{CONVERSION_STEP}}':      JSON.stringify(node.conversionStep || {}),
            '{{LOGIC_FRAMEWORK}}':      JSON.stringify(node.logicFramework || {}),
            '{{IMAGES}}':               JSON.stringify(node.images || []),
            '{{STRATEGIC_CONCLUSION}}': escapeHtml(node.strategicConclusion || ''),
            '{{DATE}}':                 escapeHtml(node.createdAt.toDateString()),
            '{{URL}}':                  escapeHtml(`https://${req.get('host')}/insight/${node.id}`),
            '{{LIKES}}':                String(node.likes || 0),
            '{{DISLIKES}}':             String(node.dislikes || 0),
            '{{NODE_ID}}':              escapeHtml(node.id),
            '{{USER_VOTE}}':            existingVote ? escapeHtml(existingVote.type) : 'null'
        };

        Object.keys(replacements).forEach(key => {
            template = template.split(key).join(replacements[key]);
        });

        res.send(template);
    } catch (e) {
        console.error('Insight Render Error:', e);
        res.status(500).send('Intelligence System Link Failure');
    }
});

// Admin Manual Create (Manual Entry)
app.post('/api/admin/intelligence/create', verifyTelegramAdmin, async (req, res) => {
    try {
        const {
            sector, title, insight, marketEvent, logicAnalysis,
            logicFramework, caseStudyEvidence, conversionStep,
            strategicConclusion, sourceUrl, images, createdAt
        } = req.body;

        const data = {
            sector: (sector || '').toUpperCase(),
            title: title || 'UNTITLED REPORT',
            insight: insight || '',
            marketEvent: marketEvent || title || '',
            logicAnalysis: logicAnalysis || insight || '',
            logicFramework: safeJsonParse(logicFramework),
            caseStudyEvidence: safeJsonParse(caseStudyEvidence),
            conversionStep: safeJsonParse(conversionStep),
            strategicConclusion: strategicConclusion || null,
            sourceUrl: sourceUrl || null,
            images: Array.isArray(images) ? images : [],
        };

        if (createdAt) data.createdAt = new Date(createdAt);

        const node = await prisma.intelligenceNode.create({ data });
        res.json({ success: true, id: node.id });
    } catch (e) {
        console.error('Manual Creation Error:', e);
        res.status(500).json({ error: 'Intelligence injection failure: ' + e.message });
    }
});

// Admin Intelligence Import (JSON Bulk)
app.post('/api/admin/intelligence/import', verifyTelegramAdmin, async (req, res) => {
    try {
        const { nodes } = req.body;
        if (!Array.isArray(nodes)) return res.status(400).json({ error: 'Invalid payload: Array expected' });

        const payload = nodes.map(item => {
            const nodeData = sanitizeNodeData(item);
            return {
                ...nodeData,
                likes: item.likes || 0,
                dislikes: item.dislikes || 0,
                logicFramework: safeJsonParse(nodeData.logicFramework),
                caseStudyEvidence: safeJsonParse(nodeData.caseStudyEvidence),
                conversionStep: safeJsonParse(nodeData.conversionStep),
                images: Array.isArray(nodeData.images) ? nodeData.images : []
            };
        });
        const result = await prisma.intelligenceNode.createMany({ data: payload, skipDuplicates: true });
        res.json({ success: true, count: result.count });
    } catch (e) {
        console.error('Bulk Import Error:', e);
        res.status(500).json({ error: 'Bulk intelligence injection failure: ' + e.message });
    }
});

// Admin Update Intelligence Node
app.put('/api/admin/intelligence/:id', verifyTelegramAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            sector, title, insight, marketEvent, logicAnalysis,
            logicFramework, caseStudyEvidence, conversionStep,
            strategicConclusion, sourceUrl, images, createdAt,
            likes, dislikes, status
        } = req.body;

        const data = {
            sector: sector?.toUpperCase(),
            title,
            insight,
            marketEvent,
            logicAnalysis,
            logicFramework: safeJsonParse(logicFramework),
            caseStudyEvidence: safeJsonParse(caseStudyEvidence),
            conversionStep: safeJsonParse(conversionStep),
            strategicConclusion,
            sourceUrl,
            images,
            status
        };

        if (createdAt) data.createdAt = new Date(createdAt);
        if (likes !== undefined) data.likes = parseInt(likes, 10) || 0;
        if (dislikes !== undefined) data.dislikes = parseInt(dislikes, 10) || 0;

        const node = await prisma.intelligenceNode.update({
            where: { id },
            data
        });

        res.json({ success: true, id: node.id });
    } catch (e) {
        console.error('Update Error:', e);
        res.status(500).json({ error: 'Intelligence update failure: ' + e.message });
    }
});

// Admin Delete Intelligence Node
app.delete('/api/admin/intelligence/:id', verifyTelegramAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.vote.deleteMany({ where: { nodeId: id } }); // Cleanup votes
        await prisma.intelligenceNode.delete({ where: { id } });
        res.json({ success: true });
    } catch (e) {
        console.error('Delete Error:', e);
        res.status(500).json({ error: 'Intelligence purging failure' });
    }
});

// Admin Leads Export (JSON)
app.get('/api/admin/leads/export-json', verifyTelegramAdmin, async (req, res) => {
    try {
        const leads = await prisma.lead.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(leads);
    } catch (e) {
        res.status(500).json({ error: 'Leads export failure' });
    }
});

// Admin Intelligence Export (JSON)
app.get('/api/admin/intelligence/export-json', verifyTelegramAdmin, async (req, res) => {
    try {
        const nodes = await prisma.intelligenceNode.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(nodes);
    } catch (e) {
        res.status(500).json({ error: 'Intelligence export failure' });
    }
});

// Admin Leads Import (JSON Bulk)
app.post('/api/admin/leads/import-json', verifyTelegramAdmin, async (req, res) => {
    try {
        const { leads } = req.body;
        if (!Array.isArray(leads)) return res.status(400).json({ error: 'Invalid payload: Array expected' });

        const payload = leads.map(item => {
            const { id, ...leadData } = item;
            return {
                ...leadData,
                hours: parseInt(leadData.hours || 0, 10) || 0,
                status: leadData.status || 'IMPORTED'
            };
        });
        const result = await prisma.lead.createMany({ data: payload, skipDuplicates: true });
        res.json({ success: true, count: result.count });
    } catch (e) {
        console.error('Lead Bulk Import Error:', e);
        res.status(500).json({ error: 'Lead bulk injection failure: ' + e.message });
    }
});

// CSV Import
app.post('/api/admin/leads/import', verifyTelegramAdmin, upload.single('file'), (req, res) => {
    const results = [];
    if (!req.file) return res.status(400).send('No file uploaded');

    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            try {
                const payload = results.map(item => ({
                    auditName: item.auditName,
                    auditEmail: item.auditEmail,
                    auditPhone: item.auditPhone,
                    industry: item.industry,
                    businessDetail: item.businessDetail,
                    hours: parseInt(item.hours || 0, 10) || 0,
                    workflow: item.workflow,
                    status: item.status || 'IMPORTED'
                }));
                const created = await prisma.lead.createMany({ data: payload, skipDuplicates: true });
                res.json({ success: true, count: created.count });
            } catch (e) {
                res.status(500).json({ error: 'Import processing failure' });
            } finally {
                // Always clean up uploaded CSV regardless of outcome
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('[CSV_IMPORT] Temp file cleanup failed:', err.message);
                });
            }
        });
});

const server = app.listen(PORT, () => {
    console.log(`Wilbak Engineering Server running on port ${PORT}`);
});

// Graceful shutdown — flush Prisma connections on Railway deploy / Ctrl+C
const shutdown = async (signal) => {
    console.log(`[SERVER] ${signal} received — shutting down gracefully...`);
    server.close(async () => {
        await prisma.$disconnect();
        console.log('[SERVER] Prisma disconnected. Exiting.');
        process.exit(0);
    });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));


module.exports = { app, triggerResearchProtocol, prisma };