// api/proxy.js
export default async function handler(req, res) {
  // Set CORS headers for the browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { path, ...query } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  const SCRAPER_API_BASE = 'https://api.youtubescraperapi.com/api/v1/youtube';
  // Your API key should be an environment variable on Vercel for security
  const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY; 

  const targetUrl = new URL(`${SCRAPER_API_BASE}/${path}`);
  if (SCRAPER_API_KEY) {
    targetUrl.searchParams.set('api_key', SCRAPER_API_KEY);
  }
  for (const key in query) {
    targetUrl.searchParams.set(key, query[key]);
  }

  try {
    const response = await fetch(targetUrl.toString());
    
    res.status(response.status);
    response.headers.forEach((value, key) => {
      // Do not forward content-length or encoding headers
      if (!['content-length', 'content-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    const data = await response.text(); // Use text to preserve the JSON body
    res.send(data);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy failed' });
  }
}
