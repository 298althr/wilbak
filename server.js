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
