/**
 * Public SST entrypoint for deploying Sendra from either this repository or an
 * installed `@service-unit-469/sendra` package.
 */
export interface SendraConfig {
  appUrl?: string;
  defaultEmail?: string;
  allowDuplicateProjectIdentities?: boolean;
  disableSignups?: boolean;
  authIssuer?: string;
  authTtlPublic?: string;
  authTtlSecret?: string;
  authTtlUser?: string;
  logLevel?: string;
  logPretty?: boolean;
  metricsEnabled?: boolean;
  apiUrl?: string;
  cloudFrontCertificateArn?: string;
  enableSqsPoller?: boolean;
  sqsBatchWindow?: string;
  sqsMaxConcurrency?: number;
}

const environmentKeys: Record<keyof SendraConfig, string> = {
  appUrl: "APP_URL",
  defaultEmail: "DEFAULT_EMAIL",
  allowDuplicateProjectIdentities: "ALLOW_DUPLICATE_PROJECT_IDENTITIES",
  disableSignups: "DISABLE_SIGNUPS",
  authIssuer: "AUTH_ISSUER",
  authTtlPublic: "AUTH_TTL_PUBLIC",
  authTtlSecret: "AUTH_TTL_SECRET",
  authTtlUser: "AUTH_TTL_USER",
  logLevel: "LOG_LEVEL",
  logPretty: "LOG_PRETTY",
  metricsEnabled: "METRICS_ENABLED",
  apiUrl: "API_URL",
  cloudFrontCertificateArn: "CLOUDFRONT_CERT_ARN",
  enableSqsPoller: "ENABLE_SQS_POLLER",
  sqsBatchWindow: "SQS_BATCH_WINDOW",
  sqsMaxConcurrency: "SQS_MAX_CONCURRENCY",
};

/** Load the Sendra infrastructure into the caller's SST application. */
export async function deploySendra(config: SendraConfig = {}) {
  for (const key of Object.keys(environmentKeys) as (keyof SendraConfig)[]) {
    const value = config[key];
    if (value !== undefined) {
      process.env[environmentKeys[key]] = String(value);
    }
  }

  return import("./infra/index");
}
