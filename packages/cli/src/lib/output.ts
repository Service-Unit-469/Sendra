import chalk from "chalk";

/**
 * Display utilities for consistent CLI output
 */

export function success(message: string): void {
  console.log(chalk.green("✓"), message);
}

export function error(message: string): void {
  console.error(chalk.red("✗"), message);
}

export function info(message: string): void {
  console.log(chalk.blue("ℹ"), message);
}

export function warning(message: string): void {
  console.log(chalk.yellow("⚠"), message);
}

export function title(message: string): void {
  console.log(chalk.bold.cyan(message));
}

export function json(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

export function table(data: Record<string, unknown>[]): void {
  if (data.length === 0) {
    info("No data to display");
    return;
  }

  console.table(data);
}

export function keyValue(key: string, value: string): void {
  console.log(chalk.gray(`${key}:`), chalk.white(value));
}
