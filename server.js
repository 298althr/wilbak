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
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

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

        if (calculatedHash !== hash) return res.status(401).json({ error: 'Signature Mismatch' });

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
                'Content-Length': data.length
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
app.post('/api/audit', async (req, res) => {
    try {
        const data = req.body;

        // Save to Database
        const lead = await prisma.lead.create({
            data: {
                industry: data.industry,
                businessDetail: data.businessDetail,
                hours: parseInt(data.hours),
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
<b>User:</b> ${data.auditName}
<b>Email:</b> ${data.auditEmail}
<b>Phone:</b> ${data.auditPhone}

<b>Sector:</b> ${data.industry}
<b>Manual Waste:</b> ${data.hours} hrs/week
<b>Efficiency Loss:</b> ${(data.hours * 1.5).toFixed(0)}%

<b>Business DNA:</b>
<i>${data.businessDetail}</i>
--------------------------------
[ ID: ${lead.id} | Protocol v3.1 ]
        `;

        await sendTelegramMessage(message);
        res.status(200).json({ success: true, leadId: lead.id });
    } catch (error) {
        console.error('Audit Error:', error);
        res.status(500).json({ success: false });
    }
});

// Admin Lead Management (Mini App)
app.get('/api/admin/leads', verifyTelegramAdmin, async (req, res) => {
    try {
        const leads = await prisma.lead.findMany({
            orderBy: { createdAt: 'desc' }
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

    if (!GROQ_API_KEY) {
        console.error('[AUTONOMOUS_PULSE] CRITICAL: GROQ_API_KEY is missing.');
        throw new Error('GROQ_API_KEY missing');
    }

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
                    'User-Agent': 'Wilbak-Intelligence-Engine/1.0'
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    const response = { ok: res.statusCode < 300, status: res.statusCode, data: data };
                    if (!response.ok) {
                        console.error(`[AUTONOMOUS_PULSE] API ERROR: ${parsedUrl.hostname} returned status ${res.statusCode}`);
                    }
                    resolve(response);
                });
            });
            req.on('error', (e) => {
                console.error(`[AUTONOMOUS_PULSE] NETWORK FAILURE: ${parsedUrl.hostname} - ${e.message}`);
                resolve({ ok: false, status: 500 });
            });
            req.write(JSON.stringify(body));
            req.end();
        });
    };

    try {
        console.log(`[AUTONOMOUS_PULSE] Initiating Targeted Scan: "${query}"`);
        let rawSignals = [];

        // 1. SENSOR (Bright Data)
        if (BRIGHTDATA_API_KEY) {
            const resA = await securePost('https://api.brightdata.com/serp/query',
                { 'Authorization': `Bearer ${BRIGHTDATA_API_KEY}` },
                { "count": 3, "query": { "q": `${query} market news business impact` }, "search_engine": "google" }
            );

            if (resA.ok) {
                try {
                    const serp = JSON.parse(resA.data);
                    if (serp.organic) {
                        rawSignals = serp.organic.map(item => ({
                            sector: query.toUpperCase(),
                            title: item.title,
                            details: item.description || item.snippet,
                            url: item.link
                        }));
                    }
                } catch (pe) { console.error('[AUTONOMOUS_PULSE] Sensor Data Parse Failure'); }
            }
        }

        // Fallback context if scraper fails
        if (rawSignals.length === 0) {
            console.log('[AUTONOMOUS_PULSE] Scraper returned zero data. Deploying Strategic Fallback.');
            rawSignals = [
                {
                    sector: query.toUpperCase(),
                    title: `${query} Operational Shift`,
                    details: 'Recent market indicators show rising volatility in this sector requiring automated logic to maintain stability.'
                }
            ];
        }

        // 2. ORCHESTRATOR (Groq) - Upgraded to Strategic Reporting
        for (const signal of rawSignals) {
            const prompt = `SYSTEM: Wilhelm Rybak, CEO. High-Performance Strategist.
SPEAK: Clear, Executive English. Sophisticated but direct.
TASK: Analyze the provided business signal and generate a high-fidelity strategic report.
INPUT: ${signal.title} - ${signal.details}
FORMAT: JSON { 
    "headline": "Impactful Title", 
    "mainPoint": "The executive summary (Crux)", 
    "marketContext": "Detailed context of the event",
    "logicAnalysis": "Deep breakdown of why this matters for revenue/efficiency",
    "logicFramework": {
        "problemStructure": ["Point 1", "Point 2"],
        "transformationModel": ["Point 1", "Point 2"]
    },
    "conversionStep": {
        "phase1": "Initial action",
        "phase2": "Implementation",
        "phase3": "Expansion"
    },
    "strategicConclusion": "Final authoritative thought"
}`;

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
                    const analysis = JSON.parse(groqData.choices[0].message.content);

                    await prisma.intelligenceNode.create({
                        data: {
                            sector: signal.sector,
                            title: analysis.headline,
                            insight: analysis.mainPoint,
                            marketEvent: analysis.marketContext || signal.details,
                            logicAnalysis: analysis.logicAnalysis || analysis.mainPoint,
                            logicFramework: analysis.logicFramework || null,
                            conversionStep: analysis.conversionStep || null,
                            strategicConclusion: analysis.strategicConclusion || null,
                            sourceUrl: signal.url || null
                        }
                    });
                    createdCount++;
                } catch (e) {
                    console.error('[AUTONOMOUS_PULSE] AI Result Failure/Persistence Error:', e);
                }
            }
        }
        return createdCount;
    } catch (e) {
        console.error('[AUTONOMOUS_PULSE] Protocol Loop Failure:', e);
        throw e;
    }
};


// Start 6-hour Scheduler (21,600,000 ms)
setInterval(() => triggerResearchProtocol().catch(e => console.error('[SCHEDULER] Failed:', e)), 21600000);
// Trigger once on system boot to ensure data availability (Delayed 10s for stability)
setTimeout(async () => {
    try {
        console.log('[STARTUP] Initializing autonomous intelligence scan...');
        await triggerResearchProtocol("Iran Israel USA Business Impact Opportunities");
    } catch (e) {
        console.error('[STARTUP] Initial scan failed. System in stand-by.', e.message);
    }
}, 10000);

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

// Diagnostic Manual Trigger (No Auth for internal debugging)
app.get('/api/intelligence/retest', async (req, res) => {
    try {
        console.log('[DIAGNOSTIC] Manual retest requested.');
        await triggerResearchProtocol("Finance AI Business");
        res.json({ success: true, message: 'Retest pulse sent. Check ledger in 30 seconds.' });
    } catch (e) {
        res.status(500).json({ error: 'Retest failed' });
    }
});


// Like/Dislike Endpoint (One vote per person per node)
app.post('/api/intelligence/:id/vote', async (req, res) => {
    const { id } = req.params;
    const { type } = req.body; // 'LIKE' or 'DISLIKE' (case insensitive handled below)
    const sessionId = req.sessionId;
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
    try {
        if (!req.file) return res.status(400).json({ error: 'No image provided' });

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'wilbak_intelligence',
            resource_type: 'auto'
        });

        fs.unlinkSync(req.file.path); // Clean up temp file
        res.json({ success: true, url: result.secure_url });
    } catch (e) {
        console.error('Upload Error:', e);
        res.status(500).json({ error: 'Cloudinary transmission failed' });
    }
});

// Admin Intelligence Node List (Full Data)
app.get('/api/admin/intelligence/list', verifyTelegramAdmin, async (req, res) => {
    try {
        const nodes = await prisma.intelligenceNode.findMany({
            orderBy: { createdAt: 'desc' }
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
        const replacements = {
            '{{ID}}': node.id,
            '{{TITLE}}': node.title,
            '{{SECTOR}}': node.sector,
            '{{INSIGHT}}': node.insight,
            '{{MARKET_EVENT}}': node.marketEvent,
            '{{LOGIC_ANALYSIS}}': node.logicAnalysis,
            '{{CONVERSION_STEP}}': JSON.stringify(node.conversionStep || {}),
            '{{LOGIC_FRAMEWORK}}': JSON.stringify(node.logicFramework || {}),
            '{{IMAGES}}': JSON.stringify(node.images || []),
            '{{STRATEGIC_CONCLUSION}}': node.strategicConclusion || '',
            '{{DATE}}': node.createdAt.toDateString(),
            '{{URL}}': `https://${req.get('host')}/insight/${node.id}`
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
            sector: sector.toUpperCase(),
            title,
            insight,
            marketEvent: marketEvent || title,
            logicAnalysis: logicAnalysis || insight,
            logicFramework: typeof logicFramework === 'string' ? JSON.parse(logicFramework) : logicFramework,
            caseStudyEvidence: typeof caseStudyEvidence === 'string' ? JSON.parse(caseStudyEvidence) : caseStudyEvidence,
            conversionStep: typeof conversionStep === 'string' ? JSON.parse(conversionStep) : conversionStep,
            strategicConclusion: strategicConclusion || null,
            sourceUrl: sourceUrl || null,
            images: images || [],
        };

        if (createdAt) data.createdAt = new Date(createdAt);

        const node = await prisma.intelligenceNode.create({ data });
        res.json({ success: true, id: node.id });
    } catch (e) {
        console.error('Manual Creation Error:', e);
        res.status(500).json({ error: 'Intelligence injection failure: ' + e.message });
    }
});

// Admin Intelligence Node List (Full Data) - Use /export-json for full extraction
app.get('/api/admin/intelligence/list-full', verifyTelegramAdmin, async (req, res) => {
    try {
        const nodes = await prisma.intelligenceNode.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(nodes);
    } catch (e) {
        res.status(500).json({ error: 'Intelligence retrieval failure' });
    }
});

// Admin Intelligence Import (JSON Bulk)
app.post('/api/admin/intelligence/import', verifyTelegramAdmin, async (req, res) => {
    try {
        const { nodes } = req.body;
        if (!Array.isArray(nodes)) return res.status(400).json({ error: 'Invalid payload: Array expected' });

        let createdCount = 0;
        for (const item of nodes) {
            // Clean ID to allow database to regenerate or use provided if needed
            const { id, likes, dislikes, votes, ...nodeData } = item;

            await prisma.intelligenceNode.create({
                data: {
                    ...nodeData,
                    likes: likes || 0,
                    dislikes: dislikes || 0,
                    // Handle JSON fields if they are strings
                    logicFramework: typeof nodeData.logicFramework === 'string' ? JSON.parse(nodeData.logicFramework) : (nodeData.logicFramework || null),
                    caseStudyEvidence: typeof nodeData.caseStudyEvidence === 'string' ? JSON.parse(nodeData.caseStudyEvidence) : (nodeData.caseStudyEvidence || null),
                    conversionStep: typeof nodeData.conversionStep === 'string' ? JSON.parse(nodeData.conversionStep) : (nodeData.conversionStep || null),
                    images: Array.isArray(nodeData.images) ? nodeData.images : []
                }
            });
            createdCount++;
        }
        res.json({ success: true, count: createdCount });
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
            logicFramework: typeof logicFramework === 'string' ? JSON.parse(logicFramework) : logicFramework,
            caseStudyEvidence: typeof caseStudyEvidence === 'string' ? JSON.parse(caseStudyEvidence) : caseStudyEvidence,
            conversionStep: typeof conversionStep === 'string' ? JSON.parse(conversionStep) : conversionStep,
            strategicConclusion,
            sourceUrl,
            images,
            status
        };

        if (createdAt) data.createdAt = new Date(createdAt);
        if (likes !== undefined) data.likes = parseInt(likes);
        if (dislikes !== undefined) data.dislikes = parseInt(dislikes);

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

        let createdCount = 0;
        for (const item of leads) {
            const { id, ...leadData } = item;
            await prisma.lead.create({
                data: {
                    ...leadData,
                    hours: parseInt(leadData.hours || 0),
                    status: leadData.status || 'IMPORTED'
                }
            });
            createdCount++;
        }
        res.json({ success: true, count: createdCount });
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
                for (const item of results) {
                    await prisma.lead.create({
                        data: {
                            auditName: item.auditName,
                            auditEmail: item.auditEmail,
                            auditPhone: item.auditPhone,
                            industry: item.industry,
                            businessDetail: item.businessDetail,
                            hours: parseInt(item.hours || 0),
                            workflow: item.workflow,
                            status: item.status || 'IMPORTED'
                        }
                    });
                }
                fs.unlinkSync(req.file.path);
                res.json({ success: true, count: results.length });
            } catch (e) {
                res.status(500).json({ error: 'Import processing failure' });
            }
        });
});

app.get('/health', (req, res) => {
    res.json({ status: 'active', timestamp: new Date() });
});

app.listen(PORT, () => {
    console.log(`Wilbak Engineering Server running on port ${PORT}`);
});

