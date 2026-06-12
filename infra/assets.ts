export const assetsBucket = new sst.aws.Bucket("AssetsBucket", {
  access: "cloudfront",
});
