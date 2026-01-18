export const data = new sst.aws.Dynamo("SendraDatabase", {
  fields: {
    id: "string",
    type: "string",
    email: "string",
    messageId: "string",
    i_attr1: "string",
    i_attr2: "string",
    i_attr3: "string",
    i_attr4: "string",
  },
  primaryIndex: { hashKey: "type", rangeKey: "id" },
  
  localIndexes: {
    ATTR_1: { rangeKey: "i_attr1" },
    ATTR_2: { rangeKey: "i_attr2" },
    ATTR_3: { rangeKey: "i_attr3" },
    ATTR_4: { rangeKey: "i_attr4" },
  },
  globalIndexes: {
    BY_EMAIL: { hashKey: "email", rangeKey: "type" },
    BY_MESSAGE_ID: { hashKey: "messageId", rangeKey: "type" },
  },
});
