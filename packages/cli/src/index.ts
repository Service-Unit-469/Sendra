#!/usr/bin/env node

import { Command } from "commander";
import { config as dotenvConfig } from "dotenv";
import { createConfigCommand } from "./commands/config";
import { createRequestCommand } from "./commands/request";

// Load environment variables from .env file
dotenvConfig();

const program = new Command();

program
  .name("sendra")
  .description("CLI for interacting with Sendra API")
  .version("1.0.0")
  .addHelpText(
    "after",
    `
Environment Variables:
  SENDRA_API_URL    API URL (default: http://localhost:4000)
  SENDRA_TOKEN      Authentication token

Quick Start:
  $ sendra config set api-url http://localhost:4000
  $ sendra auth login -e user@example.com -p password
  $ sendra whoami
  
Generic Request (works for ANY endpoint):
  $ sendra request GET /@me
  $ sendra request POST /projects -d '{"name":"Test"}'
  $ sendra request GET /projects/:id/contacts -p id=abc123

The generic 'request' command automatically stays in sync with your API!
No need to maintain separate CLI commands for every endpoint.
`,
  );

// Register commands
program.addCommand(createConfigCommand());
program.addCommand(createRequestCommand());

// Parse arguments and execute
program.parse(process.argv);

// Show help if no command specified
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
