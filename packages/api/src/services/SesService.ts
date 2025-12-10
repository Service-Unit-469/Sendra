import { SES, VerificationStatus } from "@aws-sdk/client-ses";
import { rootLogger } from "@sendra/lib";
import type { ProjectIdentity } from "@sendra/shared";

const logger = rootLogger.child({
  module: "SES",
});

export const ses = new SES();

export const getIdentities = async (identities: string[]) => {
  const res = await ses.getIdentityVerificationAttributes({
    Identities: identities.flatMap((identity) => [identity.split("@")[1]]),
  });

  const parsedResult = Object.entries(res.VerificationAttributes ?? {});
  return parsedResult.map((obj) => {
    return { email: obj[0], status: obj[1].VerificationStatus };
  });
};

export const verifyIdentity = async ({ identity, identityType, mailFromDomain }: Omit<ProjectIdentity, "verified">): Promise<string[] | undefined> => {
  if (identityType === "email") {
    await ses.verifyEmailIdentity({
      EmailAddress: identity,
    });
    return;
  }

  const DKIM = await ses.verifyDomainDkim({
    Domain: identity,
  });

  if (mailFromDomain) {
    await ses.setIdentityMailFromDomain({
      Identity: identity,
      MailFromDomain: mailFromDomain,
    });
  }

  return DKIM.DkimTokens;
};

export const getIdentityVerificationAttributes = async (
  identity: ProjectIdentity,
): Promise<{
  status: VerificationStatus;
  dkimTokens?: string[];
  dkimEnabled?: boolean;
}> => {
  logger.info({ identity }, "Getting identity verification attributes");
  if (identity.identityType === "email") {
    const attributes = await ses.getIdentityVerificationAttributes({
      Identities: [identity.identity],
    });
    logger.info({ attributes, identity }, "Identity verification attributes");

    const verificationAttribute = attributes.VerificationAttributes?.[identity.identity];

    if (!verificationAttribute) {
      logger.warn({ identity }, "Identity verification attribute not found");
      return {
        status: VerificationStatus.NotStarted,
      };
    }

    return {
      status: verificationAttribute.VerificationStatus ?? VerificationStatus.NotStarted,
    };
  }

  const attributes = await ses.getIdentityDkimAttributes({
    Identities: [identity.identity],
  });

  logger.info({ attributes, identity }, "Identity verification attributes");
  const parsedAttributes = attributes.DkimAttributes?.[identity.identity];

  if (!parsedAttributes) {
    logger.warn({ identity }, "Identity verification attribute not found");
    return {
      status: VerificationStatus.NotStarted,
    };
  }

  return {
    status: parsedAttributes.DkimVerificationStatus ?? VerificationStatus.NotStarted,
    dkimTokens: parsedAttributes.DkimTokens ?? [],
    dkimEnabled: parsedAttributes.DkimEnabled,
  };
};
