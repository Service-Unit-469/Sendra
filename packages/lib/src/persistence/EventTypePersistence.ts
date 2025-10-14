import type { EventType } from "@sendra/shared";
import { EventSchema, EventTypeSchema } from "@sendra/shared";
import { TaskQueue } from "../services/TaskQueue";
import {
  BasePersistence,
  type Embeddable,
  type EmbeddedObject,
  type IndexInfo,
  LOCAL_INDEXES,
} from "./BasePersistence";
import { embedHelper } from "./utils/EmbedHelper";
import { HttpException } from "./utils/HttpException";

export class EventTypePersistence extends BasePersistence<EventType> {
  constructor(private readonly projectId: string) {
    super(`EVENT_TYPE#${projectId}`, EventTypeSchema);
  }

  async embed(
    items: EventType[],
    embed?: Embeddable[]
  ): Promise<EmbeddedObject<EventType>[]> {
    return await embedHelper(items, "eventType", ["events"], embed);
  }

  async getByName(name: string): Promise<EventType | undefined> {
    return super
      .findBy({
        key: "name",
        value: name,
      })
      .then((result) => result.items[0]);
  }

  getIndexInfo(key: string): IndexInfo {
    if (key === "name") {
      return LOCAL_INDEXES.ATTR_1;
    }
    throw new HttpException(400, `No index implemented for: ${key}`);
  }

  async delete(id: string) {
    await super.delete(id);
    await TaskQueue.addTask({
      type: "batchDeleteRelated",
      payload: {
        project: this.projectId,
        type: "EVENT_TYPE",
        id,
      },
    });
  }

  projectItem(
    item: EventType
  ): EventType & { i_attr1?: string; i_attr2?: string; i_attr3?: string } {
    return {
      ...item,
      i_attr1: item.name,
    };
  }
}
