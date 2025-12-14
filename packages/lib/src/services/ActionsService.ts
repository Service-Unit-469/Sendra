import { type Contact, OOTB_EVENT_VALUES, type Project } from "@sendra/shared";
import { Unit } from "aws-embedded-metrics";
import { rootLogger } from "../logging";
import { withMetrics } from "../metrics";
import { ActionPersistence, EventPersistence, ProjectPersistence, TemplatePersistence } from "../persistence";
import { TaskQueue } from "./TaskQueue";

const logger = rootLogger.child({
  module: "ActionsService",
});

export class ActionsService {
  /**
   * Takes a contact and an event and triggers all required actions
   * @param contact
   * @param event
   * @param project
   */
  public static async trigger({ eventType, contact, project }: { eventType: string; contact: Contact; project: Project }) {
    return withMetrics(
      async (metricsLogger) => {
        metricsLogger.setProperty("EventType", eventType);
        metricsLogger.setProperty("Project", project.id);
        metricsLogger.setProperty("Contact", contact.id);

        const actionPersistence = new ActionPersistence(project.id);
        const actions = await actionPersistence.listAll().then((actions) => actions.filter((action) => action.events.includes(eventType)));

        metricsLogger.putMetric("ActionsEvaluated", actions.length, Unit.Count);

        const eventPersistence = new EventPersistence(project.id);
        const contactEvents = await eventPersistence.findAllBy({
          key: "contact",
          value: contact.id,
        });

        let actionsTriggered = 0;
        let actionsSkippedRunOnce = 0;
        let actionsSkippedNotEvents = 0;
        let actionsSkippedIncompleteTriggers = 0;
        let actionsSkippedUnsubscribed = 0;
        let actionsSkippedNoTemplate = 0;

        for (const action of actions) {
          const hasTriggeredAction = !!contactEvents.find((t) => t.relation === action.id);

          if (action.runOnce && hasTriggeredAction) {
            // User has already triggered this run once action
            actionsSkippedRunOnce++;
            continue;
          }

          if (action.notevents.length > 0 && action.notevents.some((e) => contactEvents.some((t) => t.eventType === e))) {
            actionsSkippedNotEvents++;
            continue;
          }

          // Get all contact events for the required event types
          let relevantEvents = contactEvents.filter((t) => action.events.includes(t.eventType));

          // If action was already triggered, only consider events after last trigger
          if (hasTriggeredAction) {
            const lastActionTrigger = contactEvents.find((t) => t.contact === contact.id && t.relation === action.id);
            if (lastActionTrigger) {
              relevantEvents = relevantEvents.filter((e) => e.createdAt > lastActionTrigger.createdAt);
            }
          }

          // Get unique event types that have been triggered
          const triggeredEventTypes = [...new Set(relevantEvents.map((t) => t.eventType))];
          const requiredTriggers = action.events;

          // Check if ALL required events have been triggered
          if (triggeredEventTypes.sort().join(",") !== requiredTriggers.sort().join(",")) {
            // Not all required events have been triggered
            actionsSkippedIncompleteTriggers++;
            continue;
          }

          // Only add custom event types to project.eventTypes (skip out-of-the-box events)
          if (!OOTB_EVENT_VALUES.includes(eventType) && !project.eventTypes.includes(eventType)) {
            logger.info({ projectId: project.id, eventType }, "Adding event type to project");
            const projectPersistence = new ProjectPersistence();
            project.eventTypes.push(eventType);
            await projectPersistence.put(project);
          }

          // Create event
          const event = {
            action: action.id,
            contact: contact.id,
            eventType: eventType,
            project: project.id,
          };
          await eventPersistence.create(event);

          const templatePersistence = new TemplatePersistence(project.id);
          const template = await templatePersistence.get(action.template);
          if (!contact.subscribed && template?.templateType === "MARKETING") {
            actionsSkippedUnsubscribed++;
            continue;
          }

          if (!template) {
            logger.error({ actionId: action.id }, "Template not found");
            actionsSkippedNoTemplate++;
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

          actionsTriggered++;
        }

        metricsLogger.putMetric("ActionsTriggered", actionsTriggered, Unit.Count);
        metricsLogger.putMetric("ActionsSkippedRunOnce", actionsSkippedRunOnce, Unit.Count);
        metricsLogger.putMetric("ActionsSkippedNotEvents", actionsSkippedNotEvents, Unit.Count);
        metricsLogger.putMetric("ActionsSkippedIncompleteTriggers", actionsSkippedIncompleteTriggers, Unit.Count);
        metricsLogger.putMetric("ActionsSkippedUnsubscribed", actionsSkippedUnsubscribed, Unit.Count);
        metricsLogger.putMetric("ActionsSkippedNoTemplate", actionsSkippedNoTemplate, Unit.Count);
      },
      {
        Operation: "TriggerActions",
      },
    );
  }
}
