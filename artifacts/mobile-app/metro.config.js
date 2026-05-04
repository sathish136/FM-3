const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

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

config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Replit's proxy forwards requests with the Replit domain as Origin.
      // Expo's CorsMiddleware only allows localhost or the packager hostname.
      // Spoof the origin to localhost so Expo's check passes, then restore
      // CORS headers in the response so the browser can actually read assets.
      const origin = req.headers['origin'];
      if (origin && origin.includes('replit.dev')) {
        req.headers['origin'] = 'http://localhost:8099';
      }

      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Vary', 'Origin');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      middleware(req, res, next);
    };
  },
};

module.exports = config;
