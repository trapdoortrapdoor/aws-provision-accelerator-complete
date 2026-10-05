const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { validate } = require('pipecheck');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PROVISION_DASHBOARD_PORT || 9876;
const WS_PORT = PORT + 1;

// Validate environment on startup
async function validateEnvironment() {
  try {
    console.log('[INFO] Running pipecheck environment validation...');
    const result = await validate({
      node: '>=18',
      aws: { cli: true, credentials: true, endpoints: true },
      network: { egress: false, dns: true }
    });
    if (!result.valid) {
      console.error('[ERROR] Environment validation failed:', result.errors);
      process.exit(1);
    }
    console.log('[SUCCESS] Environment validation passed');
  } catch (error) {
    console.error('[ERROR] pipecheck validation error:', error.message);
    process.exit(1);
  }
}

// Metrics storage
const metrics = {
  provisions: [],
  cache: { hits: 0, misses: 0 },
  apiCalls: {},
  startTime: Date.now()
};

// REST endpoints
app.get('/metrics', (req, res) => {
  res.json({
    uptime: Date.now() - metrics.startTime,
    provisions: metrics.provisions.slice(-50),
    cacheHitRate: metrics.cache.hits / (metrics.cache.hits + metrics.cache.misses) || 0,
    apiCalls: metrics.apiCalls
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/provision/start', express.json(), (req, res) => {
  const { sandboxName, config } = req.body;
  const provision = {
    id: sandboxName,
    startTime: Date.now(),
    status: 'running',
    resources: [
      { type: 'VPC', status: 'pending' },
      { type: 'Subnets', status: 'pending' },
      { type: 'IAM Roles', status: 'pending' },
      { type: 'Security Groups', status: 'pending' },
      { type: 'EC2 Instances', status: 'pending' }
    ]
  };
  metrics.provisions.push(provision);
  broadcast({ type: 'provision_start', data: provision });
  res.json({ success: true, provision });
});

app.post('/provision/update', express.json(), (req, res) => {
  const { sandboxName, resource, status, cached } = req.body;
  const provision = metrics.provisions.find(p => p.id === sandboxName);
  if (provision) {
    const r = provision.resources.find(res => res.type === resource);
    if (r) r.status = status;
    if (cached) metrics.cache.hits++; else metrics.cache.misses++;
    broadcast({ type: 'provision_update', data: { sandboxName, resource, status, cached } });
  }
  res.json({ success: true });
});

app.post('/provision/complete', express.json(), (req, res) => {
  const { sandboxName, duration, cost } = req.body;
  const provision = metrics.provisions.find(p => p.id === sandboxName);
  if (provision) {
    provision.status = 'complete';
    provision.duration = duration;
    provision.cost = cost;
    provision.endTime = Date.now();
    broadcast({ type: 'provision_complete', data: provision });
  }
  res.json({ success: true });
});

// WebSocket
wss.on('connection', (ws) => {
  console.log('[INFO] Dashboard client connected');
  ws.send(JSON.stringify({ type: 'init', data: metrics }));
  ws.on('close', () => console.log('[INFO] Dashboard client disconnected'));
});

function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) client.send(data);
  });
}

// Simulated provisioning for demo
async function simulateProvisioning() {
  await new Promise(r => setTimeout(r, 2000));
  const sandboxes = ['agent-eval-001', 'agent-eval-002', 'agent-eval-003'];
  for (const name of sandboxes) {
    await simulateSingleProvision(name);
    await new Promise(r => setTimeout(r, 3000));
  }
}

async function simulateSingleProvision(name) {
  const resources = ['VPC', 'Subnets', 'IAM Roles', 'Security Groups', 'EC2 Instances'];
  await fetch('http://localhost:' + PORT + '/provision/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sandboxName: name })
  });

  for (const resource of resources) {
    const cached = Math.random() > 0.3;
    await fetch('http://localhost:' + PORT + '/provision/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandboxName: name, resource, status: 'complete', cached })
    });
    await new Promise(r => setTimeout(r, cached ? 200 : 800));
  }

  await fetch('http://localhost:' + PORT + '/provision/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sandboxName: name, duration: Math.floor(Math.random() * 5000) + 3000, cost: (Math.random() * 2 + 0.5).toFixed(2) })
  });
}

// Startup
async function main() {
  await validateEnvironment();
  
  server.listen(PORT, () => {
    console.log(`[INFO] Dashboard server running on http://localhost:${PORT}`);
    console.log(`[INFO] WebSocket on ws://localhost:${WS_PORT}`);
    console.log('[INFO] Metrics endpoint: http://localhost:' + PORT + '/metrics');
    
    // Simulate demo provisions
    simulateProvisioning().catch(console.error);
  });
}

main().catch(console.error);
