const http = require('http');
const { URL } = require('url');

const HEALTH_URL = process.env.HEALTH_URL || 'http://localhost:5000/health';

const checkHealth = () => {
  const url = new URL(HEALTH_URL);

  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  });

  req.on('error', () => {
    process.exit(1);
  });

  req.on('timeout', () => {
    req.destroy();
    process.exit(1);
  });

  req.end();
};

checkHealth();