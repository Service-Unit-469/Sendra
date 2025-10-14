import {
  ActionPersistence,
  CampaignPersistence,
  ContactPersistence,
  EmailPersistence,
  EmailService,
  EventPersistence,
  emailConfig,
  ProjectPersistence,
  rootLogger,
  TemplatePersistence,
} from "@sendra/lib";
import type { Action, Campaign, SendEmailTaskSchema } from "@sendra/shared";
import type { z } from "zod";

type SendEmailTask = z.infer<typeof SendEmailTaskSchema>;

export const sendEmail = async (task: SendEmailTask, recordId: string) => {
  const logger = rootLogger.child({
    recordId,
  });
  logger.info({ ...task.payload }, "Sending email");
  const { action: actionId, campaign: campaignId, contact: contactId, project: projectId } = task.payload;

  const projectPersistence = new ProjectPersistence();
  const project = await projectPersistence.get(projectId);

  if (!project) {
    logger.warn({ projectId }, "Project not found");
    return;
  }

  const contactPersistence = new ContactPersistence(projectId);
  const contact = await contactPersistence.get(contactId);
  if (!contact) {
    logger.warn({ contactId }, "Contact not found");
    return;
  }

  let campaign: Campaign | undefined;
  if (campaignId) {
    const campaignPersistence = new CampaignPersistence(projectId);
    campaign = await campaignPersistence.get(campaignId);
    if (!campaign) {
      logger.warn({ campaignId }, "Campaign not found");
      return;
    }
  }

  let action: Action | undefined;
  if (actionId) {
    const actionPersistence = new ActionPersistence(projectId);
    action = await actionPersistence.get(actionId);
    if (!action) {
      logger.warn({ actionId }, "Action not found");
      return;
    }
  }

  let subject = "";
  let body = "";

  let email = "";
  let name = "";

  const templatePersistence = new TemplatePersistence(projectId);
  if (action) {
    const { template: templateId, notevents } = action;

    if (notevents.length > 0) {
      const eventPersistence = new EventPersistence(projectId);
      const events = await eventPersistence.findAllBy({
        key: "contact",
        value: contactId,
      });

      if (notevents.some((e) => events.some((t) => t.contact === contactId && t.eventType === e))) {
        logger.info({ actionId, contactId, projectId }, "Action not triggered");
        return;
      }
    }

    const template = await templatePersistence.get(templateId);
    if (!template) {
      logger.warn({ templateId, projectId }, "Template not found");
      return;
    }

    email = project.verified && project.email ? (template.email ?? project.email) : emailConfig.defaultEmail;
    name = template.from ?? project.from ?? project.name;

    body = template.body;
    subject = template.subject;
  } else if (campaign) {
    email = project.verified && project.email ? (campaign.email ?? project.email) : emailConfig.defaultEmail;
    name = campaign.from ?? project.from ?? project.name;

    body = campaign.body;
    subject = campaign.subject;
  }

  logger.info({ subject: body, body: body.length }, "Compiling subject and body");

  const compiledSubject = EmailService.compileSubject(subject, {
    action,
    contact,
    project,
  });

  const emailBase = {
    sendType: action ? "MARKETING" : "TRANSACTIONAL",
    subject: compiledSubject,
  } as const;
  const compiledBody = EmailService.compileBody(body, {
    action,
    contact,
    project,
    email: emailBase,
  });

  logger.info({ subject: compiledSubject, body: compiledBody.length }, "Sending email");
  const { messageId } = await EmailService.send({
    from: {
      name,
      email,
    },
    to: [contact.email],
    content: {
      subject: compiledSubject,
      html: compiledBody,
    },
  });

  // Create email record
  const emailPersistence = new EmailPersistence(project.id);
  await emailPersistence.create({
    ...emailBase,
    messageId,
    status: "SENT",
    subject,
    body,
    email,
    source: action?.id ?? campaign?.id,
    sourceType: action ? "ACTION" : "CAMPAIGN",
    contact: contact.id,
  });

  logger.info({ contact: contact.email, project: project.name, messageId }, "Email sent");
};
