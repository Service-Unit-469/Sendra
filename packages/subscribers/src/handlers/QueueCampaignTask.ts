import { CampaignPersistence, ContactPersistence, EmailPersistence, rootLogger, TaskQueue } from "@sendra/lib";
import type { QueueCampaignTaskSchema } from "@sendra/shared";
import type { z } from "zod";

type QueueCampaignTask = z.infer<typeof QueueCampaignTaskSchema>;

export const queueCampaign = async (task: QueueCampaignTask, recordId: string) => {
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
  let emailsCreated = 0;
  const failures: { contact: string; message: string }[] = [];
  for await (const recipient of recipients) {
    try {
      const contact = await contactPersistence.get(recipient.contactId);
      if (!contact) {
        logger.warn({ contactId: recipient.contactId }, "Contact not found");
        failures.push({ contact: recipient.contactId, message: "Contact not found" });
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
      emailsCreated += 1;

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
      const raw = error instanceof Error ? error.message : String(error);
      failures.push({
        contact: recipient.contactId,
        message: raw.length > 500 ? `${raw.slice(0, 497)}...` : raw,
      });
      logger.error({ err: error, recipient }, "Error queuing campaign email");
    }
  }
  await campaignPersistence.setStatsAfterQueue(campaign.id, emailsCreated, failures);
  logger.info({ campaign: campaign.id, recipients: campaign.recipients.length, emailsCreated, queueErrors: failures.length }, "Campaign emails queued");
};
