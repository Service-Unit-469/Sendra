import type { Template } from "@sendra/shared";
import { TemplateSchema } from "@sendra/shared";
import { BasePersistence, type Embeddable, type EmbeddedObject, type IndexInfo } from "./BasePersistence";
import { embedHelper } from "./utils/EmbedHelper";
import { HttpException } from "./utils/HttpException";

export class TemplatePersistence extends BasePersistence<Template> {
  constructor(projectId: string) {
    super(`TEMPLATE#${projectId}`, TemplateSchema);
  }

  async embed(items: Template[], embed?: Embeddable[]): Promise<EmbeddedObject<Template>[]> {
    return await embedHelper(items, "template", ["actions"], embed);
  }

  getIndexInfo(): IndexInfo {
    throw new HttpException(400, "No indexes implemented for TemplatePersistence");
  }

  projectItem(item: Template): Template & { i_attr1?: string; i_attr2?: string } {
    return item;
  }
}
