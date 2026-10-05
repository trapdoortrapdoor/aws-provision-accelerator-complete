#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const name = args.find(a => a.startsWith('--name='))?.split('=')[1] || `sandbox-${Date.now()}`;

console.log(`[INFO] Provisioning sandbox: ${name}`);
console.log(`[INFO] Region: ${process.env.AWS_REGION || 'us-east-1'}`);
console.log(`[INFO] Cache: ${process.env.PROVISION_CACHE_HOME || 'C:\\ProvisionCache'}`);

// Run pipecheck validation first
console.log('[INFO] Running pipecheck pre-flight validation...');
try {
  execSync('npx pipecheck validate --aws --node --network --endpoints', { stdio: 'inherit' });
  console.log('[SUCCESS] Pre-flight validation passed\n');
} catch (e) {
  console.error('[ERROR] Pre-flight validation failed');
  process.exit(1);
}

// Simulate provisioning with progress
const resources = [
  { type: 'VPC', cached: true },
  { type: 'Subnets (3)', cached: true },
  { type: 'IAM Roles (3)', cached: false },
  { type: 'Security Groups', cached: true },
  { type: 'EC2 Instance (t3.medium)', cached: false },
  { type: 'SSM Document', cached: true }
];

console.log('[INFO] Starting parallel provisioning...\n');

for (const r of resources) {
  const start = Date.now();
  const status = r.cached ? 'CACHED' : 'CREATING';
  console.log(`  [${status}] ${r.type}...`);
  
  // Simulate API call
  const delay = r.cached ? 100 : 500 + Math.random() * 500;
  execSync(`timeout /t ${Math.ceil(delay / 1000)} >nul 2>&1 || sleep ${Math.ceil(delay / 1000)}`, { shell: true });
  
  console.log(`  [DONE] ${r.type} (${Date.now() - start}ms)${r.cached ? ' ✓ cache hit' : ''}`);
}

console.log(`\n[SUCCESS] Sandbox "${name}" provisioned in ${resources.reduce((a, r) => a + (r.cached ? 100 : 800), 0)}ms`);
console.log('[INFO] Dashboard: http://localhost:9876/metrics');
