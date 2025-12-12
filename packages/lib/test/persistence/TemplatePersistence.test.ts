import type { Template } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ActionPersistence } from "../../src/persistence/ActionPersistence";
import { TemplatePersistence } from "../../src/persistence/TemplatePersistence";

const TEST_PROJECT_ID = "test-project-123";

describe("TemplatePersistence", () => {
  let persistence: TemplatePersistence;

  beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();


    persistence = new TemplatePersistence(TEST_PROJECT_ID);
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("getIndexInfo", () => {
    it("should throw error for any key", () => {
      // @ts-expect-error - we expect this to throw
      expect(() => persistence.getIndexInfo("anyKey" as any)).toThrow(
        "No indexes implemented for TemplatePersistence"
      );
    });
  });

  describe("projectItem", () => {
    it("should return item unchanged", () => {
      const template: Template = {
        id: "test-id",
        project: TEST_PROJECT_ID,
        subject: "Test Subject",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Test Body</p>",
          plainText: "Test Body",
        },
        templateType: "MARKETING" as Template["templateType"],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        quickEmail: false,
      };

      const projected = persistence.projectItem(template);

      expect(projected).toEqual(template);
      expect(projected.i_attr1).toBeUndefined();
      expect(projected.i_attr2).toBeUndefined();
    });
  });

  describe("create and retrieve", () => {
    it("should create a new template with all fields", async () => {
      const templateData = {
        project: TEST_PROJECT_ID,
        subject: "Welcome Email",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [{ type: "paragraph", data: { text: "Welcome!" } }], version: "2.28.0" }),
          html: "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
          plainText: "Welcome! Thanks for signing up.",
        },
        templateType: "MARKETING" as Template["templateType"],
        quickEmail: false,
      };

      const created = await persistence.create(templateData);

      expect(created).toMatchObject(templateData);
      expect(created.id).toBeTruthy();
      expect(created.createdAt).toBeTruthy();
      expect(created.updatedAt).toBeTruthy();
    });

    it("should retrieve created template", async () => {
      const templateData = {
        project: TEST_PROJECT_ID,
        subject: "Password Reset",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [{ type: "paragraph", data: { text: "Click here to reset" } }], version: "2.28.0" }),
          html: "<p>Click here to reset your password</p>",
          plainText: "Click here to reset your password",
        },
        templateType: "TRANSACTIONAL" as Template["templateType"],
        quickEmail: false,
      };

      const created = await persistence.create(templateData);
      const retrieved = await persistence.get(created.id);

      expect(retrieved).toMatchObject(templateData);
    });

    it("should handle templates with complex HTML", async () => {
      const complexHTML = `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial; }
                .header { background: #333; color: white; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>{{title}}</h1>
              </div>
              <div class="content">
                {{content}}
              </div>
            </body>
          </html>
        `;
      const templateData = {
        project: TEST_PROJECT_ID,
        subject: "Newsletter {{month}}",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [{ type: "paragraph", data: { text: "Newsletter content" } }], version: "2.28.0" }),
          html: complexHTML,
          plainText: "{{title}} {{content}}",
        },
        templateType: "MARKETING" as Template["templateType"],
      };

      const created = await persistence.create(templateData);
      const retrieved = await persistence.get(created.id);

      expect(retrieved?.body).toEqual(templateData.body);
      expect(retrieved?.subject).toBe(templateData.subject);
    });
  });

  describe("list and listAll", () => {
    it("should list all templates for a project", async () => {
      // Create test templates
      await persistence.create({
        project: TEST_PROJECT_ID,
        subject: "Template 1",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Body 1</p>",
          plainText: "Body 1",
        },
        templateType: "MARKETING",
      });

      await persistence.create({
        project: TEST_PROJECT_ID,
        subject: "Template 2",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Body 2</p>",
          plainText: "Body 2",
        },
        templateType: "MARKETING",
      });

      const result = await persistence.list({ limit: 10 });

      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.every((t) => t.project === TEST_PROJECT_ID)).toBe(true);
    });

    it("should not return templates from other projects", async () => {
      const persistence2 = new TemplatePersistence("another-project");

      await persistence2.create({
        project: "another-project",
        subject: "Other Project Template",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Other Body</p>",
          plainText: "Other Body",
        },
        templateType: "MARKETING",
      });

      const result = await persistence.list();

      expect(result.items.every((t) => t.project === TEST_PROJECT_ID)).toBe(true);
    });
  });

  describe("update", () => {
    it("should update template fields", async () => {
      const template = await persistence.create({
        project: TEST_PROJECT_ID,
        subject: "Original Subject",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Original Body</p>",
          plainText: "Original Body",
        },
        templateType: "MARKETING",
      });

      const updatedBody = {
        data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
        html: "<p>Updated Body</p>",
        plainText: "Updated Body",
      };
      const updated = await persistence.put({
        ...template,
        subject: "Updated Subject",
        body: updatedBody,
      });

      expect(updated.subject).toBe("Updated Subject");
      expect(updated.body).toEqual(updatedBody);
      expect(updated.id).toBe(template.id);
    });
  });

  describe("delete", () => {
    it("should delete a template", async () => {
      const template = await persistence.create({
        project: TEST_PROJECT_ID,
        subject: "To Delete",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Delete Me</p>",
          plainText: "Delete Me",
        },
        templateType: "MARKETING",
      });

      await persistence.delete(template.id);

      const retrieved = await persistence.get(template.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe("embed", () => {
    it("should return templates without embed when no embed requested", async () => {
      const templates: Template[] = [
        {
          id: "embed-test-1",
          project: TEST_PROJECT_ID,
          subject: "Embed Test",
          body: {
            data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
            html: "<p>Body</p>",
            plainText: "Body",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          templateType: "MARKETING",
        },
      ];

      const result = await persistence.embed(templates);

      expect(result).toEqual(templates);
    });

    it("should embed actions when requested", async () => {
      // Create a template
      const template = await persistence.create({
        project: TEST_PROJECT_ID,
        subject: "Template with Actions",
        body: {
          data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
          html: "<p>Test Body</p>",
          plainText: "Test Body",
        },
        templateType: "MARKETING",
      });

      // Create actions associated with this template
      const actionPersistence = new ActionPersistence(TEST_PROJECT_ID);
      
      const action1 = await actionPersistence.create({
        project: TEST_PROJECT_ID,
        name: "Action 1",
        runOnce: false,
        delay: 0,
        template: template.id,
        events: ["event-1"],
        notevents: [],
      });

      const action2 = await actionPersistence.create({
        project: TEST_PROJECT_ID,
        name: "Action 2",
        runOnce: true,
        delay: 3600,
        template: template.id,
        events: ["event-2"],
        notevents: [],
      });

      // Embed actions
      const result = await persistence.embed([template], ["actions"]);

      expect(result.length).toBe(1);
      expect(result[0]._embed).toBeDefined();
      expect(result[0]._embed?.actions).toBeDefined();
      expect(result[0]._embed?.actions?.length).toBe(2);
      
      const actionIds = result[0]._embed?.actions?.map((a) => a.id).sort();
      expect(actionIds).toEqual([action1.id, action2.id].sort());
    });

    it("should throw error when attempting to embed unsupported types", async () => {
      const templates: Template[] = [
        {
          id: "embed-error-test",
          project: TEST_PROJECT_ID,
          subject: "Error Test",
          body: {
            data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
            html: "<p>Body</p>",
            plainText: "Body",
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          templateType: "MARKETING",
        },
      ];

      await expect(persistence.embed(templates, ["emails"])).rejects.toThrow(
        "Only actions are supported"
      );

      await expect(persistence.embed(templates, ["events"])).rejects.toThrow(
        "Only actions are supported"
      );
    });
  });
});

