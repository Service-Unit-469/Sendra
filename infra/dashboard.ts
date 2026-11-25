import { existsSync } from "node:fs";
import { api } from "./api";
import { sendraPath } from "./paths";

const workspaceRoot = sendraPath("");
const isWorkspaceDeployment = existsSync(`${workspaceRoot}/pnpm-workspace.yaml`);

export const dashboard = new sst.aws.StaticSite("Dashboard", {
  path: sendraPath("packages/dashboard"),
  build: {
    command: isWorkspaceDeployment ? "pnpm run build" : 'node -e ""',
    output: "dist",
  },
  assets: {
    path: "dashboard",
  },
  environment: {
    VITE_AWS_REGION: "us-east-2",
    VITE_API_URI: process.env.SST_DEV ? api.url.apply((url) => `${url}/api/v1`) : "/api/v1",
  },
});
