const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000;
const ADMIN = process.env.ADMIN_KEY || 'admin';
const FILE = path.join(__dirname, 'data.json');
let heads = [];
try { heads = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
const save = () => fs.writeFile(FILE, JSON.stringify(heads), () => {});
const clients = new Set();
const push = (ev, d) => clients.forEach(r => r.write(`event: ${ev}\ndata: ${JSON.stringify(d)}\n\n`));
const page = n => fs.readFileSync(path.join(__dirname, 'public', n), 'utf8');
const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  if (req.method === 'GET' && u.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(page('wall.html')); }
  if (req.method === 'GET' && u.pathname === '/dessiner') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(page('draw.html')); }
  if (req.method === 'GET' && u.pathname === '/api/heads') return json(res, 200, heads);
  if (req.method === 'GET' && u.pathname === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': ok\n\n'); clients.add(res);
    const ka = setInterval(() => res.write(': ping\n\n'), 25000);
    return req.on('close', () => { clearInterval(ka); clients.delete(res); });
  }
  if (req.method === 'POST' && u.pathname === '/api/heads') {
    let b = ''; req.on('data', c => { b += c; if (b.length > 400000) req.destroy(); });
    return req.on('end', () => {
      try {
        const { img } = JSON.parse(b);
        if (!/^data:image\/png;base64,[A-Za-z0-9+\/=]+$/.test(img)) throw 0;
        const h = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), img };
        heads.push(h); if (heads.length > 500) heads.shift();
        save(); push('add', h); json(res, 200, { ok: true });
      } catch { json(res, 400, { ok: false }); }
    });
  }
  if (req.method === 'DELETE' && u.pathname.startsWith('/api/heads/')) {
    if (u.searchParams.get('key') !== ADMIN) return json(res, 403, { ok: false });
    const id = u.pathname.split('/').pop();
    heads = heads.filter(h => h.id !== id); save(); push('del', { id }); return json(res, 200, { ok: true });
  }
  res.writeHead(404); res.end('Introuvable');
}).listen(PORT, () => console.log('Mur de têtes sur http://localhost:' + PORT));
