import type { Trigger } from "@sendra/shared";
import { TriggerSchema } from "@sendra/shared";
import { type IndexInfo, LOCAL_INDEXES, UnembeddingBasePersistence } from "./BasePersistence";
import { HttpException } from "./utils/HttpException";

export class TriggerPersistence extends UnembeddingBasePersistence<Trigger> {
  constructor(projectId: string) {
    super(`TRIGGER#${projectId}`, TriggerSchema);
  }

  getIndexInfo(key: string): IndexInfo {
    if (key === "action") {
      return LOCAL_INDEXES.ATTR_1;
    }
    if (key === "contact") {
      return LOCAL_INDEXES.ATTR_2;
    }
    if (key === "event") {
      return LOCAL_INDEXES.ATTR_3;
    }
    throw new HttpException(400, `No index implemented for: ${key}`);
  }

  projectItem(item: Trigger): Trigger & { i_attr1?: string; i_attr2?: string; i_attr3?: string } {
    return {
      ...item,
      i_attr1: item.action,
      i_attr2: item.contact,
      i_attr3: item.event,
    };
  }
}
