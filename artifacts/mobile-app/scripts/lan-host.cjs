const os = require('os');

/** Non-loopback IPv4 addresses on this machine (for LAN access). */
function getLanIPv4Addresses() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const ifaces of Object.values(nets)) {
    for (const net of ifaces || []) {
      const v4 = net.family === 'IPv4' || net.family === 4;
      if (v4 && !net.internal) ips.push(net.address);
    }
  }
  return [...new Set(ips)];
}

module.exports = { getLanIPv4Addresses };
