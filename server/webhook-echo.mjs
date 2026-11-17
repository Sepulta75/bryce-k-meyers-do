import { createServer } from 'node:http';
import { appendFileSync } from 'node:fs';

const LOG = process.argv[2] ?? 'webhook-echo.log';

createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    appendFileSync(LOG, `${new Date().toISOString()} ${req.method} ${req.url} ${body}\n`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{"ok":true}');
  });
}).listen(8099, '0.0.0.0', () => console.log('echo listening on 8099'));
