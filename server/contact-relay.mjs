/**
 * Contact relay — the server-side half of the Telegram connector.
 *
 * The browser never sees the bot token: it POSTs to /api/contact, this process
 * adds the credentials and calls the Telegram Bot API. Runs inside the same
 * container as nginx (nginx proxies /api/ here), Node stdlib only — no deps.
 *
 * Env:
 *   TELEGRAM_BOT_TOKEN  (required) token from @BotFather
 *   TELEGRAM_CHAT_ID    (required) destination chat / channel id
 *   RELAY_PORT          (default 8787) loopback port nginx proxies to
 */
import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.RELAY_PORT ?? 8787);
const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN ?? '').trim();
const CHAT_ID = (process.env.TELEGRAM_CHAT_ID ?? '').trim();

const MAX_BODY_BYTES = 8 * 1024;
const TELEGRAM_TIMEOUT_MS = 10_000;

/** Crude in-memory flood control: 5 submissions per IP per 10 minutes. */
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 5;
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
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
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

async function sendToTelegram(text) {
  const endpoint = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const controller = new AbortController();
  const timer = setTimeout(() => { controller.abort(); }, TELEGRAM_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => ({}));
    return { ok: response.ok && payload.ok === true, payload };
  } finally {
    clearTimeout(timer);
  }
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, {
      ok: true,
      telegram: BOT_TOKEN.length > 0 && CHAT_ID.length > 0,
      chatConfigured: CHAT_ID.length > 0,
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

  if (BOT_TOKEN.length === 0 || CHAT_ID.length === 0) {
    send(res, 503, { ok: false, error: 'telegram credentials are not configured' });
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

    if (text.length === 0) {
      send(res, 400, { ok: false, error: 'text is required' });
      return;
    }

    try {
      const { ok, payload } = await sendToTelegram(`${subject}\n\n${text}`);
      if (!ok) {
        console.error('[relay] telegram rejected:', payload?.description ?? 'unknown');
        send(res, 502, { ok: false, error: 'telegram rejected the message' });
        return;
      }
      console.info('[relay] delivered message', payload.result?.message_id);
      send(res, 200, { ok: true, messageId: payload.result?.message_id ?? null });
    } catch (error) {
      console.error('[relay] send failed:', error.message);
      send(res, 502, { ok: false, error: 'telegram unreachable' });
    }
  })();
});

server.listen(PORT, '127.0.0.1', () => {
  console.info(`[relay] listening on 127.0.0.1:${PORT} (telegram configured: ${String(BOT_TOKEN.length > 0 && CHAT_ID.length > 0)})`);
});

// Constant-time comparison helper kept for future per-client tokens.
export function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
