import {
  ActionPersistence,
  CampaignPersistence,
  ContactPersistence,
  EventPersistence,
  ProjectPersistence,
  rootLogger,
  SmsService,
  SmsPersistence,
  TemplatePersistence,
} from "@sendra/lib";
import type { Action, Campaign, SendSmsTaskSchema, Sms } from "@sendra/shared";
import type { z } from "zod";

type SendSmsTask = z.infer<typeof SendSmsTaskSchema>;

export const sendSms = async (task: SendSmsTask, recordId: string) => {
  const logger = rootLogger.child({
    recordId,
  });
  logger.info({ ...task.payload }, "Sending SMS");
  const { action: actionId, campaign: campaignId, contact: contactId, project: projectId, sms: smsId } = task.payload;

  const projectPersistence = new ProjectPersistence();
  const project = await projectPersistence.get(projectId);

  if (!project) {
    logger.warn({ projectId }, "Project not found");
    return;
  }

  // Check if SMS is enabled for the project
  if (!project.sms?.enabled) {
    logger.warn({ projectId }, "SMS not enabled for project");
    return;
  }

  const smsConfig = project.sms;
  if (!smsConfig.poolArn || !smsConfig.phoneKey) {
    logger.warn({ projectId }, "SMS configuration incomplete");
    return;
  }

  const contactPersistence = new ContactPersistence(projectId);
  const contact = await contactPersistence.get(contactId);
  if (!contact) {
    logger.warn({ contactId }, "Contact not found");
    return;
  }

  // Get phone number from contact data
  const phoneNumber = contact.data?.[smsConfig.phoneKey];
  if (!phoneNumber || typeof phoneNumber !== "string") {
    logger.warn({ contactId, phoneKey: smsConfig.phoneKey }, "Phone number not found in contact data");
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

  let body = "";

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

    body = template.body;
  } else if (campaign) {
    body = campaign.body;
  }

  logger.info({ body: body.length }, "Compiling body");

  const smsBase = {
    sendType: action ? "MARKETING" : "TRANSACTIONAL",
    body,
  } as const;

  const compiledBody = SmsService.compileBody(body, {
    action,
    contact,
    project,
    sms: smsBase,
  });

  logger.info({ body: compiledBody.length, phone: phoneNumber }, "Sending SMS");
  const { messageId } = await SmsService.send({
    originationIdentity: smsConfig.poolArn,
    destinationPhoneNumber: phoneNumber,
    messageBody: compiledBody,
    configurationSetName: smsConfig.configurationSetArn,
  });

  // Create SMS record
  const smsPersistence = new SmsPersistence(project.id);
  let smsItem: Sms | undefined;

  if (smsId) {
    smsItem = await smsPersistence.get(smsId);
  }
  if (smsItem) {
    await smsPersistence.put({
      ...smsItem,
      messageId,
      status: "SENT",
      body: compiledBody,
    });
  } else {
    await smsPersistence.create({
      ...smsBase,
      messageId,
      status: "SENT",
      body: compiledBody,
      phone: phoneNumber,
      source: action?.id ?? campaign?.id,
      sourceType: action ? "ACTION" : "CAMPAIGN",
      contact: contact.id,
      project: project.id,
    });
  }

  logger.info({ contact: phoneNumber, project: project.name, messageId }, "SMS sent");
};

