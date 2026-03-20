const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Set your Anthropic API key here, or via the ANTHROPIC_API_KEY environment variable
const API_KEY = process.env.ANTHROPIC_API_KEY || 'YOUR_API_KEY_HERE';
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // Allow requests from any origin (needed for browser access)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Serve the HTML tool
  if (req.method === 'GET' && req.url === '/') {
    try {
      const html = fs.readFileSync(path.join(__dirname, 'lab-classifier.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    } catch (e) {
      res.writeHead(500);
      res.end('Could not load lab-classifier.html — make sure it is in the same folder as server.js');
    }
    return;
  }

  // Proxy API calls to Anthropic
  if (req.method === 'POST' && req.url === '/api') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(body)
        }
      };

      const apiReq = https.request(options, apiRes => {
        let data = '';
        apiRes.on('data', chunk => data += chunk);
        apiRes.on('end', () => {
          res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      apiReq.on('error', e => {
        console.error('Anthropic API error:', e.message);
        res.writeHead(502);
        res.end(JSON.stringify({ error: { message: 'Upstream API error: ' + e.message } }));
      });

      apiReq.write(body);
      apiReq.end();
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`LabScope running at http://localhost:${PORT}`);
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.warn('Warning: No API key set. Set ANTHROPIC_API_KEY or edit server.js');
  }
});
