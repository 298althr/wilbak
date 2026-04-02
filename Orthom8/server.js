'use strict';

const express     = require('express');
const cors        = require('cors');
const path        = require('path');
const https       = require('https');
const fs          = require('fs');
const rateLimit   = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { Resend }  = require('resend');
require('dotenv').config();

const app    = express();
const prisma = new PrismaClient();
const resend = new Resend(process.env.RESEND_API_KEY);
const PORT   = process.env.PORT || 3000;

// ─── Telegram ────────────────────────────────────────────────────────────────
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_USER_ID   = String(process.env.TELEGRAM_USER_ID || '').trim();

const escapeHtml = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

const sendTelegramMessage = message => new Promise((resolve, reject) => {
  const body = JSON.stringify({ chat_id: TELEGRAM_USER_ID, text: message, parse_mode: 'HTML' });
  const req  = https.request({
    hostname: 'api.telegram.org', port: 443,
    path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
  }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => res.statusCode === 200 ? resolve(JSON.parse(d)) : reject(new Error(`Telegram ${res.statusCode}`)));
  });
  req.on('error', reject);
  req.write(body);
  req.end();
});

// ─── Email template helpers ───────────────────────────────────────────────────
function loadEmailTemplate(name) {
  try { return fs.readFileSync(path.join(__dirname, 'Email', name), 'utf8'); }
  catch { return null; }
}

function fillTemplate(html, data) {
  return Object.keys(data).reduce(
    (acc, key) => acc.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), data[key] != null ? String(data[key]) : ''),
    html
  );
}

// ─── Auth helper ─────────────────────────────────────────────────────────────
function requireAdminToken(req, res) {
  const token = req.headers['x-admin-token'];
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

// ─── Follow-up eligibility rules ────────────────────────────────────────────
// Returns the minimum number of days that must have passed since a prerequisite
// email before the next step is eligible to send.
const CAMPAIGN_RULES = {
  'cold-outreach': { prerequisite: null,           minDaysAfterPrereq: 0  },
  'follow-up-1':  { prerequisite: 'cold-outreach', minDaysAfterPrereq: 3  },
  'follow-up-2':  { prerequisite: 'cold-outreach', minDaysAfterPrereq: 7  },
  'follow-up-3':  { prerequisite: 'follow-up-2',   minDaysAfterPrereq: 7  },
};

// Returns leads eligible to receive `template`, filtered for:
// 1. Status not QUALIFIED or ARCHIVED (already a client or opted out)
// 2. Not already sent this template
// 3. Prerequisite template has been sent and enough days have passed
async function getEligibleLeads(template) {
  const rule = CAMPAIGN_RULES[template];
  if (!rule) throw new Error(`Unknown template: ${template}`);

  const allLeads = await prisma.orthoM8Lead.findMany({
    where: {
      status:    { notIn: ['QUALIFIED', 'ARCHIVED'] },
      emailLogs: { none: { template } }          // hasn't received this step yet
    },
    include: { emailLogs: true }
  });

  if (!rule.prerequisite) return allLeads; // cold-outreach: no prereq, all NEW leads eligible

  const cutoff = new Date(Date.now() - rule.minDaysAfterPrereq * 24 * 60 * 60 * 1000);

  return allLeads.filter(lead => {
    const prereqLog = lead.emailLogs.find(l => l.template === rule.prerequisite);
    return prereqLog && new Date(prereqLog.sentAt) <= cutoff;
  });
}

// ─── CORS ─────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://ortho-m8.com', 'https://www.ortho-m8.com',
  'http://localhost:3000', 'http://localhost:4000',
  'http://127.0.0.1:3000', 'http://127.0.0.1:4000'
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.railway.app')) return cb(null, true);
    cb(new Error(`CORS: ${origin} not permitted`));
  },
  credentials: true
}));

app.use(express.json({ limit: '1mb' }));

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.status(200).json({ status: 'HEALTHY', service: 'orthom8', timestamp: new Date() })
);

// ─── Static file serving ──────────────────────────────────────────────────────
// Serve the homepage directly at the root — no redirect visible to the user
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Serve named safe directories under /Orthom8/
// Never serve __dirname directly — that would expose .env, server.js, schema.prisma etc.
const ORTHOM8_STATIC_DIRS = [
  'the-model', 'our-team', 'Results', 'contact', 'onboarding',
  'legal', 'Risk-Matrix', 'Email'
];
ORTHOM8_STATIC_DIRS.forEach(dir => {
  app.use(`/Orthom8/${dir}`, express.static(path.join(__dirname, dir)));
});

