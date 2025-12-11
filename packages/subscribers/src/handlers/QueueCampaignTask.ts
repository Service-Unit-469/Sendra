import { CampaignPersistence, ContactPersistence, EmailPersistence, rootLogger, TaskQueue } from "@sendra/lib";
import type { QueueCampaignTaskSchema } from "@sendra/shared";
import type { z } from "zod";

type QueueCampaignTask = z.infer<typeof QueueCampaignTaskSchema>;

export const sendEmail = async (task: QueueCampaignTask, recordId: string) => {
  const logger = rootLogger.child({
    recordId,
  });
  const { project: projectId, campaign: campaignId, delay } = task.payload;
  const campaignPersistence = new CampaignPersistence(projectId);
  const emailPersistence = new EmailPersistence(projectId);
  const contactPersistence = new ContactPersistence(projectId);

  const campaign = await campaignPersistence.get(campaignId);
  if (!campaign) {
    logger.warn({ campaignId }, "Campaign not found");
    return;
  }
  logger.info({ ...task.payload }, "Queueing campaign emails");

  const recipients = campaign.recipients.map((contactId: string) => ({
    campaign: campaign.id,
    contactId,
    delaySeconds: (delay ?? 0) * 60,
  }));
  for await (const recipient of recipients) {
    try {
      const contact = await contactPersistence.get(recipient.contactId);
      if (!contact) {
        logger.warn({ contactId: recipient.contactId }, "Contact not found");
        continue;
      }
      const createdEmail = await emailPersistence.create({
        subject: campaign.subject,
        body: campaign.body,
        source: campaign.id,
        sourceType: "CAMPAIGN",
        email: contact.email,
        contact: recipient.contactId,
        sendType: "MARKETING",
        status: "QUEUED",
        project: projectId,
      });

      await TaskQueue.addTask({
        type: "sendEmail",
        payload: {
          email: createdEmail.id,
          campaign: recipient.campaign,
          contact: recipient.contactId,
          project: projectId,
        },
        delaySeconds: task.delaySeconds,
      });
    } catch (error) {
      logger.error({ err: error, recipient }, "Error queuing campaign email");
    }
  }
  logger.info({ campaign: campaign.id, recipients: campaign.recipients.length }, "Campaign emails queued");
};
