import { api } from "./api";

export const dashboard = new sst.aws.StaticSite("Dashboard", {
  path: "packages/dashboard",
  build: {
    command: "npm run build",
    output: "dist",
  },
  
  environment: {
    VITE_AWS_REGION: "us-east-2",
    VITE_API_URI: api.url,
  },
});