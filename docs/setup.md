# Deploying Sendra

This guide covers everything you need to deploy Sendra to your AWS account.

## Table of Contents

- [Getting Started Checklist](#-getting-started-checklist)
- [Prerequisites](#prerequisites)
- [How do I deploy Sendra?](#how-do-i-deploy-sendra)
- [AWS Setup](#aws-setup)
- [Installation](#installation)
- [Project Settings](#project-settings)
- [Deployment](#deployment)
- [Setup Sendra](#setup-sendra)
- [Troubleshooting](#troubleshooting)
- [Development Mode](#development-mode)
- [Updating Sendra](#updating-sendra)
- [Next Steps](#next-steps)
- [Getting Help](#getting-help)


## 🚦 Getting Started Checklist

- [ ] Review [Prerequisites](#prerequisites)
- [ ] Configure AWS CLI with credentials
- [ ] Clone the repository
- [ ] Install dependencies (`npm install`)
- [ ] Set up [environment variables](#environment-variables)
- [ ] Generate and set [JWT secret](#jwt-secret)
- [ ] Deploy to AWS (`npm run deploy`)
- [ ] Setup Sendra


## Prerequisites

Before deploying Sendra, ensure you have the following:

### Required Software

- **Node.js**: Version 20.x or higher
- **npm**: Version 9.8.x or higher
- **AWS CLI**: Version 2.x configured with credentials
- **AWS Account**: Active AWS account with appropriate permissions

### Required AWS Permissions

Your AWS user/role needs permissions for:

- **Lambda**: Create and manage functions
- **DynamoDB**: Create and manage tables
- **SES**: Send emails and manage identities
- **SNS**: Create and manage topics
- **SQS**: Create and manage queues
- **CloudFormation**: Deploy stacks (used by SST)
- **S3**: Store deployment artifacts
- **IAM**: Create roles and policies

## How do I deploy Sendra?

You can either deploy Sendra using this repository directly or creating your own fork if you want the control or two make modifications. 

Either way, to deploy Sendra, you use [SST](https://sst.dev/) which will deploy all of the required resources to AWS to run Sendra.

## AWS Setup

### 1. Configure AWS Credentials

Ensure your AWS CLI is configured with valid credentials:

```bash
aws configure
```

You'll need to provide:
- AWS Access Key ID
- AWS Secret Access Key
- Default region name (e.g., `us-east-2`)
- Default output format (e.g., `json`)

### 2. Verify AWS Configuration

Test your AWS credentials:

```bash
aws sts get-caller-identity
```

This should return your AWS account ID and user information.

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Service-Unit-469/Sendra.git
cd Sendra
```

### 2. Install Dependencies

Install all dependencies for the monorepo:

```bash
npm install
```

This will install dependencies for all packages in the workspace.

### 3. Build Dependencies

Build the shared packages that other packages depend on:

```bash
npm run build:deps
```

This builds the `@sendra/shared` and `@sendra/lib` packages.

## Project Settings

### 1. Configure Environment Variables

Sendra requires several environment variables for configuration. Create a `.env` file in the project root:

```bash
# Required Environment Variables

# Default sender email for system notifications
DEFAULT_EMAIL=noreply@yourdomain.com

# Application URL (used for email links)
APP_URL=https://yourdomain.com

# Optional Environment Variables

AUTH_ISSUER=sendra
AUTH_TTL_SECRET="24 h"        # 24 hours 
AUTH_TTL_PUBLIC="30 d"      # 30 days 
AUTH_TTL_USER="30 d"        # 30 days 

# Logging configuration
LOG_LEVEL=info               # Options: trace, debug, info, warn, error, fatal
LOG_PRETTY=false            # Set to true for local development

# Disable new user signups (set to "true" to disable)
DISABLE_SIGNUPS=false

# Allows multiple projects to reuse the same identity
ALLOW_DUPLICATE_PROJECT_IDENTITIES=true
```

#### Example Scenario: Single Tenant System

For a single tenant setup where only one organization is using Sendra, you may want to disable signup so that users have to be invited and allow for duplicate project identities so that your users can create multiple projects that use the same domain or email address. 

```bash
# Required Environment Variables

# Default sender email for system notifications
DEFAULT_EMAIL=noreply@yourdomain.com

# Application URL (used for email links)
APP_URL=https://yourdomain.com

# Disable new user signups (set to "true" to disable)
DISABLE_SIGNUPS=true

# Allows multiple projects to reuse the same identity
ALLOW_DUPLICATE_PROJECT_IDENTITIES=true
```

#### Example Scenario: Multi-Tenant System

If you have multiple tenants in the same system for example in a common service scenario your configuration may need to allow users signups and disallow duplicate project identities, using projects as the delineator between different tenants. 

```bash
# Required Environment Variables

# Default sender email for system notifications
DEFAULT_EMAIL=noreply@yourdomain.com

# Application URL (used for email links)
APP_URL=https://yourdomain.com

# Disable new user signups (set to "true" to disable)
DISABLE_SIGNUPS=false

# Allows multiple projects to reuse the same identity
ALLOW_DUPLICATE_PROJECT_IDENTITIES=false
```

### 2. Set the JWT Secret

Sendra uses SST's Secret feature for the JWT signing key. During deployment, you'll need to set this secret:

```bash
# Set the JWT secret (replace with your own strong secret)
npx sst secret set JwtSecret "your-strong-random-secret-key-here"
```

## Deployment

Sendra uses [SST (Serverless Stack)](https://sst.dev/) for deployment, which provides a modern way to build serverless applications on AWS.

### Deployment Stages

SST supports multiple stages (environments) for your deployment. By default, it uses your local username as the stage name.

### Deploy to Development

For development deployment:

```bash
npm run dev
```

This command:
- Builds the dependencies
- Starts SST in development mode
- Deploys to AWS with live Lambda development
- Watches for file changes and hot-reloads

### Deploy to Production

For production deployment:

```bash
# Set the stage explicitly
npx sst deploy --stage production
```

Or use the npm script:

```bash
npm run deploy
```


### Deployment Output

After successful deployment, SST will output:

```
✓  Complete
   api: https://abc123.execute-api.us-east-2.amazonaws.com
   web: https://d1234567890.cloudfront.net
```

## Setup Sendra

### 1. Create First User

Access your deployed dashboard:

```
https://your-cloudfront-url.cloudfront.net
```

Sign up for an account to create the first user.

### 2. Create First Project

After logging in:

1. Click "New Project"
2. Enter project name and URL

Now you can start using Sendra!


## Troubleshooting

### Common Issues

#### Issue: `Module not found` errors during deployment

**Solution**: Ensure dependencies are built:

```bash
npm run build:deps
npm run deploy
```

#### Issue: AWS credentials not found

**Solution**: Configure AWS CLI:

```bash
aws configure
```

#### Issue: Insufficient AWS permissions

**Solution**: Verify your AWS user has the required permissions listed in [Prerequisites](#required-aws-permissions).

#### Issue: SES emails not sending

**Solution**:
1. Verify your sender email in SES
2. Check if your account is in SES sandbox mode
3. Request production access in the SES console

### Enable Debug Logging

Set the `LOG_LEVEL` environment variable to `debug` or `trace`:

```bash
LOG_LEVEL=debug
```

Then redeploy:

```bash
npx sst deploy --stage production
```

### Remove Deployment

To completely remove a deployment:

```bash
# Remove specific stage
npx sst remove --stage staging

# Or use npm script (removes current stage)
npm run remove
```

**Warning**: This will delete all resources including the DynamoDB table and all data. Production stages are protected by default.

## Development Mode

For local development with live Lambda reloading:

```bash
npm run dev
```

This provides:
- Real-time function updates without redeployment
- Local debugging capabilities
- Console output for all Lambda invocations
- Ability to test with real AWS resources

## Updating Sendra

To update an existing deployment:

1. Pull the latest changes:
   ```bash
   git pull origin main
   ```

2. Update dependencies:
   ```bash
   npm install
   ```

3. Rebuild dependencies:
   ```bash
   npm run build:deps
   ```

4. Deploy the update:
   ```bash
   npx sst deploy --stage production
   ```

## Next Steps

- Read the [Entities Guide](./entities.md) to understand Sendra's data model
- Check the [API Documentation](./api.md) to integrate with your applications
- Review the [User Guide](./user-guide.md) to learn how to use the dashboard

## Getting Help

- **GitHub Issues**: [Report bugs or request features](https://github.com/Service-Unit-469/Sendra/issues)
- **Discussions**: Ask questions in GitHub Discussions
- **Contributing**: See [CONTRIBUTING.md](../CONTRIBUTING.md)

