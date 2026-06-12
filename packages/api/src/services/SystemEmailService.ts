import { SES } from "@aws-sdk/client-ses";
import { getEmailConfig, getRequestInfo, rootLogger } from "@sendra/lib";

const logger = rootLogger.child({
  module: "SystemEmailService",
});

export const ses = new SES();

export class SystemEmailService {
  private static async sendEmail({ from, to, subject, body }: { from: string; to: string; subject: string; body: string }) {
    const result = await ses.sendEmail({
      Source: from,
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Text: {
            Data: body,
          },
        },
      },
    });
    logger.info({ messageId: result.MessageId }, "Email sent");
  }

  public static async sendInvitationEmail(email: string, projectName: string) {
    const { appUrl } = getRequestInfo();
    const emailConfig = getEmailConfig();
    await SystemEmailService.sendEmail({
      from: emailConfig.defaultEmail,
      to: email,
      subject: "Sendra - You have been invited to a project",
      body: `You have been invited to join ${projectName} on Sendra.

Please click the link below to accept the invitation and create your account: ${appUrl}/dashboard#/auth/signup`,
    });
  }

  public static async sendResetPasswordEmail(email: string, code: string) {
    const { appUrl } = getRequestInfo();
    const emailConfig = getEmailConfig();
    await SystemEmailService.sendEmail({
      from: emailConfig.defaultEmail,
      to: email,
      subject: "Sendra - Reset your password",
      body: `A password reset has been requested for your account.

If you did request this, please click the link below to reset your password: ${appUrl}/dashboard#/auth/reset?code=${code}&email=${encodeURIComponent(email)}

This link will expire in 1 hour.

If you did not request this, please ignore this email.`,
    });
  }

  public static async sendVerificationEmail(email: string, code: string) {
    const { appUrl } = getRequestInfo();
    const emailConfig = getEmailConfig();
    await SystemEmailService.sendEmail({
      from: emailConfig.defaultEmail,
      to: email,
      subject: "Sendra - Verify your email",
      body: `Your account has been created.

Please click the link below to verify your email and activate your account: ${appUrl}/dashboard#/auth/verify?code=${code}&email=${encodeURIComponent(email)}

This link will expire in 1 hour.`,
    });
  }
}
