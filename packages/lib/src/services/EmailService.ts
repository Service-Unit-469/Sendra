import { SES } from "@aws-sdk/client-ses";
import type { Action, Contact, Email, PublicProject } from "@sendra/shared";
import Handlebars from "handlebars";
import mjml2html from "mjml";
import { rootLogger } from "../logging/Logger";
import { HttpException } from "../persistence/utils/HttpException";
import { getEmailConfig } from "./AppConfig";

const logger = rootLogger.child({
  module: "EmailService",
});

export type CompileProps = {
  action?: Pick<Action, "name">;
  contact: Pick<Contact, "email" | "data" | "subscribed">;
  email: Pick<Email, "sendType" | "subject">;
  project: Pick<PublicProject, "name" | "id">;
};

export class EmailService {
  public static async send({
    from,
    to,
    content,
    reply,
    headers,
    attachments,
  }: {
    from: {
      name: string;
      email: string;
    };
    reply?: string;
    to: string[];
    content: {
      subject: string;
      html: string;
    };
    headers?: {
      [key: string]: string;
    } | null;
    attachments?: Array<{
      filename: string;
      content: string;
      contentType: string;
    }> | null;
  }) {
    const ses = new SES();

    const emailConfig = getEmailConfig();
    const unsubscribeLink = `List-Unsubscribe: <https://${emailConfig.appUrl}/subscription/?email=${to}>`;

    // Generate a unique boundary for multipart messages
    const boundary = `----=_NextPart_${Math.random()
      .toString(36)
      .substring(2)}`;
    const mixedBoundary = attachments?.length
      ? `----=_MixedPart_${Math.random().toString(36).substring(2)}`
      : null;

    const rawMessage = `From: ${from.name} <${from.email}>
To: ${to.join(", ")}
Reply-To: ${reply || from.email}
Subject: ${content.subject}
MIME-Version: 1.0
${
  mixedBoundary
    ? `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`
    : `Content-Type: multipart/alternative; boundary="${boundary}"`
}
${
  headers
    ? Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    : ""
}
${unsubscribeLink}

${mixedBoundary ? `--${mixedBoundary}\n` : ""}${
      mixedBoundary
        ? `Content-Type: multipart/alternative; boundary="${boundary}"\n\n`
        : ""
    }--${boundary}
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: 7bit

${EmailService.breakLongLines(content.html, 500)}
--${boundary}--
${
  attachments?.length
    ? attachments
        .map(
          (attachment) => `
--${mixedBoundary}
Content-Type: ${attachment.contentType}
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="${attachment.filename}"

${EmailService.breakLongLines(attachment.content, 76, true)}
`
        )
        .join("\n")
    : ""
}${mixedBoundary ? `\n--${mixedBoundary}--` : ""}`;

    const response = await ses.sendRawEmail({
      Destinations: to,
      ConfigurationSetName: emailConfig.emailConfigurationSetName,
      RawMessage: {
        Data: new TextEncoder().encode(rawMessage),
      },
      Source: `${from.name} <${from.email}>`,
    });

    if (!response.MessageId) {
      throw new Error("Could not send email");
    }

    return { messageId: response.MessageId };
  }

  public static compileBody(
    body: string,
    { action, contact, email, project }: CompileProps
  ) {
    logger.info(
      {
        contact: contact.email,
        project: project.id,
      },
      "Compiling body"
    );
    const emailConfig = getEmailConfig();
    Handlebars.registerHelper("default", (value, defaultValue) => {
      return value ?? defaultValue;
    });

    const template = Handlebars.compile(body);
    const templated = template({
      action,
      contact,
      email,
      project,
      APP_URI: emailConfig.appUrl,
    });

    const htmlResult = mjml2html(templated);
    if (htmlResult.errors.length > 0) {
      logger.error({ errors: htmlResult.errors }, "Could not compile email");
      throw new HttpException(
        400,
        `Could not compile email: ${htmlResult.errors
          .map((e) => e.message)
          .join(", ")}`
      );
    }
    return htmlResult.html;
  }

  public static compileSubject(
    subject: string,
    { action, contact, project }: Omit<CompileProps, "email">
  ) {
    logger.info(
      {
        subject,
        contact: contact.email,
        project: project.id,
      },
      "Compiling subject"
    );
    Handlebars.registerHelper("default", (value, defaultValue) => {
      return value ?? defaultValue;
    });

    const template = Handlebars.compile(subject);
    const templated = template({
      action,
      contact,
      project,
    });
    return templated;
  }

  private static breakLongLines(
    input: string,
    maxLineLength: number,
    isBase64 = false
  ): string {
    if (isBase64) {
      // For base64 content, break at exact intervals without looking for spaces
      const result = [];
      for (let i = 0; i < input.length; i += maxLineLength) {
        result.push(input.substring(i, i + maxLineLength));
      }
      return result.join("\n");
    }
    // Original implementation for text content
    const lines = input.split("\n");
    const result = [];
    for (let line of lines) {
      while (line.length > maxLineLength) {
        let pos = maxLineLength;
        while (pos > 0 && line[pos] !== " ") {
          pos--;
        }
        if (pos === 0) {
          pos = maxLineLength;
        }
        result.push(line.substring(0, pos));
        line = line.substring(pos).trim();
      }
      result.push(line);
    }
    return result.join("\n");
  }
}
