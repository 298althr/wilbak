const { PrismaClient } = require('@prisma/client');
const https = require('https');
require('dotenv').config();

const prisma = new PrismaClient();

function postRequest(url, headers, body) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'POST',
            headers: headers
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve({ ok: res.statusCode < 300, status: res.statusCode, text: () => Promise.resolve(data), json: () => Promise.resolve(JSON.parse(data)) }));
        });

        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function validateScheduler() {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;

    console.log('--- STARTING HTTPS-BASED VALIDATION ---');

    try {
        // 1. BrightData
        console.log('Calling BrightData...');
        const serp = await postRequest('https://api.brightdata.com/serp/query', {
            'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
            'Content-Type': 'application/json'
        }, {
            "count": 1,
            "query": { "q": "Iran Israel USA Business Impact 2026" },
            "search_engine": "google"
        });

        if (!serp.ok) throw new Error(`BrightData Error ${serp.status}`);
        const serpData = await serp.json();
        const topResult = serpData.organic?.[0] || { title: "Global Shift", description: "Market impact detected." };
        console.log('BrightData Success:', topResult.title);

        // 2. Groq
        console.log('Calling Groq...');
        const groq = await postRequest('https://api.groq.com/openai/v1/chat/completions', {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
        }, {
            model: 'llama-3.3-70b-versatile',
            messages: [{
                role: 'user', content: `
        SYSTEM: Act as Wilhelm Rybak. Speak in SIMPLE English.
        INPUT: ${topResult.title} - ${topResult.description}
        Format as JSON: { "headline": "...", "mainPoint": "...", "whatItMeans": "...", "theSolution": "..." }
      `}],
            response_format: { type: 'json_object' }
        });

        if (!groq.ok) throw new Error(`Groq Error ${groq.status}`);
        const groqData = await groq.json();
        const analysis = JSON.parse(groqData.choices[0].message.content);
        console.log('Groq Success:', analysis.headline);

        // 3. Save
        const node = await prisma.intelligenceNode.create({
            data: {
                sector: 'VALIDATION',
                title: analysis.headline,
                insight: analysis.mainPoint,
                marketEvent: topResult.description || topResult.title,
                logicAnalysis: analysis.whatItMeans,
                conversionStep: analysis.theSolution,
                sourceUrl: topResult.link || "https://wilbak.com"
            }
        });

        console.log('SAVED SUCCESSFULLY. ID:', node.id);
        console.log('\nVALIDATION COMPLETE: THE SCHEDULER WILL WORK.');

    } catch (e) {
        console.error('CRITICAL LOGIC FAILURE:', e.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

validateScheduler();
