const http = require('http');

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // 1. HEALTH CHECK: Return 200 for the root path so Suga doesn't kill the app
  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', message: 'Proxy is healthy' }));
  }

  // 2. PROXY LOGIC: Process requests with ?url=
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const targetUrl = parsedUrl.searchParams.get('url');

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Missing url parameter' }));
  }

  const options = {
    method: req.method,
    headers: { ...req.headers }
  };

  delete options.headers.host;
  delete options.headers['content-length'];
  delete options.headers['origin'];
  delete options.headers['referer'];
  delete options.headers['accept-encoding'];

  if (targetUrl.includes('/youtubei/')) {
    options.method = 'POST';
  }

  if (req.method === 'POST' || options.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      options.body = body;
      makeRequest(targetUrl, options, res);
    });
  } else {
    makeRequest(targetUrl, options, res);
  }
});

function makeRequest(targetUrl, options, res) {
  fetch(targetUrl, options)
    .then(async (response) => {
      const headers = Object.fromEntries(response.headers);
      delete headers['content-encoding'];
      delete headers['content-length'];
      delete headers['x-content-type-options'];
      
      res.writeHead(response.status, headers);
      const arrayBuffer = await response.arrayBuffer();
      res.end(Buffer.from(arrayBuffer));
    })
    .catch(err => {
      console.error('Proxy error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy failed' }));
    });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on 0.0.0.0:${PORT}`);
});
