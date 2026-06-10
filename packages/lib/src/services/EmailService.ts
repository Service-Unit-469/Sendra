import { SES } from "@aws-sdk/client-ses";
import type { Action, Contact, Email, PublicProject } from "@sendra/shared";
import Handlebars from "handlebars";
import { createMimeMessage } from "mail-mime-builder";
import { rootLogger } from "../logging/Logger";
import { withMetrics } from "../metrics";
import { getEmailConfig } from "./AppConfig";

const logger = rootLogger.child({
  module: "EmailService",
});

export type CompileProps = {
  action?: Pick<Action, "name">;
  appUrl: string;
  contact: Pick<Contact, "email" | "data" | "subscribed">;
  email: Pick<Email, "sendType" | "subject">;
  project: Pick<PublicProject, "name" | "id">;
};

export type SendProps = {
  appUrl: string;
  from: {
    name: string;
    email: string;
  };
  to: string[];
  content: {
    subject: string;
    html: string;
    plainText?: string;
  };
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }> | null;
  headers?: {
    [key: string]: string;
  } | null;
  reply?: string;
};

export class EmailService {
  public static async send({ appUrl, from, to, content, reply, headers, attachments }: SendProps) {
    const ses = new SES();

    const emailConfig = getEmailConfig();

    const message = createMimeMessage();
    message.setSender({
      addr: from.email,
      name: from.name,
      type: "From",
    });
    message.setRecipient(to.map((addr) => ({ addr, type: "To" as const })));
    if (reply) {
      message.setReplyTo({
        name: from.name,
        addr: reply,
        type: "Reply-To" as const,
      });
    }
    message.setSubject(content.subject);
    if (content.plainText) {
      message.addMessage({
        data: content.plainText,
        contentType: "text/plain",
        charset: "utf-8",
      });
    }
    message.addMessage({
      data: content.html,
      contentType: "text/html",
      charset: "utf-8",
    });
    if (attachments) {
      attachments.forEach((attachment) => {
        message.addAttachment({
          filename: attachment.filename,
          data: attachment.content,
          contentType: attachment.contentType,
        });
      });
    }
    message.headers.set("List-Unsubscribe", `https://${appUrl}/subscription/?email=${to}`);
    Object.entries(headers ?? {}).forEach(([key, value]) => {
      message.headers.set(key, value);
    });

    const response = await withMetrics(
      () =>
        ses.sendRawEmail({
          Destinations: to,
          ConfigurationSetName: emailConfig.emailConfigurationSetName,
          RawMessage: {
            Data: new TextEncoder().encode(message.asRaw()),
          },
          Source: `${from.name} <${from.email}>`,
        }),
      {
        Operation: "Send",
      },
    );

    if (!response.MessageId) {
      logger.error({ response }, "Could not send email");
      throw new Error("Could not send email");
    }

    return { messageId: response.MessageId };
  }

  public static compileBody(body: string, { action, appUrl, contact, email, project }: CompileProps) {
    logger.info(
      {
        contact: contact.email,
        project: project.id,
      },
      "Compiling body",
    );
    Handlebars.registerHelper("default", (value, defaultValue) => {
      return value ?? defaultValue;
    });

    const template = Handlebars.compile(body);
    const templated = template({
      action,
      contact,
      email,
      project,
      APP_URI: appUrl,
    });

    return templated;
  }

  public static compileSubject(subject: string, { action, contact, project }: Omit<CompileProps, "email" | "appUrl">) {
    logger.info(
      {
        subject,
        contact: contact.email,
        project: project.id,
      },
      "Compiling subject",
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
}
