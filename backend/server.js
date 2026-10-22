const http = require('http');

const PORT = process.env.PORT || 3000; // SnapDeploy uses 3000 by default[reference:3]

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if (req.url === '/' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok' }));
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const targetUrl = parsedUrl.searchParams.get('url');
  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Missing url parameter' }));
  }

  const options = { method: req.method, headers: { ...req.headers } };
  delete options.headers.host;
  delete options.headers['content-length'];
  delete options.headers['accept-encoding']; // Prevent compression issues

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
      headers['Access-Control-Allow-Origin'] = res.getHeader('Access-Control-Allow-Origin') || '*';
      headers['Access-Control-Allow-Credentials'] = 'true';
      delete headers['content-encoding'];
      delete headers['content-length'];
      
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
