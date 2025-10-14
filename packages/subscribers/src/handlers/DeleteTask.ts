import {
  ActionPersistence,
  CampaignPersistence,
  ContactPersistence,
  EmailPersistence,
  EventPersistence,
  EventTypePersistence,
  MembershipPersistence,
  rootLogger,
  TemplatePersistence
} from "@sendra/lib";
import type { BatchDeleteRelatedSchema } from "@sendra/shared";
import type { z } from "zod";

type DeleteTask = z.infer<typeof BatchDeleteRelatedSchema>;

export const handleDelete = async (task: DeleteTask, messageId: string) => {
  const { type, id } = task.payload;
  const logger = rootLogger.child({
    messageId,
    id,
    type,
    module: "DeleteTask",
  });
  logger.info("Deleting task");

  if (type === "EVENT_TYPE") {
    const eventPersistence = new EventPersistence(task.payload.project);
    const events = await eventPersistence.findAllBy({
      key: "eventType",
      value: id,
    });
    logger.info({ events: events.length }, "Deleting events for type");
    await Promise.all(events.map((event) => eventPersistence.delete(event.id)));
  } else if (type === "PROJECT") {
    logger.info("Deleting content associated with project");

    await Promise.all(
      [
        ActionPersistence,
        CampaignPersistence,
        ContactPersistence,
        EmailPersistence,
        EventTypePersistence,
        EventPersistence,
        TemplatePersistence,
      ].map(async (Persistence) => {
        const items = await new Persistence(id).listAll();
        logger.info(
          { items: items.length, type: Persistence.name },
          "Deleting items for project"
        );
        await Promise.all(
          items.map((item) => new Persistence(id).delete(item.id))
        );
      })
    );

    const membershipPersistence = new MembershipPersistence();
    const memberships = await membershipPersistence.findAllBy({
      key: "project",
      value: id,
    });
    logger.info(
      { memberships: memberships.length },
      "Deleting memberships for project"
    );
    await Promise.all(
      memberships.map((membership) =>
        membershipPersistence.delete(membership.id)
      )
    );
  } else if (type === "USER") {
    const membershipPersistence = new MembershipPersistence();
    const memberships = await membershipPersistence.findAllBy({
      key: "user",
      value: id,
    });
    logger.info(
      { memberships: memberships.length },
      "Deleting memberships for user"
    );
    await Promise.all(
      memberships.map((membership) =>
        membershipPersistence.delete(membership.id)
      )
    );
  }
};
