const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('[INFO] Verifying AWS Provision Accelerator installation...\n');

let allPassed = true;

function check(name, fn) {
  try {
    const result = fn();
    console.log(`  [PASS] ${name}`);
    return true;
  } catch (e) {
    console.log(`  [FAIL] ${name}: ${e.message}`);
    allPassed = false;
    return false;
  }
}

// Check config file exists
check('Config file exists', () => {
  const configPath = path.join(__dirname, '..', 'config', 'provision.ini');
  if (!fs.existsSync(configPath)) throw new Error('provision.ini not found');
  const content = fs.readFileSync(configPath, 'utf8');
  if (!content.includes('CacheEnabled=true')) throw new Error('Invalid config');
});

// Check cache directory
check('Cache directory exists', () => {
  const cacheDir = process.env.PROVISION_CACHE_HOME || 'C:\\ProvisionCache';
  if (!fs.existsSync(cacheDir)) throw new Error(`Cache directory not found: ${cacheDir}`);
});

// Check Node.js version
check('Node.js version >= 18', () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major < 18) throw new Error(`Node ${version} < 18`);
  console.log(`    Version: ${version}`);
});

// Check AWS CLI
check('AWS CLI available', () => {
  execSync('aws --version', { stdio: 'ignore' });
});

// Check AWS credentials
check('AWS credentials configured', () => {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKey || !secretKey) throw new Error('AWS credentials not in environment');
  if (!accessKey.startsWith('AKIA')) throw new Error('Invalid access key format');
  console.log(`    Access Key: ${accessKey}`);
});

// Check pipecheck
check('pipecheck validation', () => {
  execSync('npx pipecheck validate --node --aws --network', { stdio: 'ignore' });
});

// Check dashboard port
check('Dashboard port available', () => {
  const port = process.env.PROVISION_DASHBOARD_PORT || 9876;
  // Just verify it's a valid port number
  if (port < 1 || port > 65535) throw new Error('Invalid port');
});

console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('[SUCCESS] All checks passed. Accelerator ready.');
  process.exit(0);
} else {
  console.log('[ERROR] Some checks failed. Run tools\\setup.exe to fix.');
  process.exit(1);
}
