const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugProtocol() {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
    const query = "Iran Israel USA Business";

    console.log('--- DEBUGGING INTELLIGENCE PROTOCOL (LOCAL) ---');

    try {
        console.log('\n--- 1. SENSOR (Bright Data) ---');
        const serpResponse = await fetch('https://api.brightdata.com/serp/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "count": 2,
                "query": { "q": `${query} market impact middle east conflict business opportunities` },
                "search_engine": "google"
            })
        });

        // Check if Serp Response is OK
        if (!serpResponse.ok) {
            throw new Error(`BrightData HTTP Error: ${serpResponse.status}`);
        }

        const rawSerpText = await serpResponse.text();
        console.log('BrightData Raw Status:', serpResponse.status);

        if (!rawSerpText) {
            throw new Error('BrightData returned empty response');
        }

        let serpData;
        try {
            serpData = JSON.parse(rawSerpText);
        } catch (e) {
            throw new Error(`BrightData JSON Parse Failed: ${rawSerpText.substring(0, 100)}`);
        }

        console.log('Organic Results Count:', serpData.organic?.length || 0);

        const testSignal = {
            title: serpData.organic?.[0]?.title || "Regional Tension Insight",
            details: serpData.organic?.[0]?.description || "Recent shifts in global logistics observed.",
            sector: "STRATEGY"
        };

        console.log('\n--- 2. ORCHESTRATOR (Groq) ---');
        const prompt = `
        SYSTEM: Act as Wilhelm Rybak, CEO of Wilbak Engineering. 
        Speak in SIMPLE English that a computer-illiterate business owner can understand. NO JARGON.
        CONTEXT: Current global tensions (Iran, Israel, USA). 
        TASK: Find the POSITIVE business opportunity in this event.
        INPUT: ${testSignal.title} - ${testSignal.details}
        Format as JSON: 
        { "headline": "string", "mainPoint": "string", "whatItMeans": "string", "theSolution": "string" }
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

        if (!groqResponse.ok) {
            throw new Error(`Groq HTTP Error: ${groqResponse.status}`);
        }

        const groqData = await groqResponse.json();
        console.log('Groq Status:', groqResponse.status);

        const analysis = JSON.parse(groqData.choices[0].message.content);
        console.log('Groq Analysis Generated:', analysis.headline);

        console.log('\n--- 3. LEDGER (Prisma/DB) ---');
        const newNode = await prisma.intelligenceNode.create({
            data: {
                sector: testSignal.sector,
                title: analysis.headline,
                insight: analysis.mainPoint,
                marketEvent: testSignal.details,
                logicAnalysis: analysis.whatItMeans,
                conversionStep: analysis.theSolution,
                sourceUrl: "https://debug.wilbak.com"
            }
        });

        console.log('Node Saved with ID:', newNode.id);

    } catch (e) {
        console.error('HANDSHAKE CRITICAL FAILURE:', e.message);
    } finally {
        await prisma.$disconnect();
        process.exit(0);
    }
}

debugProtocol();
