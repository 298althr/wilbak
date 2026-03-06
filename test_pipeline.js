const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');
require('dotenv').config();

// We'll mimic the trigger function logic or just call the endpoint if we can bypass auth
// Since I can't easily bypass verifyTelegramAdmin without the secret, I will manually run the logic in this script

async function runTest() {
    console.log('--- STARTING PIPELINE VALIDATION ---');

    // 1. Check DB Connection
    try {
        const count = await prisma.intelligenceNode.count();
        console.log('Current nodes in DB:', count);
    } catch (e) {
        console.error('Database connection failed:', e.message);
        process.exit(1);
    }

    // 2. Define the exact logic from server.js
    const triggerResearchProtocol = async (query = "Finance Business") => {
        const GROQ_API_KEY = process.env.GROQ_API_KEY;
        const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
        let createdCount = 0;

        if (!GROQ_API_KEY) throw new Error('GROQ_API_KEY missing');

        const securePost = (url, headers, body) => {
            return new Promise((resolve) => {
                const parsedUrl = new URL(url);
                const options = {
                    hostname: parsedUrl.hostname,
                    path: parsedUrl.pathname + (parsedUrl.search || ''),
                    method: 'POST',
                    headers: { ...headers, 'Content-Type': 'application/json' }
                };
                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (d) => data += d);
                    res.on('end', () => resolve({ ok: res.statusCode < 300, data }));
                });
                req.on('error', (e) => resolve({ ok: false }));
                req.write(JSON.stringify(body));
                req.end();
            });
        };

        console.log(`Testing scan for: ${query}`);
        let rawSignals = [];

        // BrightData Part
        if (BRIGHTDATA_API_KEY) {
            const resA = await securePost('https://api.brightdata.com/serp/query',
                { 'Authorization': `Bearer ${BRIGHTDATA_API_KEY}` },
                { "count": 1, "query": { "q": `${query} market news` }, "search_engine": "google" }
            );
            if (resA.ok) {
                const serp = JSON.parse(resA.data);
                if (serp.organic) {
                    rawSignals = serp.organic.slice(0, 1).map(item => ({
                        sector: query.toUpperCase(),
                        title: item.title,
                        details: item.description || item.snippet,
                        url: item.link
                    }));
                }
            }
        }

        if (rawSignals.length === 0) {
            console.log('No signals from scraper, using fallback...');
            rawSignals = [{ sector: query.toUpperCase(), title: 'Test Signal', details: 'Test details for pipeline validation.' }];
        }

        // Groq Part
        const signal = rawSignals[0];
        const prompt = `Wilhelm Rybak CEO. Simple English. JSON format: { "headline": "T", "mainPoint": "P", "whatItMeans": "W", "theSolution": "S" }. INPUT: ${signal.title}`;

        const groqRes = await securePost('https://api.groq.com/openai/v1/chat/completions',
            { 'Authorization': `Bearer ${GROQ_API_KEY}` },
            {
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: 'json_object' }
            }
        );

        if (groqRes.ok) {
            const groqData = JSON.parse(groqRes.data);
            const analysis = JSON.parse(groqData.choices[0].message.content);
            await prisma.intelligenceNode.create({
                data: {
                    sector: signal.sector,
                    title: 'VALIDATION: ' + analysis.headline,
                    insight: analysis.mainPoint,
                    marketEvent: signal.details,
                    logicAnalysis: analysis.whatItMeans,
                    conversionStep: analysis.theSolution,
                    sourceUrl: signal.url || null
                }
            });
            return 1;
        }
        return 0;
    };

    try {
        const sectors = ['REAL ESTATE', 'FINANCE'];
        for (const s of sectors) {
            const result = await triggerResearchProtocol(s);
            console.log(`Result for ${s}: ${result ? 'SUCCESS' : 'FAILED'}`);
        }

        const finalCount = await prisma.intelligenceNode.count();
        console.log('Final Intel Count:', finalCount);
    } catch (err) {
        console.error('Test script crashed:', err.message);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
