import { existsSync } from "node:fs";
import { api } from "./api";
import { sendraPath } from "./paths";

const workspaceRoot = sendraPath("");
const isWorkspaceDeployment = existsSync(`${workspaceRoot}/pnpm-workspace.yaml`);

export const subscription = new sst.aws.StaticSite("Subscription", {
  path: sendraPath("packages/subscription"),
  build: {
    command: isWorkspaceDeployment ? "pnpm run build" : 'node -e ""',
    output: "dist",
  },
  assets: {
    path: "subscription",
  },
  environment: {
    VITE_API_URI: api.url.apply((url) => `${url}/api/v1`),
  },
});
