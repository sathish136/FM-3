const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');
const https = require('https');

const config = getDefaultConfig(__dirname);

// Exclude pnpm temp build directories that Metro incorrectly tries to watch
const blockList = [
  /.*\/node_modules\/.*_tmp_.*\/.*/,
  /.*_tmp_\d+.*/,
];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...(Array.isArray(config.resolver?.blockList) ? config.resolver.blockList : []),
    ...blockList,
  ],
};

// Proxy /api/* requests to the API server so the web preview works
// from any LAN IP without needing direct browser access to port 8080.
const API_TARGET = process.env.API_TARGET || 'http://localhost:8080';
const targetUrl = new URL(API_TARGET);
const proxyAgent = targetUrl.protocol === 'https:' ? https : http;

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url && (req.url === '/api' || req.url.startsWith('/api/'))) {
        const options = {
          hostname: targetUrl.hostname,
          port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: targetUrl.host,
          },
        };

        const proxyReq = proxyAgent.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, {
            ...proxyRes.headers,
            'access-control-allow-origin': '*',
          });
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
          console.error('[metro proxy error]', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API proxy error: ' + err.message }));
        });

        req.pipe(proxyReq, { end: true });
      } else {
        middleware(req, res, next);
      }
    };
  },
};

module.exports = config;
