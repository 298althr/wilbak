const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function debugLogic() {
    const GROQ_API_KEY = process.env.GROQ_API_KEY;
    const BRIGHTDATA_API_KEY = process.env.BRIGHTDATA_API_KEY;
    const query = "Finance";

    console.log('--- DEBUGGING HANDSHAKE (LOCAL) ---');

    try {
        console.log('\n--- SENSOR (Bright Data) ---');
        const serpResponse = await fetch('https://api.brightdata.com/serp/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${BRIGHTDATA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "count": 2,
                "query": { "q": `${query} market insights` },
                "search_engine": "google"
            })
        });

        const rawSerpText = await serpResponse.text();
        console.log('BrightData Status:', serpResponse.status);
        console.log('BrightData Payload (Start):', rawSerpText.substring(0, 500));

        if (!rawSerpText.startsWith('{')) {
            throw new Error('BrightData returned non-JSON response');
        }

        const serpData = JSON.parse(rawSerpText);

        console.log('\n--- ORCHESTRATOR (Groq) ---');
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-70b-8192',
                messages: [{ role: 'user', content: 'Say hello in JSON format: {"msg": "hello"}' }],
                response_format: { type: 'json_object' }
            })
        });

        const rawGroqText = await groqResponse.text();
        console.log('Groq Status:', groqResponse.status);
        console.log('Groq Payload:', rawGroqText);

    } catch (e) {
        console.error('Handshake Debug Failed:', e.message);
    } finally {
        process.exit(0);
    }
}

debugLogic();
