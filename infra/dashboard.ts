import { router } from "./route";
import { getApiUrl } from "./util";

export const dashboard = new sst.aws.StaticSite("Dashboard", {
  path: "packages/dashboard",
  build: {
    command: "npm run build",
    output: "dist",
  },
  router: {
    instance: router,
    path: "/dashboard",
  },
  environment: {
    VITE_AWS_REGION: "us-east-2",
    VITE_API_URI: getApiUrl(),
  },
});
