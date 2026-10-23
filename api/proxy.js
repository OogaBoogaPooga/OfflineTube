// api/proxy.js
import { HttpsProxyAgent } from 'https-proxy-agent';

const PROXY_LIST_URL = 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/all/data.txt';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;
  if (!url) {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    const proxyListResponse = await fetch(PROXY_LIST_URL);
    const proxyText = await proxyListResponse.text();
    const proxies = proxyText.split('\n')
      .map(line => line.trim())
      .filter(line => line !== '' && line.startsWith('http'));

    if (proxies.length === 0) throw new Error('Proxy list is empty.');

    // Shuffle proxies to distribute the load
    const shuffledProxies = proxies.sort(() => 0.5 - Math.random());
    const MAX_ATTEMPTS = 10; // Increased attempts to find a working proxy

    const headers = { ...req.headers };
    delete headers.host; 
    delete headers.connection; 
    delete headers['content-length'];
    delete headers['accept-encoding']; // Prevent compressed HTML errors

    let method = req.method;
    if (url.includes('/youtubei/')) method = 'POST';

    const fetchOptions = {
      method,
      headers,
      signal: AbortSignal.timeout(6000) // 6 seconds per proxy
    };

    if (method === 'POST' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    for (let i = 0; i < Math.min(MAX_ATTEMPTS, shuffledProxies.length); i++) {
      const proxyUrl = shuffledProxies[i];
      
      try {
        const agent = new HttpsProxyAgent(proxyUrl);
        const response = await fetch(url, { ...fetchOptions, agent });
        
        // Check if YouTube returned an HTML page (bot check/consent)
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
           console.warn(`[Proxy] ${proxyUrl} got blocked by YouTube (HTML). Trying next...`);
           continue; // Skip this proxy and try the next one
        }

        if (response.ok) {
          console.log(`[Proxy] Success with ${proxyUrl}`);
          res.status(response.status);
          response.headers.forEach((value, key) => {
            if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
              res.setHeader(key, value);
            }
          });
          const data = await response.arrayBuffer();
          return res.send(Buffer.from(data));
        }
      } catch (error) {
        console.warn(`[Proxy] ${proxyUrl} connection failed. Trying next...`);
      }
    }

    throw new Error(`All ${MAX_ATTEMPTS} proxy attempts failed.`);
  } catch (error) {
    console.error('[Proxy] Fatal error:', error);
    res.status(500).json({ error: 'Proxy failed after multiple attempts' });
  }
}
