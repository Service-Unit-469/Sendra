import { api } from "./api";

export const dashboard = new sst.aws.StaticSite("Dashboard", {
  path: "packages/dashboard",
  build: {
    command: "pnpm run build",
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
