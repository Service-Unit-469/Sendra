import type { Event } from "@sendra/shared";
import { EventSchema } from "@sendra/shared";
import { TaskQueue } from "../services/TaskQueue";
import { BasePersistence, type Embeddable, type EmbeddedObject, type IndexInfo, LOCAL_INDEXES } from "./BasePersistence";
import { embedHelper } from "./utils/EmbedHelper";
import { HttpException } from "./utils/HttpException";

export class EventPersistence extends BasePersistence<Event> {
  constructor(private readonly projectId: string) {
    super(`EVENT#${projectId}`, EventSchema);
  }

  async embed(items: Event[], embed?: Embeddable[]): Promise<EmbeddedObject<Event>[]> {
    return await embedHelper(items, "event", ["triggers"], embed);
  }

  async getByName(name: string): Promise<Event | undefined> {
    return super
      .findBy({
        key: "name",
        value: name,
      })
      .then((result) => result.items[0]);
  }

  getIndexInfo(key: string): IndexInfo {
    if (key === "campaign") {
      return LOCAL_INDEXES.ATTR_1;
    }
    if (key === "name") {
      return LOCAL_INDEXES.ATTR_2;
    }
    if (key === "template") {
      return LOCAL_INDEXES.ATTR_3;
    }
    throw new HttpException(400, `No index implemented for: ${key}`);
  }

  async delete(id: string) {
    await super.delete(id);
    await TaskQueue.addTask({
      type: "batchDeleteRelated",
      payload: {
        project: this.projectId,
        type: "EVENT",
        id,
      },
    });
  }

  projectItem(item: Event): Event & { i_attr1?: string; i_attr2?: string; i_attr3?: string } {
    return {
      ...item,
      i_attr1: item.campaign,
      i_attr2: item.name,
      i_attr3: item.template,
    };
  }
}
