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
  const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

  // Log whether the key is present (but not the key itself) for debugging
  console.log('API Key Present:', !!SCRAPER_API_KEY);

  if (!SCRAPER_API_KEY) {
    return res.status(500).json({ error: 'SCRAPER_API_KEY environment variable is not set' });
  }

  const targetUrl = new URL(`${SCRAPER_API_BASE}/${path}`);
  targetUrl.searchParams.set('api_key', SCRAPER_API_KEY);
  
  for (const key in query) {
    targetUrl.searchParams.set(key, query[key]);
  }

  try {
    console.log('Requesting:', targetUrl.toString());
    const response = await fetch(targetUrl.toString());
    
    const responseBody = await response.text();
    console.log(`API Response Status: ${response.status}`);
    console.log(`API Response Body: ${responseBody}`);

    if (!response.ok) {
      // Try to parse the error from the API to give a clearer message
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorJson = JSON.parse(responseBody);
        errorMessage = errorJson.error || errorJson.message || errorMessage;
      } catch (e) {
        // Not JSON, just use the text
      }
      return res.status(response.status).json({ error: errorMessage });
    }

    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (!['content-length', 'content-encoding'].includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });

    res.send(responseBody);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy fetch failed', details: error.message });
  }
}
