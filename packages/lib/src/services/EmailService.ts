import { SES } from "@aws-sdk/client-ses";
import type { Action, Contact, Email, PublicProject } from "@sendra/shared";
import Handlebars from "handlebars";
import { createMimeMessage } from "mail-mime-builder";
import { rootLogger } from "../logging/Logger";
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
      plainText?: string;
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
    message.headers.set("List-Unsubscribe", `https://${emailConfig.appUrl}/subscription/?email=${to}`);
    Object.entries(headers ?? {}).forEach(([key, value]) => {
      message.headers.set(key, value);
    });

    const response = await ses.sendRawEmail({
      Destinations: to,
      ConfigurationSetName: emailConfig.emailConfigurationSetName,
      RawMessage: {
        Data: new TextEncoder().encode(message.asRaw()),
      },
      Source: `${from.name} <${from.email}>`,
    });

    if (!response.MessageId) {
      logger.error({ response }, "Could not send email");
      throw new Error("Could not send email");
    }

    return { messageId: response.MessageId };
  }

  public static compileBody(body: string, { action, contact, email, project }: CompileProps) {
    logger.info(
      {
        contact: contact.email,
        project: project.id,
      },
      "Compiling body",
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

    return templated;
  }

  public static compileSubject(subject: string, { action, contact, project }: Omit<CompileProps, "email">) {
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
