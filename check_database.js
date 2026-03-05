const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function checkLedger() {
    try {
        const count = await prisma.intelligenceNode.count();
        console.log(`Total Intelligence Nodes: ${count}`);

        if (count > 0) {
            const latest = await prisma.intelligenceNode.findFirst({
                orderBy: { createdAt: 'desc' }
            });
            console.log('--- LATEST INSIGHT ---');
            console.log(`Title: ${latest.title}`);
            console.log(`Sector: ${latest.sector}`);
            console.log(`Created At: ${latest.createdAt}`);
        } else {
            console.log('Ledger is empty. Research protocol may still be in progress.');
        }
    } catch (e) {
        console.error('Database Connection Failed:', e.message);
    } finally {
        process.exit(0);
    }
}

checkLedger();
