export const rateLimitTable = new sst.aws.Dynamo("RateLimit", {
  fields: {
    clientId: "string",
  },
  primaryIndex: { hashKey: "clientId" },
  ttl: "ttl",
});