// Serve specific root-level files only
const ORTHOM8_ROOT_FILES = [
  'index.html', 'i18n-loader.js', 'shared-nav.css', 'shared-nav.js',
  'animations.js', 'page-template.css', 'content.json', 'favicon.svg'
];
ORTHOM8_ROOT_FILES.forEach(file => {
  app.get(`/Orthom8/${file}`, (_req, res) => res.sendFile(path.join(__dirname, file)));
});
// Allow /Orthom8/ index
app.get('/Orthom8/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// /i18n-loader.js is referenced from HTML pages without /Orthom8/ prefix
app.get('/i18n-loader.js', (_req, res) => res.sendFile(path.join(__dirname, 'i18n-loader.js')));

// ─── Tracking pixel — email open ─────────────────────────────────────────────
app.get('/api/track/open', (req, res) => {
  const { lid, cid } = req.query;
  console.log(`[OPEN] lead=${lid} campaign=${cid} ua=${req.headers['user-agent']}`);
  const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, {
    'Content-Type': 'image/gif', 'Content-Length': gif.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });
  res.end(gif);
});

// ─── Tracking redirect — email click ─────────────────────────────────────────
app.get('/api/track/click', (req, res) => {
  const { lid, cid, url } = req.query;
  console.log(`[CLICK] lead=${lid} campaign=${cid} url=${url}`);
  const dest = url ? decodeURIComponent(url) : 'https://ortho-m8.com/Orthom8/';
  if (!dest.startsWith('http')) return res.status(400).send('Invalid redirect');
  res.redirect(302, dest);
});

// ─── OrthoM8 Onboarding (public form submission) ─────────────────────────────
const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 5,
  message: { error: 'Submission limit reached. Try again in 1 hour.' }
});

app.post('/api/onboarding', onboardingLimiter, async (req, res) => {
  try {
    const {
      sector, concerns, capitalRange,
      name, email, company, phone, callTime, message,
      source, utmSource, utmMedium, utmCampaign
    } = req.body;

    if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });

    const lead = await prisma.orthoM8Lead.create({
      data: {
        sector, concerns, capitalRange,
        name, email,
        company:     company     || null,
        phone:       phone       || null,
        callTime:    callTime    || null,
        message:     message     || null,
        source:      source      || 'orthom8-onboarding',
        utmSource:   utmSource   || null,
        utmMedium:   utmMedium   || null,
        utmCampaign: utmCampaign || null
      }
    });

    // Telegram notification
    const tgMsg = `
🔒 <b>NEW ORTHO'M8 LEAD</b>

<b>Name:</b> ${escapeHtml(name)}
<b>Email:</b> ${escapeHtml(email)}
<b>Company:</b> ${escapeHtml(company || '—')}
<b>Phone:</b> ${escapeHtml(phone || '—')}
<b>Sector:</b> ${escapeHtml(sector || '—')}
<b>Capital:</b> ${escapeHtml(capitalRange || '—')}
<b>Call Time:</b> ${escapeHtml(callTime || 'Flexible')}
<b>Message:</b> ${escapeHtml(message || '—')}

[ ID: ${lead.id} ]`.trim();

    await sendTelegramMessage(tgMsg).catch(e => console.error('Telegram error:', e));

    // Confirmation email via Resend
    if (process.env.RESEND_API_KEY) {
      const template = loadEmailTemplate('audit-confirmation.html');
      if (template) {
        const html = fillTemplate(template, {
          name, company: company || 'your business',
          capitalRange: capitalRange || 'your capital',
          callTime: callTime || 'flexible',
          lead_id: lead.id, campaign_id: 'onboarding-confirm'
        });
        const sent = await resend.emails.send({
          from:    "Ortho'M8 <onboarding@ortho-m8.com>",
          to:      email,
          subject: "Your capital audit request is confirmed",
          html
        }).catch(e => { console.error('Resend error:', e); return null; });

        if (sent) {
          await prisma.emailLog.create({
            data: { leadId: lead.id, template: 'audit-confirmation', campaignId: 'onboarding-confirm' }
          }).catch(() => {});
        }
      }
    }

    res.status(200).json({ success: true, leadId: lead.id });
  } catch (err) {
    console.error('Onboarding error:', err);
    res.status(500).json({ error: 'Submission failed. Please try again.' });
  }
});

