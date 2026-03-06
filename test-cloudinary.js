const cloudinary = require('cloudinary').v2;
require('dotenv').config();

async function testHandshake() {
    console.log('Testing Cloudinary Handshake...');
    const url = process.env.CLOUDINARY_URL;
    if (!url) {
        console.error('No CLOUDINARY_URL found in .env');
        process.exit(1);
    }

    try {
        // Manually parse the URL to be safe, though SDK should do it
        const parts = url.split('://')[1].split('@');
        const [apiKey, apiSecret] = parts[0].split(':');
        const cloudName = parts[1];

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true
        });

        console.log('Cloud Name:', cloudinary.config().cloud_name);

        console.log('Fetching usage data...');
        const result = await cloudinary.api.usage();
        console.log('Handshake Successful!');
        console.log('Plan:', result.plan);
        process.exit(0);
    } catch (error) {
        console.error('Handshake Failed:', error.message);
        if (error.error) {
            console.error('Details:', error.error);
        }
        process.exit(1);
    }
}

testHandshake();
