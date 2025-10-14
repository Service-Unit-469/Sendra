import type { Event } from "@sendra/shared";
import { EventSchema } from "@sendra/shared";
import { type IndexInfo, LOCAL_INDEXES, UnembeddingBasePersistence } from "./BasePersistence";
import { HttpException } from "./utils/HttpException";

export class EventPersistence extends UnembeddingBasePersistence<Event> {
  constructor(projectId: string) {
    super(`EVENT#${projectId}`, EventSchema);
  }

  getIndexInfo(key: string): IndexInfo {
    if (key === "relation") {
      return LOCAL_INDEXES.ATTR_1;
    }
    if (key === "contact") {
      return LOCAL_INDEXES.ATTR_2;
    }
    if (key === "eventType") {
      return LOCAL_INDEXES.ATTR_3;
    }
    throw new HttpException(400, `No index implemented for: ${key}`);
  }

  projectItem(item: Event): Event & { i_attr1?: string; i_attr2?: string; i_attr3?: string } {
    return {
      ...item,
      i_attr1: item.relation,
      i_attr2: item.contact,
      i_attr3: item.eventType,
    };
  }
}
