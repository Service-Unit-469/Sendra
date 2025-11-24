import { router } from "./route";

export const assetsBucket = new sst.aws.Bucket("AssetsBucket", {
  access: "cloudfront",
});

router.routeBucket("/assets", assetsBucket, {
  rewrite: {
    regex: "^/assets/(.*)$",
    to: "/$1"
  }
});