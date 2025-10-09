import type { Membership, MembershipRole } from "@sendra/shared";
import { MembershipSchema } from "@sendra/shared";
import { type IndexInfo, LOCAL_INDEXES, UnembeddingBasePersistence } from "./BasePersistence";
import { UserPersistence } from "./UserPersistence";
import { HttpException } from "./utils/HttpException";

export class MembershipPersistence extends UnembeddingBasePersistence<Membership> {
  constructor() {
    super("MEMBERSHIP", MembershipSchema);
  }

  getIndexInfo(key: string): IndexInfo {
    if (key === "user") {
      return LOCAL_INDEXES.ATTR_1;
    }
    if (key === "project") {
      return LOCAL_INDEXES.ATTR_2;
    }
    throw new HttpException(400, `No index implemented for: ${key}`);
  }

  public async getProjectMemberships(projectId: string) {
    return this.findAllBy({
      key: "project",
      value: projectId,
    });
  }

  public async getUserMemberships(userId: string) {
    return this.findAllBy({
      key: "user",
      value: userId,
    });
  }

  public async invite(projectId: string, email: string, role: MembershipRole) {
    const userPersistence = new UserPersistence();
    const invited = await userPersistence.getByEmail(email);
    if (!invited) {
      throw new Error(`User not found: ${email}`);
    }
    await this.create({
      email,
      user: invited.id,
      project: projectId,
      role,
    });
  }

  public async isMember(projectId: string, userId: string) {
    const memberships = await this.getProjectMemberships(projectId);
    return memberships.some((membership) => membership.user === userId);
  }

  public async isAdmin(projectId: string, userId: string) {
    const memberships = await this.getProjectMemberships(projectId);
    return memberships.some((membership) => membership.user === userId && membership.role === "ADMIN");
  }

  projectItem(item: Membership): Membership & { i_attr1?: string; i_attr2?: string } {
    return {
      ...item,
      i_attr1: item.user,
      i_attr2: item.project,
    };
  }

  public async kick(projectId: string, userId: string) {
    const memberships = await this.getProjectMemberships(projectId);
    await Promise.all(memberships.filter((membership) => membership.user === userId).map((membership) => this.delete(membership.id)));
  }
}
