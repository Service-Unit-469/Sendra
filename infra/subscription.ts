import { api } from "./api";
import { router } from "./route";

export const subscription = new sst.aws.StaticSite("Subscription", {
  path: "packages/subscription",
  build: {
    command: "npm run build",
    output: "dist",
  },
  router: {
    instance: router,
    path: '/subscription'
  },
  environment: {
    VITE_API_URI: api.url,
  },
});
