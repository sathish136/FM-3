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

      // Rewrite bundle URLs in EAS-format manifests from http:// to https://.
      // Android's expo-updates OkHttp client sends plain HTTP, but Replit's
      // external proxy only accepts TLS — so the download fails with
      // java.io.IOException unless the URL already uses https://.
      const accept = req.headers['accept'] || '';
      if (accept.includes('application/expo+json')) {
        const chunks = [];
        const _write = res.write.bind(res);
        const _end = res.end.bind(res);

        res.write = function (chunk) {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
          return true;
        };

        res.end = function (chunk) {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
          let body = Buffer.concat(chunks).toString('utf8');
          try {
            const manifest = JSON.parse(body);
            const toHttps = (url) => (url ? url.replace(/^http:\/\//, 'https://') : url);
            if (manifest.launchAsset) {
              manifest.launchAsset.url = toHttps(manifest.launchAsset.url);
            }
            if (Array.isArray(manifest.assets)) {
              manifest.assets = manifest.assets.map((a) => ({ ...a, url: toHttps(a.url) }));
            }
            body = JSON.stringify(manifest);
          } catch (e) {}
          res.removeHeader('content-length');
          res.removeHeader('transfer-encoding');
          _end(body);
        };
      }

      middleware(req, res, next);
    };
  },
};

module.exports = config;
