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
      }
    };
  },
  async run() {
    
    const web =  await import("./infra/web");
    await import("./infra/email-topic");
    await import("./infra/task-queue");
    const {api} =  await import("./infra/api");
    const {dynamo} =  await import("./infra/dynamo");
    
    return {
      api,
      web,
      dynamo,
    };
  },
});
