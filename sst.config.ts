/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "sendra",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: "us-east-2",
        },
      },
    };
  },
  async run() {
    const { router, dashboard, subscription, dataTable, rateLimitTable } = await import("./infra");
    return { dashboard, router, subscription, dataTable, rateLimitTable };
  },
});
