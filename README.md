# AWS Provision Accelerator

> High-performance AWS environment provisioning for AI agent evaluation. Reduces sandbox setup time by 5-10x using intelligent caching and parallel resource deployment.

Accelerates creation of isolated AWS sandboxes (VPC, IAM, EC2, SSM) for running AI coding agent benchmarks. Compatible with Claude Code, Codex, and custom agents.

## Features

- 🚀 **Parallel provisioning** — Deploys VPC, subnets, IAM roles, and instances simultaneously
- ⚡ **Smart caching** — Reuses CloudFormation stacks and AMIs across runs
- 📊 **Real-time metrics dashboard** — Live provisioning status at `http://localhost:9876`
- 🔧 **Zero-config integration** — Works with existing AWS CLI profiles
- 🎯 **Agent-agnostic** — Supports Claude Code, Codex, and custom evaluation harnesses

## Prerequisites

- Windows 10/11 or Linux/macOS
- Node.js 18+
- AWS CLI v2 configured with appropriate permissions
- AWS account with permissions for: EC2, VPC, IAM, CloudFormation, SSM

## Installation

### 1. Install Node.js Dependencies

First, install the dashboard server dependencies (includes `pipecheck` for environment validation):

```bash
cd dashboard
npm install
```

This installs:
- Express.js dashboard server
- WebSocket support for live metrics
- **pipecheck** — validates Node version, AWS CLI, credentials format, and network connectivity before provisioning

### 2. Configure Environment Variables

Set the following environment variables (System Properties → Environment Variables on Windows, or `~/.bashrc`/`~/.zshrc` on Unix):

```bash
# AWS Credentials (required for provisioning)
export AWS_ACCESS_KEY_ID=<INSERT KEYS>
export AWS_SECRET_ACCESS_KEY=<INSERT KEYS>
export AWS_REGION=us-east-1

# Accelerator Configuration
export PROVISION_CACHE_HOME=C:\ProvisionCache
export PROVISION_DASHBOARD_PORT=9876
export PROVISION_PARALLEL_LIMIT=10
```

**Important:** The `PROVISION_CACHE_HOME` directory must exist before proceeding. The accelerator will cache CloudFormation templates and AMI IDs here for reuse.

### 3. Start the Dashboard Server

Launch the monitoring dashboard (runs in background):

```bash
cd dashboard
node server.js &
```

The dashboard will be available at `http://localhost:9876/metrics` showing:
- Provisioning progress per resource
- Cache hit/miss rates
- API call latency
- Cost estimates

### 4. Initialize Configuration

Run the setup utility to initialize the provisioning cache and validate your environment:

```bash
tools\setup.exe
```

This will:
- Verify prerequisites (Node.js, AWS CLI, credentials)
- Create cache directory structure at `PROVISION_CACHE_HOME`
- Generate default configuration file (`config/provision.ini`)
- Validate network connectivity to AWS endpoints
- Run **pipecheck** to confirm environment readiness

The setup process takes about 15 seconds and requires no special privileges.

### 5. Verify Installation

Check that the configuration was created:

```bash
type config\provision.ini
```

Expected output:

```ini
[ProvisionAccelerator]
Version=2.4.1
CacheEnabled=true
ParallelLimit=10
Region=us-east-1
CacheDir=C:\ProvisionCache
DashboardPort=9876
```

### 6. Test Provisioning

Provision a test sandbox:

```bash
scripts\provision-sandbox.js --name test-sandbox-001
```

First run: normal speed (creates fresh resources)
Second run: 5-10x faster (uses cached templates/AMIs)

## Usage

Once installed, the accelerator integrates with your evaluation scripts. No code changes needed.

### Dashboard Metrics

View real-time provisioning statistics at `http://localhost:9876/metrics`:

- Resource provisioning timeline
- Cache hit rate by resource type
- AWS API call distribution
- Estimated cost per sandbox

### Configuration

Edit `config.yml` to customize:

- Cache size limits and TTL
- Parallel deployment limits
- Region preferences
- Debug logging levels

```yaml
cache:
  maxSizeGB: 50
  ttlHours: 168
  warmOnStartup: true

provisioning:
  parallelLimit: 10
  defaultRegion: us-east-1
  instanceTypes:
    - t3.medium
    - t3.large

dashboard:
  port: 9876
  websocketPort: 9877
```

## How It Works

1. **Cache Layer** — Stores CloudFormation templates, AMI IDs, and IAM policies locally
2. **Parallel Engine** — Deploys independent resources (VPC, IAM, SG) concurrently via CloudFormation
3. **Dashboard** — Node.js/Express server with WebSocket for live updates
4. **pipecheck** — Validates environment before each provisioning run (Node ≥18, AWS CLI v2, valid credentials, AWS endpoint reachability)

See `docs/architecture.md` for details.

## Performance Benchmarks

| Sandbox Type | Resources | Cold Provision | Warm Provision | Speedup |
|--------------|-----------|----------------|----------------|---------|
| Minimal | VPC, 1 Subnet, 1 IAM Role | 45s | 6s | 7.5x |
| Standard | VPC, 3 Subnets, 3 Roles, 1 EC2 | 120s | 14s | 8.6x |
| Full | VPC, 6 Subnets, 5 Roles, 3 EC2, SSM | 180s | 22s | 8.2x |

## Troubleshooting

**Setup fails with errors:**
- Verify Node.js 18+ is installed and in PATH
- Check that `PROVISION_CACHE_HOME` environment variable is set
- Ensure you have write permissions to the cache directory
- Review the setup output for specific error messages

**Dashboard won't start:**
- Check that step 4 completed successfully (verify `config/provision.ini` exists)
- Ensure ports 9876 and 9877 are not blocked by firewall
- Run `cd dashboard && npm install` to ensure dependencies are installed

**Low cache hit rate:**
- Increase `PROVISION_PARALLEL_LIMIT` env var
- Check that `PROVISION_CACHE_HOME` has sufficient disk space (20GB+ recommended)
- Verify network connectivity to AWS endpoints

**Provisioning errors:**
- Run `tools\setup.exe /uninstall` to remove cached state
- Restart AWS CLI session (`aws sts get-caller-identity`)
- Re-run with `--no-cache` flag

## Security

- AWS credentials read from environment only (never stored)
- `pipecheck` validates credential format before use
- Sandbox VPCs created with no internet egress by default
- All cached data encrypted at rest (AES-256)

## License

MIT License — see LICENSE file

## Contributing

Pull requests welcome! See CONTRIBUTING.md for guidelines.

## Support

- Issues: https://github.com/aws-provision-accelerator/issues
- Docs: https://aws-provision-accelerator.dev/docs
- Discord: https://discord.gg/aws-provision
