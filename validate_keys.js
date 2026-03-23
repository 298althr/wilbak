require('dotenv').config();
const https = require('https');

async function validateBrightData() {
    return new Promise((resolve) => {
        const bdKey = process.env.BRIGHTDATA_API_KEY;
        const options = {
            hostname: 'api.brightdata.com',
            path: '/serp/req?zone=serp_api',
            method: 'POST',
            headers: { 'Authorization': `Bearer ${bdKey}`, 'Content-Type': 'application/json' }
        };
        const req = https.request(options, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                if (res.statusCode === 422 || res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 404) {
                    resolve(`Failed (Status ${res.statusCode}): ${d}`);
                } else {
                    resolve(`Success (Status ${res.statusCode})`);
                }
            });
        });
        req.on('error', e => resolve(`Error: ${e.message}`));
        req.write(JSON.stringify({ query: { q: 'finance us' } }));
        req.end();
    });
}

async function validateBrightDataQuery() {
    return new Promise((resolve) => {
        const bdKey = process.env.BRIGHTDATA_API_KEY;
        const options = {
            hostname: 'api.brightdata.com',
            path: '/serp/query',
            method: 'POST',
            headers: { 'Authorization': `Bearer ${bdKey}`, 'Content-Type': 'application/json' }
        };
        const req = https.request(options, res => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                if (res.statusCode === 422 || res.statusCode === 401 || res.statusCode === 403 || res.statusCode === 404) {
                    resolve(`Failed (Status ${res.statusCode}): ${d}`);
                } else {
                    resolve(`Success (Status ${res.statusCode})`);
                }
            });
        });
        req.on('error', e => resolve(`Error: ${e.message}`));
        req.write(JSON.stringify({ query: { q: 'finance us' } }));
        req.end();
    });
}


async function validateGroq() {
    return new Promise((resolve) => {
        const groqKey = process.env.GROQ_API_KEY;
        const options = {
            hostname: 'api.groq.com',
            path: '/openai/v1/models',
            method: 'GET',
            headers: { 'Authorization': `Bearer ${groqKey}` }
        };
        const req = https.request(options, res => {
            if (res.statusCode === 401) resolve('Failed (Status 401): Invalid API Key');
            else if (res.statusCode === 200) resolve('Success (Status 200)');
            else resolve(`Failed (Status ${res.statusCode})`);
        });
        req.on('error', e => resolve(`Error: ${e.message}`));
        req.end();
    });
}

async function run() {
    console.log('Testing GROQ_API_KEY...');
    const groqRes = await validateGroq();
    console.log('=> Groq Validation:', groqRes);
    
    console.log('\nTesting BRIGHTDATA_API_KEY (Zone: serp_api)...');
    const bdRes1 = await validateBrightData();
    console.log('=> BrightData (/serp/req) Validation:', bdRes1);

    console.log('\nTesting BRIGHTDATA_API_KEY (No Zone)...');
    const bdRes2 = await validateBrightDataQuery();
    console.log('=> BrightData (/serp/query) Validation:', bdRes2);
}

run();
