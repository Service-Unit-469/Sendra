import type { Action } from "@sendra/shared";
import { ActionSchema } from "@sendra/shared";
import { BasePersistence, type Embeddable, type EmbeddedObject, type IndexInfo, LOCAL_INDEXES } from "./BasePersistence";
import { type EmbedLimit, embedHelper } from "./utils/EmbedHelper";
import { HttpException } from "./utils/HttpException";

export class ActionPersistence extends BasePersistence<Action> {
  constructor(projectId: string) {
    super(`ACTION#${projectId}`, ActionSchema);
  }

  async embed(items: Action[], embed?: Embeddable[], embedLimit?: EmbedLimit): Promise<EmbeddedObject<Action>[]> {
    return embedHelper({
      items,
      key: "action",
      supportedEmbed: ["emails", "events"],
      embed,
      embedLimit,
    });
  }

  getIndexInfo(key: string): IndexInfo {
    if (key === "template") {
      return LOCAL_INDEXES.ATTR_1;
    }
    throw new HttpException(400, `No index implemented for: ${key}`);
  }

  projectItem(item: Action): Action & { i_attr1?: string; i_attr2?: string } {
    return {
      ...item,
      i_attr1: item.template,
    };
  }

  async getRelated(id: string): Promise<Action[]> {
    const action = await this.get(id);

    if (!action) {
      return [];
    }

    const actions = await this.listAll();

    return actions
      .filter((item) => item.id !== id)
      .filter((item) => {
        return action.events.some((event) => item.events.includes(event)) || action.notevents.some((event) => item.notevents.includes(event)) || action.template === item.template;
      });
  }
}
