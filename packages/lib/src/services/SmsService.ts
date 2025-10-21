import { PinpointSMSVoiceV2Client, SendTextMessageCommand } from "@aws-sdk/client-pinpoint-sms-voice-v2";
import type { Action, Contact, PublicProject, Sms } from "@sendra/shared";
import Handlebars from "handlebars";
import { rootLogger } from "../logging/Logger";
import { getSmsConfig } from "./AppConfig";

const logger = rootLogger.child({
  module: "SmsService",
});

export type SmsCompileProps = {
  action?: Pick<Action, "name">;
  contact: Pick<Contact, "data" | "subscribed">;
  sms: Pick<Sms, "sendType" | "body">;
  project: Pick<PublicProject, "name" | "id">;
};

export class SmsService {
  public static async send({
    originationIdentity,
    destinationPhoneNumber,
    messageBody,
    configurationSetName,
  }: {
    originationIdentity: string;
    destinationPhoneNumber: string;
    messageBody: string;
    configurationSetName?: string;
  }) {
    const smsConfig = getSmsConfig();
    if (!smsConfig.enabled) {
      throw new Error("SMS is not enabled");
    }

    const client = new PinpointSMSVoiceV2Client({});

    const command = new SendTextMessageCommand({
      DestinationPhoneNumber: destinationPhoneNumber,
      OriginationIdentity: originationIdentity,
      MessageBody: messageBody,
      ConfigurationSetName: configurationSetName,
    });

    logger.info(
      {
        destination: destinationPhoneNumber,
        originationIdentity,
      },
      "Sending SMS",
    );

    const response = await client.send(command);

    if (!response.MessageId) {
      throw new Error("Could not send SMS");
    }

    return { messageId: response.MessageId };
  }

  public static compileBody(body: string, { action, contact, sms, project }: SmsCompileProps) {
    logger.info(
      {
        contact: contact.data,
        project: project.id,
      },
      "Compiling SMS body",
    );

    Handlebars.registerHelper("default", (value, defaultValue) => {
      return value ?? defaultValue;
    });

    const template = Handlebars.compile(body);
    const templated = template({
      action,
      contact,
      sms,
      project,
    });

    // Ensure SMS doesn't exceed 160 characters
    if (templated.length > 160) {
      logger.warn(
        {
          length: templated.length,
          project: project.id,
        },
        "SMS body exceeds 160 characters and will be truncated",
      );
      return templated.substring(0, 160);
    }

    return templated;
  }
}

