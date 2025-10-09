import {
  ActionPersistence,
  CampaignPersistence,
  ContactPersistence,
  EmailPersistence,
  EmailService,
  ProjectPersistence,
  rootLogger,
  TemplatePersistence,
  TriggerPersistence,
} from "@sendra/lib";
import type {
  Action,
  Campaign,
  SendEmailTaskSchema,
  Template,
} from "@sendra/shared";
import type { z } from "zod";

type SendEmailTask = z.infer<typeof SendEmailTaskSchema>;

export const sendEmail = async (task: SendEmailTask, recordId: string) => {
  const logger = rootLogger.child({
    recordId,
  });
  const {
    action: actionId,
    campaign: campaignId,
    contact: contactId,
    project: projectId,
  } = task.payload;

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
  let template: Template | undefined;
  if (action) {
    const { template: templateId, notevents } = action;

    if (notevents.length > 0) {
      const triggerPersistence = new TriggerPersistence(projectId);
      const triggers = await triggerPersistence.findAllBy({
        key: "contact",
        value: contactId,
      });

      if (
        notevents.some((e) =>
          triggers.some((t) => t.contact === contactId && t.event === e)
        )
      ) {
        logger.info({ actionId, contactId, projectId }, "Action not triggered");
        return;
      }
    }

    const template = await templatePersistence.get(templateId);
    if (!template) {
      logger.warn({ templateId, projectId }, "Template not found");
      return;
    }

    email =
      project.verified && project.email
        ? template.email ?? project.email
        : process.env.DEFAULT_EMAIL as string;
    name = template.from ?? project.from ?? project.name;

    ({ subject, body } = EmailService.format({
      subject: template.subject,
      body: template.body,
      data: {
        ...contact.data,
        contact_id: contactId,
        contact_email: contact.email,
      },
    }));
  } else if (campaign) {
    email =
      project.verified && project.email
        ? campaign.email ?? project.email
        : process.env.DEFAULT_EMAIL as string;
    name = campaign.from ?? project.from ?? project.name;

    ({ subject, body } = EmailService.format({
      subject: campaign.subject,
      body: campaign.body,
      data: {
        ...contact.data,
        contact_email: contact.email,
        contact_id: contact.id,
      },
    }));
  }

  const { messageId } = await EmailService.send({
    from: {
      name,
      email,
    },
    to: [contact.email],
    content: {
      subject,
      html: EmailService.compile({
        content: body,
        footer: {
          unsubscribe: campaign
            ? true
            : !!action && template?.templateType === "MARKETING",
        },
        contact: {
          id: contact.id,
          email: contact.email,
        },
        project: {
          name: project.name,
        },
        isHtml:
          (campaign && campaign.style === "HTML") ??
          (!!action && template?.style === "HTML"),
      }),
    },
  });

  // Create email record
  const emailPersistence = new EmailPersistence(project.id);
  await emailPersistence.create({
    messageId,
    status: "SENT",
    subject,
    body,
    email,
    source: action?.id ?? campaign?.id,
    sourceType: action ? "ACTION" : "CAMPAIGN",
    sendType: "MARKETING",
    contact: contact.id,
  });

  logger.info(
    { contact: contact.email, project: project.name },
    "Task completed"
  );
};
