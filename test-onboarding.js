/**
 * OrthoM8 Onboarding — End-to-End Test
 * Tests: DB connection, POST /api/onboarding, record verification, cleanup
 *
 * Run: node test-onboarding.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const BASE_URL = 'http://localhost:4000';
const prisma = new PrismaClient();

let pass = 0;
let fail = 0;
const results = [];

function log(label, ok, detail = '') {
  const icon = ok ? '✓' : '✗';
  const line = `  ${icon} ${label}${detail ? `  →  ${detail}` : ''}`;
  console.log(line);
  results.push({ label, ok });
  ok ? pass++ : fail++;
}

async function run() {
  console.log('\n═══════════════════════════════════════════════');
  console.log("  ORTHO'M8  —  Onboarding Integration Test");
  console.log('═══════════════════════════════════════════════\n');

  // ── 1. Direct DB connection ──────────────────────────────
  console.log('[ 1 ]  Database connection');
  try {
    await prisma.$connect();
    log('Prisma connected to Railway PostgreSQL', true);
  } catch (err) {
    log('Prisma connect', false, err.message);
    console.log('\n  Cannot proceed without DB. Aborting.\n');
    await prisma.$disconnect();
    process.exit(1);
  }

  // ── 2. OrthoM8Lead table exists ──────────────────────────
  console.log('\n[ 2 ]  Table check — OrthoM8Lead');
  try {
    const count = await prisma.orthoM8Lead.count();
    log(`Table exists, current row count: ${count}`, true);
  } catch (err) {
    log('OrthoM8Lead table accessible', false, err.message);
  }

  // ── 3. Server health ─────────────────────────────────────
  console.log('\n[ 3 ]  Server health');
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    log(`GET /health → ${res.status}`, res.ok, body.status);
  } catch (err) {
    log('Server reachable', false, err.message);
  }

  // ── 4. POST /api/onboarding — full payload ───────────────
  console.log('\n[ 4 ]  POST /api/onboarding (full payload)');
  const payload = {
    sector: 'energy',
    concerns: ['oil', 'currency', 'geopolitical'],
    capitalRange: '1m-5m',
    name: 'Test Client',
    email: 'test@orthom8-ci.internal',
    company: 'OrthoM8 CI',
    phone: '+1 555 000 0001',
    callTime: 'Morning (9am – 12pm)',
    message: 'Automated test submission — safe to delete.',
    source: 'orthom8-onboarding'
  };

  let createdId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await res.json();

    log(`Status ${res.status}`, res.status === 200, JSON.stringify(body));

    if (body.leadId) {
      createdId = body.leadId;
      log(`leadId returned: ${createdId}`, true);
    } else {
      log('leadId returned', false, 'missing in response');
    }
  } catch (err) {
    log('POST /api/onboarding', false, err.message);
  }

  // ── 5. Verify record in DB ───────────────────────────────
  console.log('\n[ 5 ]  Verify record persisted in database');
  if (createdId) {
    try {
      const record = await prisma.orthoM8Lead.findUnique({ where: { id: createdId } });

      log('Record found by leadId', !!record);
      if (record) {
        log(`name: "${record.name}"`,          record.name === payload.name);
        log(`email: "${record.email}"`,        record.email === payload.email);
        log(`sector: "${record.sector}"`,      record.sector === payload.sector);
        log(`capitalRange: "${record.capitalRange}"`, record.capitalRange === payload.capitalRange);
        log(`concerns stored (JSON array)`,    Array.isArray(record.concerns) && record.concerns.length === 3,
            JSON.stringify(record.concerns));
        log(`status: "${record.status}"`,      record.status === 'NEW');
        log(`source: "${record.source}"`,      record.source === 'orthom8-onboarding');
        log(`createdAt present`,               !!record.createdAt, record.createdAt?.toISOString());
      }
    } catch (err) {
      log('DB record verification', false, err.message);
    }
  } else {
    log('DB verification skipped — no leadId', false, 'step 4 must pass first');
  }

  // ── 6. POST — missing required fields (should 400) ───────
  console.log('\n[ 6 ]  Validation — missing name/email (expect 400)');
  try {
    const res = await fetch(`${BASE_URL}/api/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sector: 'energy' })   // no name, no email
    });
    log(`Status 400 on missing fields`, res.status === 400, `got ${res.status}`);
  } catch (err) {
    log('Validation check', false, err.message);
  }

  // ── 7. Cleanup test record ───────────────────────────────
  console.log('\n[ 7 ]  Cleanup — delete test record');
  if (createdId) {
    try {
      await prisma.orthoM8Lead.delete({ where: { id: createdId } });
      log(`Test record ${createdId} deleted`, true);
    } catch (err) {
      log('Cleanup', false, err.message);
    }
  } else {
    log('Cleanup skipped — nothing to delete', true);
  }

  // ── Summary ───────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════');
  console.log(`  Results:  ${pass} passed   ${fail} failed`);
  console.log('═══════════════════════════════════════════════\n');

  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(async (err) => {
  console.error('Unexpected error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
