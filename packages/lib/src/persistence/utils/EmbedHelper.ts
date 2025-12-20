import type { Action, BaseType, Email, Event } from "@sendra/shared";
import { ActionPersistence } from "../ActionPersistence";
import type { Embeddable, EmbeddedObject, StopFn } from "../BasePersistence";
import { EmailPersistence } from "../EmailPersistence";
import { EventPersistence } from "../EventPersistence";
import { HttpException } from "./HttpException";

const ONE_MONTH_IN_MS = 1000 * 60 * 60 * 24 * 30;
const ONE_YEAR_IN_MS = 1000 * 60 * 60 * 24 * 365;

const getEmbedLimitFunction: (limit?: EmbedLimit) => StopFn<ProjectEntity> = (limit?: EmbedLimit) => {
  switch (limit) {
    case "extended":
      return (item: ProjectEntity, index: number) => index < 1001 && new Date(item.createdAt) > new Date(Date.now() - ONE_YEAR_IN_MS);
    case "all":
      return () => true;
    default:
      return (item: ProjectEntity, index: number) => index < 256 && new Date(item.createdAt) > new Date(Date.now() - ONE_MONTH_IN_MS);
  }
};

export type EmbedLimit = "standard" | "extended" | "all";

export type ProjectEntity = BaseType & {
  project: string;
};

export type EmbedOptions<T extends ProjectEntity> = {
  items: T[];
  key: string;
  supportedEmbed: Embeddable[];
  embed?: Embeddable[];
  embedLimit?: EmbedLimit;
};

export const embedHelper = async <T extends ProjectEntity>(options: EmbedOptions<T>): Promise<EmbeddedObject<T>[]> => {
  const { items, key, supportedEmbed, embed, embedLimit } = options;
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
          stop: getEmbedLimitFunction(embedLimit),
        });
      }

      let emails: Email[] | undefined;
      if (embed.includes("emails")) {
        const emailPersistence = new EmailPersistence(item.project);
        emails = await emailPersistence.findAllBy({
          key: ["action", "campaign"].includes(key) ? "source" : key,
          value: item.id,
          stop: getEmbedLimitFunction(embedLimit),
        });
      }

      let events: Event[] | undefined;
      if (embed.includes("events")) {
        const eventPersistence = new EventPersistence(item.project);
        events = await eventPersistence.findAllBy({
          key: ["action", "campaign"].includes(key) ? "relation" : key,
          value: item.id,
          stop: getEmbedLimitFunction(embedLimit),
        });
      }
      if (events || emails || actions) {
        return {
          ...item,
          _embed: {
            actions,
            emails,
            events,
          },
        };
      }
      return item;
    }),
  );
};
