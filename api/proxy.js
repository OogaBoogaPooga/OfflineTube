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
    const proxyListResponse = await fetch(PROXY_LIST_URL);
    const proxyText = await proxyListResponse.text();
    
    const proxies = proxyText.split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('http://') || line.startsWith('https://'));

    if (proxies.length === 0) {
      return res.status(200).json({ proxy_error: 'Proxy list is empty' });
    }
    
    const shuffled = proxies.sort(() => 0.5 - Math.random()).slice(0, 2); // Try only 2 proxies
    
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

    let lastError = 'No attempts made';
    
    for (const proxyUrl of shuffled) {
      try {
        console.log(`[Proxy] Trying: ${proxyUrl}`);
        const dispatcher = new ProxyAgent(proxyUrl);
        
        const response = await undiciFetch(url, { 
          ...fetchOptions, 
          dispatcher,
          signal: AbortSignal.timeout(2500) // 2.5s timeout
        });
        
        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.includes('text/html')) {
             console.log(`[Proxy] Success with: ${proxyUrl}`);
             res.status(response.status);
             response.headers.forEach((value, key) => {
               if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
                 res.setHeader(key, value);
               }
             });
             const data = await response.arrayBuffer();
             return res.send(Buffer.from(data));
          } else {
            lastError = `HTML block from ${proxyUrl}`;
          }
        } else {
          lastError = `Status ${response.status} from ${proxyUrl}`;
        }
      } catch (e) {
        lastError = `Connection failed to ${proxyUrl}: ${e.message}`;
      }
    }
    
    // If all proxies fail, return 200 with the error so the frontend can see it
    return res.status(200).json({ proxy_error: lastError });
    
  } catch (error) {
    return res.status(200).json({ proxy_error: `Fatal error: ${error.message}` });
  }
}
