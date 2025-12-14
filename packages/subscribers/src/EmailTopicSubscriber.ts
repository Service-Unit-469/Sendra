import { ActionsService, ContactPersistence, ContactService, EmailPersistence, EventPersistence, ProjectPersistence, rootLogger, withMetrics } from "@sendra/lib";
import { type DeliveryEvent, DeliveryEventSchema, type Email, OOTB_EVENT_VALUES } from "@sendra/shared";
import { Unit } from "aws-embedded-metrics";
import type { SNSEvent, SNSEventRecord } from "aws-lambda";
import type { Logger } from "pino";

const eventMap = {
  Bounce: "BOUNCED",
  Delivery: "DELIVERED",
  Open: "OPENED",
  Complaint: "COMPLAINT",
  Reject: "REJECTED",
} as Record<DeliveryEvent["eventType"], Email["status"]>;

function serializeData(deliveryEvent: DeliveryEvent): Record<string, unknown> {
  switch (deliveryEvent.eventType) {
    case "Bounce":
      return {
        mail: deliveryEvent.mail,
        details: deliveryEvent.bounce,
      };
    case "Complaint":
      return {
        mail: deliveryEvent.mail,
        details: deliveryEvent.complaint,
      };
    case "Delivery":
      return {
        mail: deliveryEvent.mail,
        details: deliveryEvent.delivery,
      };
    case "Open":
      return {
        mail: deliveryEvent.mail,
        details: deliveryEvent.open,
      };
    case "Reject":
      return {
        mail: deliveryEvent.mail,
        details: deliveryEvent.reject,
      };
    case "Click":
      return {
        mail: deliveryEvent.mail,
        details: deliveryEvent.click,
      };
  }
  return {};
}

async function handleEmailEvent(deliveryEvent: DeliveryEvent, email: Email, logger: Logger) {
  return withMetrics(
    async (metricsLogger) => {
      metricsLogger.setProperty("EventType", deliveryEvent.eventType);
      metricsLogger.setProperty("MessageId", deliveryEvent.mail.messageId);
      metricsLogger.setProperty("EmailId", email.id);
      metricsLogger.setProperty("Project", email.project);
      metricsLogger.setProperty("SendType", email.sendType);
      metricsLogger.setProperty("SourceType", email.sourceType || "none");

      // Track the specific event type
      metricsLogger.putMetric(`EmailEvent.${deliveryEvent.eventType}`, 1, Unit.Count);

      const project = await new ProjectPersistence().get(email.project);
      if (!project) {
        rootLogger.warn({ messageId: deliveryEvent.mail.messageId }, "No project found");
        metricsLogger.putMetric("EmailEvent.ProjectNotFound", 1, Unit.Count);
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
            await ContactService.updateContact({
              oldContact: contact,
              newContact: {
                ...contact,
                subscribed: false,
              },
              contactPersistence,
            });
            metricsLogger.putMetric("ContactUnsubscribed", 1, Unit.Count);
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
        metricsLogger.putMetric("EmailStatusUpdated", 1, Unit.Count);
        metricsLogger.setProperty("NewStatus", newStatus);
      }

      // add the event
      const eventType = `email.${deliveryEvent.eventType.toLowerCase()}`;
      // Only add custom event types to project.eventTypes (skip out-of-the-box email events)
      if (!OOTB_EVENT_VALUES.includes(eventType) && !project.eventTypes.includes(eventType)) {
        project.eventTypes.push(eventType);
        await new ProjectPersistence().put(project);
      }
      const eventPersistence = new EventPersistence(project.id);
      await eventPersistence.create({
        eventType,
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
          metricsLogger.putMetric("ActionTriggerSkippedNoContact", 1, Unit.Count);
          return;
        }
        await ActionsService.trigger({ eventType, contact, project });
        metricsLogger.putMetric("ActionTriggered", 1, Unit.Count);
      }

      return;
    },
    {
      Operation: "HandleEmailEvent",
      EventType: deliveryEvent.eventType,
    },
  );
}

const handleRecord = async (record: SNSEventRecord) => {
  const logger = rootLogger.child({
    messageId: record.Sns.MessageId,
    ...record.Sns.MessageAttributes,
  });
  logger.info("Received SNS message");

  return withMetrics(
    async (metricsLogger) => {
      metricsLogger.setProperty("SnsMessageId", record.Sns.MessageId);
      metricsLogger.putMetric("SnsMessagesReceived", 1, Unit.Count);

      try {
        const deliveryEvent = DeliveryEventSchema.parse(JSON.parse(record.Sns.Message));

        // Find email by messageId in DynamoDB
        const email = await EmailPersistence.getByMessageId(deliveryEvent.mail.messageId);

        if (!email) {
          logger.info({ messageId: deliveryEvent.mail.messageId }, "No email found");
          metricsLogger.putMetric("EmailNotFound", 1, Unit.Count);
          return;
        }

        await handleEmailEvent(deliveryEvent, email, logger);
      } catch (e) {
        logger.error({ error: e, record }, "Failed to handle record");
        metricsLogger.putMetric("EmailEventProcessingError", 1, Unit.Count);
        throw e;
      }
    },
    {
      Operation: "ProcessSnsRecord",
    },
  );
};

export const handler = async (event: SNSEvent) => {
  await Promise.all(event.Records.map(handleRecord));
  return {
    statusCode: 200,
    body: "OK",
  };
};
