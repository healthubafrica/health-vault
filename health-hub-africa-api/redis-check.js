const Redis = require('ioredis');

const url = process.env.REDIS_URL;
console.log('Connecting to Redis...');
console.log('URL (masked):', url ? url.replace(/:([^@]+)@/, ':****@') : 'NOT SET');

const client = new Redis(url, {
  tls: {},
  connectTimeout: 10000,
  maxRetriesPerRequest: 1,
  retryStrategy: function() { return null; }
});

client.on('ready', function() {
  console.log('✅ REDIS CONNECTED');
  client.ping().then(function(res) {
    console.log('✅ PING =>', res);
    client.disconnect();
    process.exit(0);
  }).catch(function(err) {
    console.error('❌ PING failed:', err.message);
    process.exit(1);
  });
});

client.on('error', function(err) {
  console.error('❌ REDIS ERROR:', err.message);
  process.exit(1);
});

setTimeout(function() {
  console.error('❌ TIMEOUT: Could not connect within 10s');
  process.exit(1);
}, 12000);
