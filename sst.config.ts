/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: process.env.SENDRA_APP_NAME ?? "sendra",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          region: process.env.SENDRA_AWS_REGION ?? "us-east-2",
        },
      },
    };
  },
  async run() {
    const { deploySendra } = await import("./sst");
    return deploySendra();
  },
});
