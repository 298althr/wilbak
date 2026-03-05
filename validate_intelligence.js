const crypto = require('crypto');
require('dotenv').config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const USER_ID = parseInt(process.env.TELEGRAM_USER_ID);

const userStr = JSON.stringify({ id: USER_ID, first_name: 'Wilhelm' });
const auth_date = Math.floor(Date.now() / 1000).toString();

const params = {
    auth_date,
    query_id: 'AAAAAA',
    user: userStr
};

const keys = Object.keys(params).sort();
const dataCheckString = keys.map(k => `${k}=${params[k]}`).join('\n');

const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

const initData = keys.map(k => `${k}=${params[k]}`).join('&') + `&hash=${hash}`;

async function triggerSync() {
    console.log('--- TRIGGERING SYNC INTELLIGENCE ---');
    console.log(`Query: Finance`);

    try {
        const response = await fetch('https://wilbak.up.railway.app/api/admin/intelligence/trigger', {
            method: 'POST',
            headers: {
                'X-Telegram-Init-Data': initData,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: 'Finance' })
        });

        const result = await response.json();
        console.log('Result:', JSON.stringify(result, null, 2));

        if (response.ok) {
            console.log('\n--- FETCHING LEDGER STATE ---');
            const ledgerResponse = await fetch('https://wilbak.up.railway.app/api/intelligence');
            const nodes = await ledgerResponse.json();
            console.log(`Node Count: ${nodes.length}`);
            if (nodes.length > 0) {
                console.log('Latest Node Title:', nodes[0].title);
            }
        }
    } catch (e) {
        console.error('Test Execution Failure:', e);
    }
}

triggerSync();
