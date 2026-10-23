// api/proxy.js
import { fetch as undiciFetch, ProxyAgent } from 'undici';

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
    // 1. Fetch the proxy list (using standard global fetch, which is safe for static text)
    const proxyListResponse = await fetch(PROXY_LIST_URL);
    const proxyText = await proxyListResponse.text();
    
    // 2. Filter and shuffle
    const proxies = proxyText.split('\n')
      .map(line => line.trim())
      .filter(line => line !== '' && line.startsWith('http'))
      .slice(0, 50); // Only take 50 to save memory

    if (proxies.length === 0) throw new Error('Proxy list empty.');
    const shuffledProxies = proxies.sort(() => 0.5 - Math.random());
    
    // 3. Strict limits to avoid Vercel's 10s timeout
    const MAX_ATTEMPTS = 2; 
    const TIMEOUT_MS = 2500; 

    const headers = { ...req.headers };
    delete headers.host; 
    delete headers.connection; 
    delete headers['content-length'];
    delete headers['accept-encoding']; 

    let method = req.method;
    if (url.includes('/youtubei/')) method = 'POST';

    const fetchOptions = { method, headers };
    if (method === 'POST' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // 4. Try proxies
    for (let i = 0; i < Math.min(MAX_ATTEMPTS, shuffledProxies.length); i++) {
      const proxyUrl = shuffledProxies[i];
      console.log(`[Proxy] Attempt ${i + 1} using: ${proxyUrl}`);
      
      try {
        const dispatcher = new ProxyAgent(proxyUrl);
        
        // Use undiciFetch explicitly so the dispatcher works
        const response = await undiciFetch(url, { 
          ...fetchOptions, 
          dispatcher,
          signal: AbortSignal.timeout(TIMEOUT_MS) 
        });
        
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
           console.warn(`[Proxy] ${proxyUrl} blocked (HTML). Trying next...`);
           continue; 
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
        console.warn(`[Proxy] ${proxyUrl} failed: ${error.message}`);
      }
    }

    throw new Error(`All ${MAX_ATTEMPTS} attempts failed.`);
  } catch (error) {
    console.error('[Proxy] Fatal error:', error);
    // Return the actual error message so you can see it in the frontend
    res.status(500).json({ error: 'Proxy failed', details: error.message });
  }
}
