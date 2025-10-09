import { ActionPersistence, ActionsService, CampaignPersistence, ContactPersistence, EmailPersistence, EventPersistence, ProjectPersistence, rootLogger, TriggerPersistence } from "@sendra/lib";
import type { Contact, Email, Event, Project } from "@sendra/shared";
import type { SESMessage, SNSEvent, SNSEventRecord } from "aws-lambda";

type Message = SESMessage & { eventType: string; click: { link: string } };

const eventMap = {
  Bounce: "BOUNCED",
  Delivery: "DELIVERED",
  Open: "OPENED",
  Complaint: "COMPLAINT",
  Click: "CLICKED",
} as const;

async function handleClick(project: Project, contact: Contact, email: Email, body: Message, eventPersistence: EventPersistence, triggerPersistence: TriggerPersistence) {
  rootLogger.info({ contact: contact.email, project: project.name }, "Click received");

  let event = await eventPersistence.getByName(`email_${body.eventType}`);
  if (!event) {
    event = await eventPersistence.create({
      name: `email_${body.eventType}`,
      project: project.id,
    });
  }

  await triggerPersistence.create({
    contact: contact.id,
    event: event.id,
    action: email.source && email.sourceType === "ACTION" ? email.source : undefined,
    email: email.id,
    project: project.id,
    data: {
      email: email.id,
      link: body.click.link,
    },
  });
}

const handleRecord = async (record: SNSEventRecord) => {
  const logger = rootLogger.child({
    messageId: record.Sns.MessageId,
    ...record.Sns.MessageAttributes,
  });
  logger.info("Received SNS message");

  try {
    const message = JSON.parse(record.Sns.Message) as Message;

    // Find email by messageId in DynamoDB
    const email = await EmailPersistence.getByMessageId(message.mail.messageId);

    if (!email) {
      logger.info({ messageId: message.mail.messageId }, "No email found");
      return;
    }
    const emailPersistence = new EmailPersistence(email.project);

    const projectId = email.project;
    const actionPersistence = new ActionPersistence(projectId);
    const contactPersistence = new ContactPersistence(projectId);
    // Get related entities
    const [contact, action, campaign, project] = await Promise.all([
      contactPersistence.get(email.contact),
      email.source && email.sourceType === "ACTION" ? actionPersistence.get(email.source) : null,
      email.source && email.sourceType === "CAMPAIGN" ? new CampaignPersistence(projectId).get(email.source) : null,
      email.project ? new ProjectPersistence().get(email.project) : null,
    ]);

    if (!contact) {
      logger.warn({ messageId: message.mail.messageId }, "No contact found");
      return;
    }

    if (!project) {
      logger.warn({ messageId: message.mail.messageId }, "No project found");
      return;
    }

    const eventPersistence = new EventPersistence(projectId);
    const triggerPersistence = new TriggerPersistence(projectId);

    // The email was a transactional email
    if (email.sendType === "TRANSACTIONAL") {
      if (message.eventType === "Click") {
        await handleClick(project, contact, email, message, eventPersistence, triggerPersistence);
        return;
      }

      if (message.eventType === "Complaint") {
        logger.warn({ contact: contact.email, project: project.name }, "Complaint received");
      }

      if (message.eventType === "Bounce") {
        logger.warn({ contact: contact.email, project: project.name }, "Bounce received");
      }

      // Update email status in DynamoDB
      const updatedEmail = {
        ...email,
        status: eventMap[message.eventType as "Bounce" | "Delivery" | "Open" | "Complaint"],
      };
      await emailPersistence.put(updatedEmail);

      return;
    }

    if (message.eventType === "Complaint" || message.eventType === "Bounce") {
      logger.warn({ contact: contact.email, project: project.name }, `${message.eventType} received`);

      // Update email status in DynamoDB
      const updatedEmail = {
        ...email,
        status: eventMap[message.eventType as "Bounce" | "Complaint"],
      };
      await emailPersistence.put(updatedEmail);

      // Update contact subscription status in DynamoDB
      const updatedContact = {
        ...contact,
        subscribed: false,
      };
      await contactPersistence.put(updatedContact);

      return;
    }

    if (message.eventType === "Click") {
      await handleClick(project, contact, email, message, eventPersistence, triggerPersistence);
      return;
    }

    let event: Event | undefined;
    if (action) {
      // Get template events for action
      const templateEvents = await eventPersistence.findAllBy({
        key: "template",
        value: action.template,
      });
      event = templateEvents.find((e) => e.name.includes((message.eventType as "Bounce" | "Delivery" | "Open" | "Complaint" | "Click") === "Delivery" ? "delivered" : "opened"));
    }

    if (campaign) {
      // Get campaign events
      const campaignEvents = await eventPersistence.findAllBy({
        key: "campaign",
        value: campaign.id,
      });
      event = campaignEvents.find((e: Event) => e.name.includes((message.eventType as "Bounce" | "Delivery" | "Open" | "Complaint" | "Click") === "Delivery" ? "delivered" : "opened"));
    }

    if (!event) {
      logger.warn({ messageId: message.mail.messageId }, "No event found");
      return;
    }

    switch (message.eventType as "Delivery" | "Open") {
      case "Delivery": {
        logger.info({ contact: contact.email, project: project.name }, "Delivery received");
        // Update email status in DynamoDB
        const deliveredEmail = {
          ...email,
          status: "DELIVERED",
        } as const;
        await emailPersistence.put(deliveredEmail);
        await triggerPersistence.create({
          contact: contact.id,
          event: event.id,
          project: project.id,
        });

        break;
      }
      case "Open":
        logger.info({ contact: contact.email, project: project.name }, "Open received");
        // Update email status
        await emailPersistence.put({
          ...email,
          status: "OPENED",
        } as const);

        // Create trigger
        await triggerPersistence.create({
          contact: contact.id,
          event: event.id,
          project: project.id,
        });

        break;
    }

    if (email.source && email.sourceType === "ACTION") {
      await ActionsService.trigger({ event, contact, project });
    }
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
