// api/proxy.js
import { HttpsProxyAgent } from 'https-proxy-agent';

// Reliable, constantly updated list of free proxies
const PROXY_LIST_URL = 'https://cdn.jsdelivr.net/gh/proxifly/free-proxy-list@main/proxies/all/data.txt';

export default async function handler(req, res) {
  // Set CORS headers for the browser
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
    // 1. Fetch the latest proxy list
    const proxyListResponse = await fetch(PROXY_LIST_URL);
    const proxyText = await proxyListResponse.text();
    const proxies = proxyText.split('\n')
      .map(line => line.trim())
      .filter(line => line !== '' && line.startsWith('http')); // Only keep HTTP/HTTPS proxies

    if (proxies.length === 0) {
      throw new Error('Proxy list is empty or failed to load.');
    }

    // 2. Shuffle the proxies to distribute the load
    const shuffledProxies = proxies.sort(() => 0.5 - Math.random());
    const MAX_ATTEMPTS = 5; // Try up to 5 proxies per request

    // 3. Prepare the request details
    const headers = { ...req.headers };
    delete headers.host; 
    delete headers.connection; 
    delete headers['content-length'];

    let method = req.method;
    // Force POST for YouTube's internal API endpoints
    if (url.includes('/youtubei/')) {
      method = 'POST';
    }

    const fetchOptions = {
      method,
      headers,
      // Give each proxy up to 8 seconds to respond before giving up
      signal: AbortSignal.timeout(8000) 
    };

    if (method === 'POST' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    // 4. Loop through proxies until one works
    for (let i = 0; i < Math.min(MAX_ATTEMPTS, shuffledProxies.length); i++) {
      const proxyUrl = shuffledProxies[i];
      console.log(`[Proxy Rotation] Attempt ${i + 1} using: ${proxyUrl}`);

      try {
        const agent = new HttpsProxyAgent(proxyUrl);
        const response = await fetch(url, { ...fetchOptions, agent });

        // If we get a successful response from YouTube, forward it to the frontend
        if (response.ok) {
          console.log(`[Proxy Rotation] Success with proxy: ${proxyUrl}`);
          
          res.status(response.status);
          response.headers.forEach((value, key) => {
            if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key.toLowerCase())) {
              res.setHeader(key, value);
            }
          });
          
          const data = await response.arrayBuffer();
          return res.send(Buffer.from(data));
        } else {
          // If YouTube blocks this proxy (403/400), try the next one
          console.warn(`[Proxy Rotation] Proxy ${proxyUrl} blocked by YouTube (Status: ${response.status})`);
        }
      } catch (error) {
        // If the proxy is dead or times out, try the next one
        console.warn(`[Proxy Rotation] Proxy ${proxyUrl} failed: ${error.message}`);
      }
    }

    // 5. If all attempts fail, return an error
    throw new Error(`All ${MAX_ATTEMPTS} proxy attempts failed.`);
    
  } catch (error) {
    console.error('[Proxy Rotation] Error:', error);
    res.status(500).json({ error: 'Proxy failed after multiple attempts' });
  }
}
