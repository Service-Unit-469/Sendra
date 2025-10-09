import type { Contact, Event, Project } from "@sendra/shared";
import { rootLogger } from "../logging";
import { ActionPersistence, TemplatePersistence, TriggerPersistence } from "../persistence";
import { TaskQueue } from "./TaskQueue";

export class ActionsService {
  /**
   * Takes a contact and an event and triggers all required actions
   * @param contact
   * @param event
   * @param project
   */
  public static async trigger({ event, contact, project }: { event: Event; contact: Contact; project: Project }) {
    const actionPersistence = new ActionPersistence(project.id);
    const actions = await actionPersistence.listAll().then((actions) => actions.filter((action) => action.events.includes(event.id)));

    const triggerPersistence = new TriggerPersistence(project.id);
    const contactTriggers = await triggerPersistence.findAllBy({
      key: "contact",
      value: contact.id,
    });

    for (const action of actions) {
      const hasTriggeredAction = !!contactTriggers.find((t) => t.action === action.id);

      if (action.runOnce && hasTriggeredAction) {
        // User has already triggered this run once action
        continue;
      }

      if (action.notevents.length > 0 && action.notevents.some((e) => contactTriggers.some((t) => t.event === e))) {
        continue;
      }

      let triggeredEvents = contactTriggers.filter((t) => t.event === event.id);

      if (hasTriggeredAction) {
        const lastActionTrigger = contactTriggers.filter((t) => t.contact === contact.id && t.action === action.id)[0];
        triggeredEvents = triggeredEvents.filter((e) => e.createdAt > lastActionTrigger.createdAt);
      }

      const updatedTriggers = [...new Set(triggeredEvents.map((t) => t.event))];
      const requiredTriggers = action.events;

      if (updatedTriggers.sort().join(",") !== requiredTriggers.sort().join(",")) {
        // Not all required events have been triggered
        continue;
      }

      // Create trigger in DynamoDB
      const trigger = {
        action: action.id,
        contact: contact.id,
        event: event.id,
        project: project.id,
      };
      await triggerPersistence.create(trigger);

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
