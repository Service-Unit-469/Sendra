import { Command } from "commander";
import { clearConfig, getAllConfig, setApiUrl, setToken } from "../lib/config";
import * as output from "../lib/output";

export function createConfigCommand(): Command {
  const config = new Command("config").description("Manage CLI configuration").addHelpText(
    "after",
    `
Examples:
  $ sendra config set api-url http://localhost:4000
  $ sendra config set token YOUR_TOKEN
  $ sendra config get
  $ sendra config clear
    `,
  );

  config
    .command("get")
    .description("Display current configuration")
    .action(() => {
      try {
        const currentConfig = getAllConfig();
        output.title("Current Configuration");
        output.keyValue("API URL", currentConfig.apiUrl);
        output.keyValue("Token", currentConfig.token ? `****${currentConfig.token.slice(-4)}` : "Not set");
      } catch (error) {
        output.error(`Failed to get configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
        process.exit(1);
      }
    });

  config
    .command("set")
    .description("Set a configuration value")
    .argument("<key>", "Configuration key (api-url or token)")
    .argument("<value>", "Configuration value")
    .action((key: string, value: string) => {
      try {
        switch (key) {
          case "api-url":
            setApiUrl(value);
            output.success(`API URL set to: ${value}`);
            break;
          case "token":
            setToken(value);
            output.success("Token saved successfully");
            break;
          default:
            output.error(`Unknown configuration key: ${key}`);
            output.info("Available keys: api-url, token");
            process.exit(1);
        }
      } catch (error) {
        output.error(`Failed to set configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
        process.exit(1);
      }
    });

  config
    .command("clear")
    .description("Clear all configuration")
    .action(() => {
      try {
        clearConfig();
        output.success("Configuration cleared");
      } catch (error) {
        output.error(`Failed to clear configuration: ${error instanceof Error ? error.message : "Unknown error"}`);
        process.exit(1);
      }
    });

  return config;
}
