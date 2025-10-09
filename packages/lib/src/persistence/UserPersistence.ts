import type { User } from "@sendra/shared";
import { UserSchema } from "@sendra/shared";
import { TaskQueue } from "../services/TaskQueue";
import { type IndexInfo, LOCAL_INDEXES, UnembeddingBasePersistence } from "./BasePersistence";
import { HttpException } from "./utils/HttpException";

const TYPE = "USER";

export class UserPersistence extends UnembeddingBasePersistence<User> {
  constructor() {
    super(TYPE, UserSchema);
  }

  async getByEmail(email: string): Promise<User | undefined> {
    const user = await this.findBy({
      key: "email",
      value: email,
    });
    if (user.items.length === 0) {
      return undefined;
    }
    return user.items[0];
  }

  getIndexInfo(key: string): IndexInfo {
    if (key === "email") {
      return LOCAL_INDEXES.ATTR_1;
    }
    throw new HttpException(400, `No index implemented for: ${key}`);
  }

  async delete(id: string) {
    await super.delete(id);
    TaskQueue.addTask({
      type: "batchDeleteRelated",
      payload: {
        type: "USER",
        id,
      },
    });
  }

  projectItem(item: User): User & { i_attr1?: string; i_attr2?: string } {
    return {
      ...item,
      i_attr1: item.email,
    };
  }
}
