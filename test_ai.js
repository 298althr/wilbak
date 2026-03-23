require('dotenv').config();
const { triggerResearchProtocol, prisma } = require('./server.js');

async function test() {
    try {
        console.log('Testing Real Estate Intelligence Protocol...');
        const count = await triggerResearchProtocol('Real Estate');
        console.log(`Success: Generated ${count} insights.`);
        
        const recent = await prisma.intelligenceNode.findMany({
            take: 2,
            orderBy: { createdAt: 'desc' }
        });
        console.log('Verified Output in DB:');
        console.log(JSON.stringify(recent, null, 2));

    } catch (e) {
        console.error('Test Failed:', e.message || e);
    } finally {
        await prisma.$disconnect();
        process.exit();
    }
}

test();
