const express = require('express');
const cors = require('cors');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const csv = require('csv-parser');
const { Parser } = require('json2csv');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Telegram Config
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_USER_ID = parseInt(process.env.TELEGRAM_USER_ID);

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

        const user = JSON.parse(urlParams.get('user'));
        if (user.id !== TELEGRAM_USER_ID) return res.status(403).json({ error: 'Unauthorized Operative' });

        req.admin = user;
        next();
    } catch (e) {
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

// CSV Export - Direct to Bot
app.get('/api/admin/leads/export', verifyTelegramAdmin, async (req, res) => {
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

const triggerResearchProtocol = async (query = "Finance Business Real Estate") => {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;

    try {
        console.log(`[AUTONOMOUS_PULSE] Initiating Research: ${query}`);
        let rawSignals = [];

        // 1. SENSOR (Bright Data)
        if (BRIGHTDATA_API_KEY) {
            const serpResponse = await fetch('https://api.brightdata.com/serp/query', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    "count": 3,
                    "query": { "q": `${query} market impact middle east conflict business opportunities` },
                    "search_engine": "google"
                })
            });
            const serpData = await serpResponse.json();
            if (serpData.organic) {
                rawSignals = serpData.organic.map(item => ({
                    sector: query.split(' ')[0].toUpperCase(),
                    title: item.title,
                    details: item.description,
                    url: item.link
                }));
            }
        }

        // Fallback context if scraper fails
        if (rawSignals.length === 0) {
            rawSignals = [
                { sector: 'STRATEGY', title: 'Global Supply Shift', details: 'Recent Middle East tensions causing a shift in logistics routes.' }
            ];
        }

        // 2. ORCHESTRATOR (Groq)
        for (const signal of rawSignals) {
            const prompt = `
                SYSTEM: Act as Wilhelm Rybak, CEO of Wilbak Engineering. 
                Speak in SIMPLE English that a computer-illiterate business owner can understand. NO JARGON.
                
                CONTEXT: Current global tensions (Iran, Israel, USA). 
                TASK: Find the POSITIVE business opportunity or "Stable Positioning" in this event.
                
                INPUT: ${signal.title} - ${signal.details}
                
                Format as JSON: 
                {
                  "headline": "Simple, bold name for the news",
                  "mainPoint": "1-sentence summary of the news in simple words",
                  "whatItMeans": "How this affects a normal business owner's money or operations",
                  "theSolution": "Why Wilbak's automation or logic is the answer to stay safe or profit"
                }
            `;

            const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${GROQ_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{ role: 'user', content: prompt }],
                    response_format: { type: 'json_object' }
                })
            });

            const groqData = await groqResponse.json();
            const analysis = JSON.parse(groqData.choices[0].message.content);

            // 3. LEDGER (Database)
            await prisma.intelligenceNode.create({
                data: {
                    sector: signal.sector,
                    title: analysis.headline,
                    insight: analysis.mainPoint,
                    marketEvent: signal.details,
                    logicAnalysis: analysis.whatItMeans,
                    conversionStep: analysis.theSolution,
                    sourceUrl: signal.url || null
                }
            });
        }
        console.log(`[AUTONOMOUS_PULSE] Protocol Complete. ${rawSignals.length} entries added.`);
    } catch (e) {
        console.error('[AUTONOMOUS_PULSE] Failure:', e);
    }
};

// Start 6-hour Scheduler (21,600,000 ms)
setInterval(() => triggerResearchProtocol(), 21600000);
// Trigger once on system boot to ensure data availability
triggerResearchProtocol("Iran Israel USA Business Impact Opportunities");

// Intelligence Hub Endpoints
app.get('/api/intelligence', async (req, res) => {
    try {
        let nodes = await prisma.intelligenceNode.findMany({
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

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

// Like/Dislike Endpoint
app.post('/api/intelligence/:id/vote', async (req, res) => {
    const { id } = req.params;
    const { type } = req.body;

    try {
        const updateData = type === 'like' ? { likes: { increment: 1 } } : { dislikes: { increment: 1 } };
        const node = await prisma.intelligenceNode.update({
            where: { id },
            data: updateData
        });
        res.json({ success: true, likes: node.likes, dislikes: node.dislikes });
    } catch (e) {
        res.status(500).json({ error: 'Vote registration failure' });
    }
});

// Admin Trigger (Manual)
app.post('/api/admin/intelligence/trigger', verifyTelegramAdmin, async (req, res) => {
    const { query } = req.body;
    try {
        await triggerResearchProtocol(query || "Finance Business");
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Manual Protocol Failure' });
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
