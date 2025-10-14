import { ActionsService, ContactPersistence, EmailPersistence, EventPersistence, EventTypePersistence, ProjectPersistence, rootLogger } from "@sendra/lib";
import { type DeliveryEvent, DeliveryEventSchema, type Email } from "@sendra/shared";
import type { SNSEvent, SNSEventRecord } from "aws-lambda";
import type { Logger } from "pino";

const eventMap = {
  Bounce: "BOUNCED",
  Delivery: "DELIVERED",
  Open: "OPENED",
  Complaint: "COMPLAINT",
  Reject: "REJECTED",
} as Record<DeliveryEvent["eventType"], Email["status"]>;

function serializeData(deliveryEvent: DeliveryEvent): Record<string, string | number | boolean | string[] | null> {
  switch (deliveryEvent.eventType) {
    case "Bounce":
      return {
        ...deliveryEvent.bounce,
        recipients: JSON.stringify(deliveryEvent.bounce.recipients),
      };
    case "Complaint":
      return {
        ...deliveryEvent.complaint,
        complainedRecipients: JSON.stringify(deliveryEvent.complaint.complainedRecipients),
      };
    case "Delivery":
      return {
        ...deliveryEvent.delivery,
        recipients: JSON.stringify(deliveryEvent.delivery.recipients),
      };
    case "Open":
      return {
        ...deliveryEvent.open,
      };
    case "Reject":
      return {
        ...deliveryEvent.reject,
      };
    case "Click":
      return {
        ...deliveryEvent.click,
        tags: JSON.stringify(deliveryEvent.click.tags),
      };
  }
  return {};
}

async function handleEmailEvent(deliveryEvent: DeliveryEvent, email: Email, logger: Logger) {
  const project = await new ProjectPersistence().get(email.project);
  if (!project) {
    rootLogger.warn({ messageId: deliveryEvent.mail.messageId }, "No project found");
    return;
  }

  const contactPersistence = new ContactPersistence(email.project);

  //  handle complaint and bounce
  if (["Complaint", "Bounce"].includes(deliveryEvent.eventType)) {
    logger.warn(
      {
        messageId: deliveryEvent.mail.messageId,
        eventType: deliveryEvent.eventType,
      },
      `${deliveryEvent.eventType} received`,
    );

    // unsubscribe contact if not transactional
    if (email.sendType !== "TRANSACTIONAL") {
      logger.info({ contact: email.contact, project: email.project, email: email.id }, "Unsubscribing contact");
      const contact = await contactPersistence.get(email.contact);
      if (contact) {
        await contactPersistence.put({
          ...contact,
          subscribed: false,
        });
      }
    }
  } else {
    logger.info(
      {
        messageId: deliveryEvent.mail.messageId,
        eventType: deliveryEvent.eventType,
      },
      `${deliveryEvent.eventType} received`,
    );
  }

  // update status
  const newStatus = eventMap[deliveryEvent.eventType];
  if (newStatus !== email.status && newStatus) {
    await new EmailPersistence(project.id).put({
      ...email,
      status: newStatus,
    });
  }

  // add the event
  const eventTypePersistence = new EventTypePersistence(project.id);
  let eventType = await eventTypePersistence.getByName(deliveryEvent.eventType);
  if (!eventType) {
    logger.info({ project: project.id, eventType: deliveryEvent.eventType }, "Creating event type");
    eventType = await eventTypePersistence.create({
      name: deliveryEvent.eventType,
      project: project.id,
    });
  }
  const eventPersistence = new EventPersistence(project.id);
  await eventPersistence.create({
    eventType: eventType.id,
    contact: email.contact,
    project: project.id,
    relationType: email.sourceType,
    relation: email.source,
    email: email.id,
    data: serializeData(deliveryEvent),
  });

  if (email.source && email.sourceType === "ACTION") {
    const contact = await contactPersistence.get(email.contact);
    if (!contact) {
      logger.warn({ contact: email.contact, project: project.id, email: email.id }, "No contact found");
      return;
    }
    await ActionsService.trigger({ eventType, contact, project });
  }

  return;
}

const handleRecord = async (record: SNSEventRecord) => {
  const logger = rootLogger.child({
    messageId: record.Sns.MessageId,
    ...record.Sns.MessageAttributes,
  });
  logger.info("Received SNS message");

  try {
    const deliveryEvent = DeliveryEventSchema.parse(JSON.parse(record.Sns.Message));

    // Find email by messageId in DynamoDB
    const email = await EmailPersistence.getByMessageId(deliveryEvent.mail.messageId);

    if (!email) {
      logger.info({ messageId: deliveryEvent.mail.messageId }, "No email found");
      return;
    }

    await handleEmailEvent(deliveryEvent, email, logger);
  } catch (e) {
    logger.error({ error: e, record }, "Failed to handle record");
  }
};

export const handler = async (event: SNSEvent) => {
  await Promise.all(event.Records.map(handleRecord));
  return {
    statusCode: 200,
    body: "OK",
  };
};
