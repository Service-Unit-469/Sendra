import type { Contact, EventType, Project } from "@sendra/shared";
import { rootLogger } from "../logging";
import { ActionPersistence, EventPersistence, TemplatePersistence } from "../persistence";
import { TaskQueue } from "./TaskQueue";

export class ActionsService {
  /**
   * Takes a contact and an event and triggers all required actions
   * @param contact
   * @param event
   * @param project
   */
  public static async trigger({ eventType, contact, project }: { eventType: EventType; contact: Contact; project: Project }) {
    const actionPersistence = new ActionPersistence(project.id);
    const actions = await actionPersistence.listAll().then((actions) => actions.filter((action) => action.events.includes(eventType.id)));

    const eventPersistence = new EventPersistence(project.id);
    const contactEvents = await eventPersistence.findAllBy({
      key: "contact",
      value: contact.id,
    });

    for (const action of actions) {
      const hasTriggeredAction = !!contactEvents.find((t) => t.relation === action.id);

      if (action.runOnce && hasTriggeredAction) {
        // User has already triggered this run once action
        continue;
      }

      if (action.notevents.length > 0 && action.notevents.some((e) => contactEvents.some((t) => t.eventType === e))) {
        continue;
      }

      let triggeredEvents = contactEvents.filter((t) => t.eventType === eventType.id);

      if (hasTriggeredAction) {
        const lastActionTrigger = contactEvents.filter((t) => t.contact === contact.id && t.relation === action.id)[0];
        triggeredEvents = triggeredEvents.filter((e) => e.createdAt > lastActionTrigger.createdAt);
      }

      const updatedTriggers = [...new Set(triggeredEvents.map((t) => t.eventType))];
      const requiredTriggers = action.events;

      if (updatedTriggers.sort().join(",") !== requiredTriggers.sort().join(",")) {
        // Not all required events have been triggered
        continue;
      }

      // Create trigger in DynamoDB
      const event = {
        action: action.id,
        contact: contact.id,
        eventType: eventType.id,
        project: project.id,
      };
      await eventPersistence.create(event);

      const templatePersistence = new TemplatePersistence(project.id);
      const template = await templatePersistence.get(action.template);
      if (!contact.subscribed && template?.templateType === "MARKETING") {
        continue;
      }

      if (!template) {
        rootLogger.error({ actionId: action.id }, "Template not found");
        continue;
      }

      await TaskQueue.addTask({
        type: "sendEmail",
        delaySeconds: action?.delay ? action.delay * 60 : 0,
        payload: {
          action: action.id,
          contact: contact.id,
          project: project.id,
        },
      });
    }
  }
}
