import { Command } from "commander";
import ora from "ora";
import { del, get, post, put } from "../lib/api-client";
import * as output from "../lib/output";

/**
 * Generic request command that can call any API endpoint
 * This eliminates the need to maintain specific commands for every endpoint
 */
export function createRequestCommand(): Command {
  const request = new Command("request")
    .description("Make a generic API request")
    .argument("<method>", "HTTP method (GET, POST, PUT, DELETE)")
    .argument("<path>", "API path (e.g., /@me, /projects, /projects/:id/contacts)")
    .option("-d, --data <json>", "Request body as JSON string")
    .option("-p, --param <key=value...>", "Path parameters (e.g., -p id=123)")
    .option("-q, --query <key=value...>", "Query parameters (e.g., -q limit=10)")
    .option("-j, --json", "Output as JSON (default: pretty print)")
    .addHelpText(
      "after",
      `
Examples:
  # Get current user
  $ sendra request GET /@me

  # List projects
  $ sendra request GET /projects

  # Create a project
  $ sendra request POST /projects -d '{"name":"Test Project"}'

  # Get project by ID
  $ sendra request GET /projects/:id -p id=abc123

  # List contacts with query params
  $ sendra request GET /projects/:projectId/contacts -p projectId=abc123 -q limit=50

  # Update a contact
  $ sendra request PUT /projects/:projectId/contacts/:contactId -p projectId=abc123 -p contactId=xyz789 -d '{"subscribed":false}'

  # Delete a contact
  $ sendra request DELETE /projects/:projectId/contacts/:contactId -p projectId=abc123 -p contactId=xyz789
`,
    )
    .action(
      async (
        method: string,
        path: string,
        options: {
          data?: string;
          param?: string[];
          query?: string[];
          json?: boolean;
        },
      ) => {
        const spinner = ora(`${method} ${path}`).start();

        try {
          // Replace path parameters
          let finalPath = path;
          if (options.param) {
            for (const param of options.param) {
              const [key, value] = param.split("=");
              finalPath = finalPath.replace(`:${key}`, value);
            }
          }

          // Add query parameters
          if (options.query && options.query.length > 0) {
            const queryParams = new URLSearchParams();
            for (const query of options.query) {
              const [key, value] = query.split("=");
              queryParams.append(key, value);
            }
            finalPath += `?${queryParams.toString()}`;
          }

          // Parse request body
          const body = options.data ? JSON.parse(options.data) : undefined;

          // Make request based on method
          let result: unknown;
          switch (method.toUpperCase()) {
            case "GET":
              result = await get(finalPath);
              break;
            case "POST":
              result = await post(finalPath, body);
              break;
            case "PUT":
              result = await put(finalPath, body);
              break;
            case "DELETE":
              result = await del(finalPath);
              break;
            default:
              spinner.fail(`Unsupported method: ${method}`);
              output.error("Supported methods: GET, POST, PUT, DELETE");
              process.exit(1);
          }

          spinner.succeed(`${method} ${path}`);

          // Output result
          if (options.json || typeof result === "object") {
            output.json(result);
          } else {
            console.log(result);
          }
        } catch (error) {
          spinner.fail(`${method} ${path} failed`);
          output.error(error instanceof Error ? error.message : "Unknown error");
          process.exit(1);
        }
      },
    );

  return request;
}
