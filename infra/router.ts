/// <reference path="../.sst/platform/config.d.ts" />

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { z } from 'zod';
import { api } from "./api";
import { assetsBucket } from "./assets";
import { dashboard } from "./dashboard";
import { subscription } from "./subscription";

const MANAGED_CACHING_OPTIMIZED = "658327ea-f89d-4fab-a63d-7e88639e58f6";
const MANAGED_CACHING_DISABLED = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad";
const MANAGED_ALL_VIEWER_EXCEPT_HOST = "b689b0a8-53d0-40ab-baf2-68738e2966ac";

export interface SingleDomainCloudFrontArgs {
  name: string;
  enableWaf?: boolean;
  aliases?: pulumi.Input<pulumi.Input<string>[]>;
  certificateArn?: pulumi.Input<string>;
}

const createSingleDomainCloudFrontDistribution = (
  { aliases, certificateArn, enableWaf, name }: SingleDomainCloudFrontArgs,
) => {
  const normalizedStage = $app.stage.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const cloudfrontProvider = new aws.Provider(`${name}CloudFrontRegion`, {
    region: 'us-east-1',
  });

  const waf = enableWaf
    ? new aws.wafv2.WebAcl(
      `${name}WebAcl`,
      {
        scope: "CLOUDFRONT",
        defaultAction: { allow: {} },
        rules: [
          {
            name: "AWSManagedRulesCommonRuleSet",
            priority: 1,
            overrideAction: { none: {} },
            statement: {
              managedRuleGroupStatement: {
                vendorName: "AWS",
                name: "AWSManagedRulesCommonRuleSet",
              },
            },
            visibilityConfig: {
              cloudwatchMetricsEnabled: true,
              sampledRequestsEnabled: true,
              metricName: `${name}-${normalizedStage}-CommonRules`,
            },
          },
        ],
        visibilityConfig: {
          cloudwatchMetricsEnabled: true,
          sampledRequestsEnabled: true,
          metricName: `${name}-${normalizedStage}-WebAcl`,
        },
      },
      { provider: cloudfrontProvider },
    )
    : undefined;

  const oac = new aws.cloudfront.OriginAccessControl(`${name}Oac`, {
    name: `${name.toLowerCase()}-${normalizedStage}-oac`,
    description: "OAC for S3 origins",
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4",
  });

  const apiDomainName = pulumi.output(api.url).apply((url) => new URL(url).host);

  const origins: pulumi.Input<aws.types.input.cloudfront.DistributionOrigin>[] = [
    {
      originId: "api-origin",
      domainName: apiDomainName,
      customOriginConfig: {
        httpPort: 80,
        httpsPort: 443,
        originProtocolPolicy: "https-only",
        originSslProtocols: ["TLSv1.2"],
      },
    },
    {
      originId: "assets-origin",
      domainName: assetsBucket.nodes.bucket.bucketRegionalDomainName,
      originAccessControlId: oac.id,
      s3OriginConfig: {
        originAccessIdentity: "",
      },
    },
  ];

  const orderedCacheBehaviors: pulumi.Input<aws.types.input.cloudfront.DistributionOrderedCacheBehavior>[] = [
    {
      pathPattern: "/api/v1/*",
      targetOriginId: "api-origin",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      cachePolicyId: MANAGED_CACHING_DISABLED,
      originRequestPolicyId: MANAGED_ALL_VIEWER_EXCEPT_HOST,
    },
    {
      pathPattern: "/assets/*",
      targetOriginId: "assets-origin",
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      cachePolicyId: MANAGED_CACHING_OPTIMIZED,
    },
  ];

  let defaultTargetOriginId = "api-origin";
  if (dashboard.nodes.assets) {
    defaultTargetOriginId = 'dashboard-origin';
    origins.push(
      {
        originId: "dashboard-origin",
        domainName: dashboard.nodes.assets.nodes.bucket.bucketRegionalDomainName,
        originAccessControlId: oac.id,
        s3OriginConfig: {
          originAccessIdentity: "",
        },
      });
    orderedCacheBehaviors.push(
      {
        pathPattern: "/dashboard*",
        targetOriginId: "dashboard-origin",
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS"],
        cachedMethods: ["GET", "HEAD"],
        compress: true,
        cachePolicyId: MANAGED_CACHING_OPTIMIZED,
      })
  }
  if (subscription.nodes.assets) {
    origins.push(
      {
        originId: "subscription-origin",
        domainName: subscription.nodes.assets.nodes.bucket.bucketRegionalDomainName,
        originAccessControlId: oac.id,
        s3OriginConfig: {
          originAccessIdentity: "",
        },
      });
    orderedCacheBehaviors.push(
      {
        pathPattern: "/subscription*",
        targetOriginId: "subscription-origin",
        viewerProtocolPolicy: "redirect-to-https",
        allowedMethods: ["GET", "HEAD", "OPTIONS"],
        cachedMethods: ["GET", "HEAD"],
        compress: true,
        cachePolicyId: MANAGED_CACHING_OPTIMIZED,
      },)
  }


  const distribution = new aws.cloudfront.Distribution(`${name}Distribution`, {
    enabled: true,
    isIpv6Enabled: true,
    comment: `${name} ${$app.stage} distribution`,
    defaultRootObject: "dashboard/index.html",
    aliases,
    origins,
    defaultCacheBehavior: {
      targetOriginId: defaultTargetOriginId,
      viewerProtocolPolicy: "redirect-to-https",
      allowedMethods: ["GET", "HEAD", "OPTIONS"],
      cachedMethods: ["GET", "HEAD"],
      compress: true,
      cachePolicyId: MANAGED_CACHING_OPTIMIZED,
    },
    orderedCacheBehaviors,
    restrictions: {
      geoRestriction: {
        restrictionType: "none",
      },
    },
    viewerCertificate: certificateArn
      ? {
        acmCertificateArn: certificateArn,
        sslSupportMethod: "sni-only",
        minimumProtocolVersion: "TLSv1.2_2021",
      }
      : {
        cloudfrontDefaultCertificate: true,
      },
    webAclId: waf?.arn,
  });
  return {
    distribution,
    waf,
    oac,
  };
};

const configSchema = z.object({
  CLOUDFRONT_ENABLE_WAF: z.string().optional().transform(e => e === "true"),
  CLOUDFRONT_ALIASES: z.string().optional().transform(a => {
    if (a) {
      return a.split(',').map(a => new URL(a).host)
    }
  }),
  CLOUDFRONT_CERT_ARN: z.string().optional(),
}).transform(c => ({
  enableWaf: c.CLOUDFRONT_ENABLE_WAF,
  aliases: c.CLOUDFRONT_ALIASES,
  certificateArn: c.CLOUDFRONT_CERT_ARN,
}));


export const router = createSingleDomainCloudFrontDistribution({
  name: "Sendra",
  ...configSchema.parse(process.env),
});
