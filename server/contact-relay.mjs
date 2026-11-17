/**
 * Contact relay — the server side of the site's messaging connectors.
 *
 * The browser never sees a credential: it POSTs to /api/contact, this process
 * fans the message out to whichever channels are configured, and reports how
 * each one went. Node stdlib only — no dependencies.
 *
 * Channels (all optional; each is enabled purely by its env vars being present):
 *   telegram  TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 *   webhook   CONNECTOR_WEBHOOK_URL   (Slack, Zapier, Make, Sheets, any CRM)
 *   email     RESEND_API_KEY + CONTACT_EMAIL_TO + CONTACT_EMAIL_FROM
 *
 * Env:
 *   RELAY_PORT        default 8787 (nginx proxies /api/ here)
 *   RELAY_TIMEOUT_MS  per-channel timeout, default 10000
 */
import { createServer } from 'node:http';

const PORT = Number(process.env.RELAY_PORT ?? 8787);
const TIMEOUT_MS = Number(process.env.RELAY_TIMEOUT_MS ?? 10_000);

const env = (name) => (process.env[name] ?? '').trim();

const TELEGRAM_BOT_TOKEN = env('TELEGRAM_BOT_TOKEN');
const TELEGRAM_CHAT_ID = env('TELEGRAM_CHAT_ID');
const WEBHOOK_URL = env('CONNECTOR_WEBHOOK_URL');
const RESEND_API_KEY = env('RESEND_API_KEY');
const EMAIL_TO = env('CONTACT_EMAIL_TO');
const EMAIL_FROM = env('CONTACT_EMAIL_FROM');

const MAX_BODY_BYTES = 8 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 10;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) ?? { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW_MS;
  }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > RATE_MAX;
}

function send(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

async function postJson(url, headers, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = null;
    try { payload = JSON.parse(text); } catch { payload = text.slice(0, 200); }
    return { ok: response.ok, status: response.status, payload };
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------- channels -------------------------------- */

const channels = [
  {
    id: 'telegram',
    label: 'Telegram',
    ready: TELEGRAM_BOT_TOKEN.length > 0 && TELEGRAM_CHAT_ID.length > 0,
    detail: TELEGRAM_CHAT_ID.length > 0 ? 'chat configured' : 'TELEGRAM_CHAT_ID missing',
    async deliver({ subject, text }) {
      const { ok, status, payload } = await postJson(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {},
        { chat_id: TELEGRAM_CHAT_ID, text: `${subject}\n\n${text}`, disable_web_page_preview: true },
      );
      return {
        ok: ok && payload?.ok === true,
        detail: ok ? `delivered (message_id ${payload?.result?.message_id ?? '?'})` : `telegram HTTP ${status}`,
      };
    },
  },
  {
    id: 'webhook',
    label: 'Webhook',
    ready: WEBHOOK_URL.length > 0,
    detail: WEBHOOK_URL.length > 0 ? 'endpoint configured' : 'CONNECTOR_WEBHOOK_URL missing',
    async deliver(message) {
      const { ok, status } = await postJson(WEBHOOK_URL, {}, {
        source: 'bryce-k-meyers-do',
        channel: 'webhook',
        subject: message.subject,
        text: message.text,
        replyTo: message.replyTo,
        receivedAt: new Date().toISOString(),
      });
      return { ok, detail: `webhook HTTP ${status}` };
    },
  },
  {
    id: 'email',
    label: 'Email',
    ready: RESEND_API_KEY.length > 0 && EMAIL_TO.length > 0 && EMAIL_FROM.length > 0,
    detail: EMAIL_TO.length > 0 ? `to ${EMAIL_TO}` : 'CONTACT_EMAIL_TO missing',
    async deliver({ subject, text, replyTo }) {
      const { ok, status } = await postJson('https://api.resend.com/emails',
        { Authorization: `Bearer ${RESEND_API_KEY}` },
        { from: EMAIL_FROM, to: [EMAIL_TO], reply_to: replyTo, subject, text });
      return { ok, detail: `resend HTTP ${status}` };
    },
  },
];

const activeChannels = () => channels.filter((c) => c.ready);

/* -------------------------------- server --------------------------------- */

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, {
      ok: true,
      channels: channels.map((c) => ({ id: c.id, enabled: c.ready, detail: c.detail })),
      active: activeChannels().map((c) => c.id),
    });
    return;
  }

  if (url.pathname !== '/api/contact') {
    send(res, 404, { ok: false, error: 'not found' });
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { Allow: 'POST' });
    res.end();
    return;
  }

  const ip = (req.headers['x-forwarded-for'] ?? '').toString().split(',')[0].trim()
    || req.socket.remoteAddress
    || 'unknown';

  if (rateLimited(ip)) {
    send(res, 429, { ok: false, error: 'too many requests' });
    return;
  }

  if (activeChannels().length === 0) {
    send(res, 503, { ok: false, error: 'no delivery channel is configured' });
    return;
  }

  void (async () => {
    let body;
    try {
      body = await readJson(req);
    } catch (error) {
      send(res, 400, { ok: false, error: error.message });
      return;
    }

    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : 'Website enquiry';
    const replyTo = typeof body?.replyTo === 'string' ? body.replyTo.trim() : '';

    if (text.length === 0) {
      send(res, 400, { ok: false, error: 'text is required' });
      return;
    }

    const message = { subject, text, replyTo };
    const results = await Promise.all(
      activeChannels().map(async (channel) => {
        try {
          const outcome = await channel.deliver(message);
          if (!outcome.ok) console.error(`[relay] ${channel.id} failed: ${outcome.detail}`);
          return { channel: channel.id, ok: outcome.ok, detail: outcome.detail };
        } catch (error) {
          console.error(`[relay] ${channel.id} threw: ${error.message}`);
          return { channel: channel.id, ok: false, detail: error.message };
        }
      }),
    );

    const delivered = results.filter((r) => r.ok);
    if (delivered.length === 0) {
      send(res, 502, { ok: false, error: 'every channel rejected the message', results });
      return;
    }

    console.info(`[relay] delivered via ${delivered.map((r) => r.channel).join(', ')}`);
    send(res, 200, { ok: true, results });
  })();
});

server.listen(PORT, '127.0.0.1', () => {
  console.info(
    `[relay] listening on 127.0.0.1:${PORT} | active channels: ${activeChannels().map((c) => c.id).join(', ') || 'none'}`,
  );
});
