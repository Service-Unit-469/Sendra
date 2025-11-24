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
    const { router } = await import("./infra/route");
    const { subscription } = await import("./infra/subscription");
    const { dashboard } = await import("./infra/dashboard");
    return {
      dashboard,
      router,
      subscription,
    };
  },
});
