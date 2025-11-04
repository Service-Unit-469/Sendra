export const assetsBucket = new sst.aws.Bucket("AssetsBucket", {
  public: true,
  transform: {
    bucket: {
      lifecycleRules: [
        {
          enabled: true,
          expirations: [
            { days: 90 },
          ],
          prefix: "temp/",
        },
      ],
    },
  },
});

