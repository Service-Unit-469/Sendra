import type { Action, BaseType, Email, Template, Trigger } from "@sendra/shared";
import { ActionPersistence } from "../ActionPersistence";
import type { Embeddable, EmbeddedObject } from "../BasePersistence";
import { EmailPersistence } from "../EmailPersistence";
import { TemplatePersistence } from "../TemplatePersistence";
import { TriggerPersistence } from "../TriggerPersistence";
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
          key: ["campaign", "action"].includes(key) ? "source" : key,
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

      let triggers: Trigger[] | undefined;
      if (embed.includes("triggers")) {
        const triggerPersistence = new TriggerPersistence(item.project);
        triggers = await triggerPersistence.findAllBy({
          key,
          value: item.id,
        });
      }

      return {
        ...item,
        actions,
        emails,
        templates,
        triggers,
      };
    }),
  );
};
