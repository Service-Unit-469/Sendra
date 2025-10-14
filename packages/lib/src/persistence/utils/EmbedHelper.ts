import type { Action, BaseType, Email, Event, Template } from "@sendra/shared";
import { ActionPersistence } from "../ActionPersistence";
import type { Embeddable, EmbeddedObject } from "../BasePersistence";
import { EmailPersistence } from "../EmailPersistence";
import { EventPersistence } from "../EventPersistence";
import { TemplatePersistence } from "../TemplatePersistence";
import { HttpException } from "./HttpException";

export type ProjectEntity = BaseType & {
  project: string;
};

export const embedHelper = async <T extends ProjectEntity>(items: T[], key: string, supportedEmbed: Embeddable[], embed?: Embeddable[]): Promise<EmbeddedObject<T>[]> => {
  if (!embed || embed.length === 0) {
    return items as EmbeddedObject<T>[];
  }
  if (embed.some((e) => !supportedEmbed.includes(e))) {
    throw new HttpException(400, `Only ${supportedEmbed.join(", ")} are supported`);
  }

  return await Promise.all(
    items.map(async (item) => {
      let actions: Action[] | undefined;
      if (embed.includes("actions")) {
        const actionPersistence = new ActionPersistence(item.project);
        actions = await actionPersistence.findAllBy({
          key,
          value: item.id,
        });
      }

      let emails: Email[] | undefined;
      if (embed.includes("emails")) {
        const emailPersistence = new EmailPersistence(item.project);
        emails = await emailPersistence.findAllBy({
          key: ["action", "campaign"].includes(key) ? "source" : key,
          value: item.id,
        });
      }

      let templates: Template[] | undefined;
      if (embed.includes("templates")) {
        const templatePersistence = new TemplatePersistence(item.project);
        templates = await templatePersistence.findAllBy({
          key,
          value: item.id,
        });
      }

      let events: Event[] | undefined;
      if (embed.includes("events")) {
        const eventPersistence = new EventPersistence(item.project);
        events = await eventPersistence.findAllBy({
          key: ["action", "campaign"].includes(key) ? "relation" : key,
          value: item.id,
        });
      }
      if (events || emails || templates || actions) {
        return {
          ...item,
          _embed: {
            actions,
            emails,
            events,
            templates,
          },
        };
      }
      return item;
    }),
  );
};
