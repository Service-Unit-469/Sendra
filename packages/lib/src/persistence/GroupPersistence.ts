import type { Group } from "@service-unit-469/sendra-shared";
import { GroupSchema } from "@service-unit-469/sendra-shared";
import { type IndexInfo, UnembeddingBasePersistence } from "./BasePersistence";
import { ContactPersistence } from "./ContactPersistence";
import { HttpException } from "./utils/HttpException";

export class GroupPersistence extends UnembeddingBasePersistence<Group> {
  constructor(private readonly projectId: string) {
    super(`GROUP#${projectId}`, GroupSchema);
  }

  getIndexInfo(key: string): IndexInfo {
    throw new Error(`No index implemented for: ${key}`);
  }

  projectItem(item: Group): Group & { i_attr1?: string; i_attr2?: string } {
    return {
      ...item,
    };
  }

  async getContacts(groupId: string) {
    const group = await this.get(groupId);
    if (!group) {
      throw new HttpException(404, "Group not found");
    }
    const contactPersistence = new ContactPersistence(this.projectId);
    const contacts = await contactPersistence.batchGet(group.contacts);
    return contacts;
  }
}
