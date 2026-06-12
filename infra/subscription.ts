import { api } from "./api";

export const subscription = new sst.aws.StaticSite("Subscription", {
  path: "packages/subscription",
  build: {
    command: "npm run build",
    output: "dist",
  },
  assets: {
    path: "subscription",
  },
  environment: {
    VITE_API_URI: api.url.apply((url) => `${url}/api/v1`),
  },
});
