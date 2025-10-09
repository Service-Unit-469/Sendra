import type { Project } from "@sendra/shared";
import { ProjectSchema } from "@sendra/shared";
import { TaskQueue } from "../services/TaskQueue";
import { type IndexInfo, UnembeddingBasePersistence } from "./BasePersistence";
import { HttpException } from "./utils/HttpException";

export class ProjectPersistence extends UnembeddingBasePersistence<Project> {
  constructor() {
    super("PROJECT", ProjectSchema);
  }

  getIndexInfo(): IndexInfo {
    throw new HttpException(400, "No indexes implemented for ProjectPersistence");
  }

  async delete(id: string) {
    await super.delete(id);
    await TaskQueue.addTask({
      type: "batchDeleteRelated",
      payload: {
        type: "PROJECT",
        id,
      },
    });
  }

  projectItem(item: Project): Project & { i_attr1?: string; i_attr2?: string } {
    return item;
  }
}