// ─── Admin: list leads ────────────────────────────────────────────────────────
app.get('/api/admin/leads', async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const leads = await prisma.orthoM8Lead.findMany({
      orderBy: { createdAt: 'desc' },
      include: { emailLogs: { orderBy: { sentAt: 'asc' } } }
    });
    res.json(leads);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: update lead status ────────────────────────────────────────────────
app.patch('/api/admin/leads/:id/status', async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const lead = await prisma.orthoM8Lead.update({
      where: { id: req.params.id }, data: { status: req.body.status }
    });
    res.json({ success: true, lead });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: campaign status (who has received what) ──────────────────────────
app.get('/api/admin/campaign/status', async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const templates = ['cold-outreach', 'follow-up-1', 'follow-up-2', 'follow-up-3', 'audit-confirmation'];
    const counts = await Promise.all(
      templates.map(async t => ({
        template: t,
        sent: await prisma.emailLog.count({ where: { template: t } })
      }))
    );
    const eligibility = await Promise.all(
      ['cold-outreach', 'follow-up-1', 'follow-up-2', 'follow-up-3'].map(async t => ({
        template: t,
        eligible: (await getEligibleLeads(t).catch(() => [])).length
      }))
    );
    const totalLeads = await prisma.orthoM8Lead.count();
    const activeLeads = await prisma.orthoM8Lead.count({ where: { status: { notIn: ['QUALIFIED', 'ARCHIVED'] } } });
    res.json({ totalLeads, activeLeads, counts, eligibility });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── Admin: send campaign batch ───────────────────────────────────────────────
// POST /api/admin/campaign/send
// Body: { template: "cold-outreach", campaignId: "apr-2026-us", testEmail: "you@email.com" }
// If testEmail is provided, sends to that address only (dry run preview).
// Otherwise sends to all eligible leads.
app.post('/api/admin/campaign/send', async (req, res) => {
  if (!requireAdminToken(req, res)) return;

  const { template, campaignId, testEmail } = req.body;
  if (!template || !campaignId) return res.status(400).json({ error: 'template and campaignId required' });
  if (!CAMPAIGN_RULES[template]) return res.status(400).json({ error: `Unknown template: ${template}` });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: 'RESEND_API_KEY not set' });

  const emailHtml = loadEmailTemplate(`${template}.html`);
  if (!emailHtml) return res.status(500).json({ error: `Template file not found: ${template}.html` });

  // Subject lines per template
  const SUBJECTS = {
    'cold-outreach': 'Your capital exposure right now',
    'follow-up-1':  'Re: your capital position',
    'follow-up-2':  'The numbers behind Ortho\'M8',
    'follow-up-3':  'One last message'
  };

  // Test mode: send to a single address for preview
  if (testEmail) {
    const html = fillTemplate(emailHtml, {
      name: 'Test User', company: 'Test Company', capitalRange: '$1M',
      lead_id: 'test', campaign_id: campaignId
    });
    await resend.emails.send({
      from: "Ortho'M8 <outreach@ortho-m8.com>",
      to: testEmail, subject: `[TEST] ${SUBJECTS[template]}`, html
    });
    return res.json({ success: true, mode: 'test', sentTo: testEmail });
  }

  // Live mode: find eligible leads and send
  const leads = await getEligibleLeads(template).catch(e => {
    res.status(500).json({ error: e.message });
    return null;
  });
  if (!leads) return;

  const results = { sent: [], failed: [] };

  for (const lead of leads) {
    try {
      const html = fillTemplate(emailHtml, {
        name:         lead.name,
        company:      lead.company || lead.name,
        capitalRange: lead.capitalRange || 'your capital',
        lead_id:      lead.id,
        campaign_id:  campaignId
      });

      await resend.emails.send({
        from:    "Ortho'M8 <outreach@ortho-m8.com>",
        to:      lead.email,
        subject: SUBJECTS[template],
        html
      });

      await prisma.emailLog.create({
        data: { leadId: lead.id, template, campaignId }
      });

      // Update status from NEW to CONTACTED once first outreach is sent
      if (lead.status === 'NEW') {
        await prisma.orthoM8Lead.update({
          where: { id: lead.id }, data: { status: 'CONTACTED' }
        });
      }

      results.sent.push(lead.email);

      // Brief pause between sends to avoid Resend rate limits
      await new Promise(r => setTimeout(r, 200));

    } catch (err) {
      console.error(`Failed to send to ${lead.email}:`, err);
      results.failed.push({ email: lead.email, error: err.message });
    }
  }

  // Notify yourself on Telegram
  await sendTelegramMessage(
    `📧 <b>CAMPAIGN SENT</b>\n\nTemplate: ${template}\nCampaign: ${campaignId}\nSent: ${results.sent.length}\nFailed: ${results.failed.length}`
  ).catch(() => {});

  res.json({ success: true, template, campaignId, ...results });
});

// ─── Boot ──────────────────────────────────────────────────────────────────────
app.listen(PORT, () =>
  console.log(`Ortho'M8 running on port ${PORT}`)
);
