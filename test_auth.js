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

const initData = keys.map(k => `${k}=${encodeURIComponent(params[k])}`).join('&') + `&hash=${hash}`;
process.stdout.write(initData);
