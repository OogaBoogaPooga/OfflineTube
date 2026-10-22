// api/test-key.js
export default function handler(req, res) {
  const key = process.env.SCRAPER_API_KEY;
  
  if (!key) {
    return res.status(500).json({ 
      status: 'error',
      message: 'SCRAPER_API_KEY is NOT defined in this environment' 
    });
  }
  
  // Don't return the actual key for security, just the first and last 4 characters
  const maskedKey = key.length > 8 
    ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` 
    : 'Key is too short';
    
  return res.status(200).json({ 
    status: 'success',
    message: 'SCRAPER_API_KEY is defined',
    maskedKey: maskedKey
  });
}
