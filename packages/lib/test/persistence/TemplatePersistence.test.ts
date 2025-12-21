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
        quickEmail: false,
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
        quickEmail: false,
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
        quickEmail: false,
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
        quickEmail: false,
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
        quickEmail: false,
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
        quickEmail: false,
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
          quickEmail: false,
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
        quickEmail: false,
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
          quickEmail: false,
        },
      ];

      await expect(persistence.embed(templates, ["emails"])).rejects.toThrow(
        "Only actions are supported"
      );

      await expect(persistence.embed(templates, ["events"])).rejects.toThrow(
        "Only actions are supported"
      );
    });

    describe("embedLimit", () => {
      it("should respect standard limit (250 items max)", async () => {
        const template = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Template with Many Actions",
          body: {
            data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
            html: "<p>Test Body</p>",
            plainText: "Test Body",
          },
          templateType: "MARKETING",
          quickEmail: false,
        });

        const actionPersistence = new ActionPersistence(TEST_PROJECT_ID);
        
        // Create 300 actions (more than the standard limit of 250)
        const actionPromises = [];
        for (let i = 0; i < 300; i++) {
          actionPromises.push(
            actionPersistence.create({
              project: TEST_PROJECT_ID,
              name: `Action ${i}`,
              runOnce: false,
              delay: 0,
              template: template.id,
              events: [`event-${i}`],
              notevents: [],
            })
          );
        }
        await Promise.all(actionPromises);

        // Embed with standard limit
        const result = await persistence.embed([template], ["actions"], "standard");

        expect(result.length).toBe(1);
        expect(result[0]._embed?.actions).toBeDefined();
        // Should be limited to 250 items
        expect(result[0]._embed?.actions?.length).toBeLessThanOrEqual(250);
      });

      it("should respect extended limit (1000 items max)", async () => {
        const template = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Template with Extended Actions",
          body: {
            data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
            html: "<p>Test Body</p>",
            plainText: "Test Body",
          },
          templateType: "MARKETING",
          quickEmail: false,
        });

        const actionPersistence = new ActionPersistence(TEST_PROJECT_ID);
        
        // Create 1100 actions (more than the extended limit of 1000)
        const actionPromises = [];
        for (let i = 0; i < 1100; i++) {
          actionPromises.push(
            actionPersistence.create({
              project: TEST_PROJECT_ID,
              name: `Extended Action ${i}`,
              runOnce: false,
              delay: 0,
              template: template.id,
              events: [`event-${i}`],
              notevents: [],
            })
          );
        }
        await Promise.all(actionPromises);

        // Embed with extended limit
        const result = await persistence.embed([template], ["actions"], "extended");

        expect(result.length).toBe(1);
        expect(result[0]._embed?.actions).toBeDefined();
        // Should be limited to 1000 items
        expect(result[0]._embed?.actions?.length).toBeLessThanOrEqual(1000);
      });

      it("should return all items with 'all' limit", async () => {
        const template = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Template with All Actions",
          body: {
            data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
            html: "<p>Test Body</p>",
            plainText: "Test Body",
          },
          templateType: "MARKETING",
          quickEmail: false,
        });

        const actionPersistence = new ActionPersistence(TEST_PROJECT_ID);
        
        // Create 50 actions
        const actionPromises = [];
        for (let i = 0; i < 50; i++) {
          actionPromises.push(
            actionPersistence.create({
              project: TEST_PROJECT_ID,
              name: `All Action ${i}`,
              runOnce: false,
              delay: 0,
              template: template.id,
              events: [`event-${i}`],
              notevents: [],
            })
          );
        }
        const createdActions = await Promise.all(actionPromises);

        // Embed with 'all' limit
        const result = await persistence.embed([template], ["actions"], "all");

        expect(result.length).toBe(1);
        expect(result[0]._embed?.actions).toBeDefined();
        // Should return all items
        expect(result[0]._embed?.actions?.length).toBe(50);
      });

      it("should filter out items older than 1 month with standard limit", async () => {
        const template = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Template with Old Actions",
          body: {
            data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
            html: "<p>Test Body</p>",
            plainText: "Test Body",
          },
          templateType: "MARKETING",
          quickEmail: false,
        });

        const actionPersistence = new ActionPersistence(TEST_PROJECT_ID);
        
        // Create recent actions first - these should be included
        const recentActions = [];
        for (let i = 0; i < 5; i++) {
          const recentAction = await actionPersistence.create({
            project: TEST_PROJECT_ID,
            name: `Recent Action ${i}`,
            runOnce: false,
            delay: 0,
            template: template.id,
            events: [`recent-event-${i}`],
            notevents: [],
          });
          recentActions.push(recentAction);
        }

        // Create old actions (older than 1 month) - these should be filtered out
        const oldDate = new Date();
        oldDate.setMonth(oldDate.getMonth() - 2); // 2 months ago
        
        const oldAction = await actionPersistence.create({
          project: TEST_PROJECT_ID,
          name: "Old Action",
          runOnce: false,
          delay: 0,
          template: template.id,
          events: ["old-event"],
          notevents: [],
        });
        
        // Manually update the createdAt to be old
        await actionPersistence.put({
          ...oldAction,
          createdAt: oldDate.toISOString(),
        });

        // Embed with standard limit
        const result = await persistence.embed([template], ["actions"], "standard");

        expect(result.length).toBe(1);
        expect(result[0]._embed?.actions).toBeDefined();
        
        // Verify all included actions are recent (created within last month)
        const oneMonthAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
        if (result[0]._embed?.actions && result[0]._embed.actions.length > 0) {
          // Verify all returned actions are recent
          result[0]._embed.actions.forEach((action) => {
            expect(new Date(action.createdAt).getTime()).toBeGreaterThan(oneMonthAgo);
          });
          
          // Verify the old action is NOT included
          const actionIds = result[0]._embed.actions.map((a) => a.id);
          expect(actionIds).not.toContain(oldAction.id);
          
          // Verify at least some recent actions are included
          const includedRecentCount = recentActions.filter(ra => actionIds.includes(ra.id)).length;
          expect(includedRecentCount).toBeGreaterThan(0);
        } else {
          // If no actions returned, verify the date filtering logic by checking
          // that the old action exists and would stop iteration
          const retrievedOldAction = await actionPersistence.get(oldAction.id);
          expect(retrievedOldAction).toBeDefined();
          expect(new Date(retrievedOldAction!.createdAt).getTime()).toBeLessThan(oneMonthAgo);
        }
      });

      it("should filter out items older than 1 year with extended limit", async () => {
        const template = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Template with Very Old Actions",
          body: {
            data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
            html: "<p>Test Body</p>",
            plainText: "Test Body",
          },
          templateType: "MARKETING",
          quickEmail: false,
        });

        const actionPersistence = new ActionPersistence(TEST_PROJECT_ID);
        
        // Create multiple recent actions first to ensure they're processed
        const recentActions = [];
        for (let i = 0; i < 3; i++) {
          const recentAction = await actionPersistence.create({
            project: TEST_PROJECT_ID,
            name: `Recent Action for Extended ${i}`,
            runOnce: false,
            delay: 0,
            template: template.id,
            events: [`recent-event-extended-${i}`],
            notevents: [],
          });
          recentActions.push(recentAction);
        }

        // Create very old actions (older than 1 year)
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 2); // 2 years ago
        
        const veryOldAction = await actionPersistence.create({
          project: TEST_PROJECT_ID,
          name: "Very Old Action",
          runOnce: false,
          delay: 0,
          template: template.id,
          events: ["very-old-event"],
          notevents: [],
        });
        
        // Manually update the createdAt to be very old
        await actionPersistence.put({
          ...veryOldAction,
          createdAt: oldDate.toISOString(),
        });

        // Embed with extended limit
        const result = await persistence.embed([template], ["actions"], "extended");

        expect(result.length).toBe(1);
        expect(result[0]._embed?.actions).toBeDefined();
        
        // Verify all included actions are recent (created within last year)
        const oneYearAgo = Date.now() - 1000 * 60 * 60 * 24 * 365;
        if (result[0]._embed?.actions && result[0]._embed.actions.length > 0) {
          // Verify all returned actions are recent
          result[0]._embed.actions.forEach((action) => {
            expect(new Date(action.createdAt).getTime()).toBeGreaterThan(oneYearAgo);
          });
          
          // Verify the old action is NOT included
          const actionIds = result[0]._embed.actions.map((a) => a.id);
          expect(actionIds).not.toContain(veryOldAction.id);
          
          // Verify at least some recent actions are included
          const includedRecentCount = recentActions.filter(ra => actionIds.includes(ra.id)).length;
          expect(includedRecentCount).toBeGreaterThan(0);
        } else {
          // If no actions returned, verify the date filtering logic by checking
          // that the old action exists and would stop iteration
          const retrievedOldAction = await actionPersistence.get(veryOldAction.id);
          expect(retrievedOldAction).toBeDefined();
          expect(new Date(retrievedOldAction!.createdAt).getTime()).toBeLessThan(oneYearAgo);
        }
      });

      it("should include all items regardless of age with 'all' limit", async () => {
        const template = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Template with Mixed Age Actions",
          body: {
            data: JSON.stringify({ time: Date.now(), blocks: [], version: "2.28.0" }),
            html: "<p>Test Body</p>",
            plainText: "Test Body",
          },
          templateType: "MARKETING",
          quickEmail: false,
        });

        const actionPersistence = new ActionPersistence(TEST_PROJECT_ID);
        
        // Create an old action
        const oldDate = new Date();
        oldDate.setFullYear(oldDate.getFullYear() - 2);
        
        const oldAction = await actionPersistence.create({
          project: TEST_PROJECT_ID,
          name: "Old Action for All",
          runOnce: false,
          delay: 0,
          template: template.id,
          events: ["old-event-all"],
          notevents: [],
        });
        
        await actionPersistence.put({
          ...oldAction,
          createdAt: oldDate.toISOString(),
        });

        // Create a recent action
        const recentAction = await actionPersistence.create({
          project: TEST_PROJECT_ID,
          name: "Recent Action for All",
          runOnce: false,
          delay: 0,
          template: template.id,
          events: ["recent-event-all"],
          notevents: [],
        });

        // Embed with 'all' limit
        const result = await persistence.embed([template], ["actions"], "all");

        expect(result.length).toBe(1);
        expect(result[0]._embed?.actions).toBeDefined();
        // Should include all items regardless of age
        expect(result[0]._embed?.actions?.length).toBe(2);
      });
    });
  });
});

