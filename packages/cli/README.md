# Sendra CLI

Command-line interface for interacting with the Sendra API. Uses a **generic request command** that automatically works with any API endpoint - no maintenance required!

## Installation

```bash
# From the monorepo root
npm install
npm run build --workspace=packages/cli

# Or from this directory
npm install
npm run build
```

## Quick Start

### 1. Configure & Login

```bash
sendra config set api-url http://localhost:4000
sendra config set token YOUR_TOKEN
```

### 2. Make Requests

```bash
# Get project by ID
sendra request GET /projects/:id -p id=abc123
```

## Commands

### Configuration

```bash
# View current configuration
sendra config get

# Set API URL
sendra config set api-url https://api.sendra.io

# Set authentication token manually
sendra config set token YOUR_TOKEN

# Clear all configuration
sendra config clear
```

### Generic Request (The Main Command)

The `request` command works with **ANY API endpoint**:

```bash
sendra request <METHOD> <PATH> [options]

Options:
  -d, --data <json>         Request body as JSON string
  -p, --param <key=value>   Path parameters (can be repeated)
  -q, --query <key=value>   Query parameters (can be repeated)
  -j, --json                Output as JSON
```

### Usage Examples

#### Users
```bash
# Get current user
sendra request GET /@me
```

#### Projects
```bash

# Get specific project
sendra request GET /projects/:id -p id=PROJECT_ID
```

#### Contacts
```bash
# List contacts for a project
sendra request GET /projects/:projectId/contacts -p projectId=PROJECT_ID

# Get specific contact
sendra request GET /projects/:projectId/contacts/:contactId -p projectId=PROJECT_ID -p contactId=CONTACT_ID

# Create a contact
sendra request POST /projects/:projectId/contacts -p projectId=PROJECT_ID -d '{"email":"new@example.com","data":{"name":"John"}}'

# Update a contact
sendra request PUT /projects/:projectId/contacts/:contactId -p projectId=PROJECT_ID -p contactId=CONTACT_ID -d '{"subscribed":false}'

# Delete a contact
sendra request DELETE /projects/:projectId/contacts/:contactId -p projectId=PROJECT_ID -p contactId=CONTACT_ID
```

#### Any Other Endpoint

The beauty is that **any endpoint works immediately**:

```bash
# Templates
sendra request GET /projects/:id/templates -p id=PROJECT_ID
sendra request POST /projects/:id/templates -p id=PROJECT_ID -d '{"name":"Welcome"}'

# Campaigns
sendra request GET /projects/:id/campaigns -p id=PROJECT_ID
sendra request POST /projects/:id/campaigns/:cid/send -p id=PROJECT_ID -p cid=CAMPAIGN_ID

# Actions, Events, Groups, Analytics - all work!
sendra request GET /projects/:id/actions -p id=PROJECT_ID
sendra request GET /projects/:id/events -p id=PROJECT_ID
sendra request GET /projects/:id/analytics -p id=PROJECT_ID -q period=week
```

## Error Handling

The CLI provides clear error messages and uses appropriate exit codes:

- `0` - Success
- `1` - Error (authentication, API, validation, etc.)

All errors are displayed in red with a ✗ symbol for easy identification.

## Features

✅ **Type-safe** - Uses TypeScript and shared types from `@sendra/shared`  
✅ **Same API client** - Uses Hono client like the dashboard  
✅ **Configuration management** - Stores API URL and token securely  
✅ **Environment variables** - Supports `.env` files and env vars  
✅ **JSON output** - All commands support `--json` flag for scripting  
✅ **Pretty output** - Colored, formatted output for human readability  
✅ **Progress indicators** - Spinners for long-running operations  
✅ **Help text** - Comprehensive help for all commands  

## Troubleshooting

### "Authentication failed"

Make sure you set the token:

```bash
sendra config set token YOUR_TOKEN
```

### "Connection refused"

Check that the API is running and the URL is correct:

```bash
sendra config get
```

Update if needed:

```bash
sendra config set api-url http://localhost:4000
```

### "Command not found: sendra"

Make sure you've built the CLI and it's in your PATH:

```bash
npm run build
npm link  # Makes 'sendra' available globally
```

## Contributing

When adding new commands:

1. Create a new file in `src/commands/`
2. Export a function that returns a `Command` instance
3. Register it in `src/index.ts`
4. Update this README with examples

See existing commands for patterns and best practices.

