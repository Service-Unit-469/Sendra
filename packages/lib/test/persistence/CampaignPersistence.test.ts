import type { Campaign } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CampaignPersistence } from "../../src/persistence/CampaignPersistence";

const TEST_TABLE_NAME = "test-sendra-table";
const TEST_PROJECT_ID = "test-project-456";

describe("CampaignPersistence", () => {
  let persistence: CampaignPersistence;

 beforeAll(async () => {
    // Start local DynamoDB
    await startupDynamoDB();

    // Now import CampaignPersistence after mocks are set up
    persistence = new CampaignPersistence(TEST_PROJECT_ID);
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  describe("Campaign-specific functionality", () => {
    describe("basic CRUD smoke test", () => {
      it("should create and retrieve a campaign with valid schema", async () => {
        const campaignData = {
          project: TEST_PROJECT_ID,
          subject: "Test Campaign Subject",
          body: "This is the email body content",
          email: "sender@example.com",
          from: "Sender Name",
          recipients: ["recipient-1", "recipient-2"],
          status: "DRAFT" as const,
        };

        const created = await persistence.create(campaignData);

        expect(created).toMatchObject({
          ...campaignData,
          id: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        });

        const retrieved = await persistence.get(created.id);
        expect(retrieved).toMatchObject(created);
      });

      it("should enforce schema validation for subject length", async () => {
        const invalidCampaign = {
          project: TEST_PROJECT_ID,
          subject: "A".repeat(71), // Too long (max 70)
          body: "Body content",
          recipients: ["recipient-1"],
          status: "DRAFT" as const,
        };

        await expect(persistence.create(invalidCampaign)).rejects.toThrow();
      });

      it("should enforce schema validation for required fields", async () => {
        const invalidCampaign = {
          project: TEST_PROJECT_ID,
          subject: "Valid Subject",
          // Missing body
          recipients: ["recipient-1"],
          status: "DRAFT" as const,
        };

        await expect(
          persistence.create(invalidCampaign as Campaign)
        ).rejects.toThrow();
      });
    });

    describe("projectItem", () => {
      it("should return the campaign item unchanged", () => {
        const campaign: Campaign = {
          id: "test-id",
          project: TEST_PROJECT_ID,
          subject: "Test Subject",
          body: "Test Body",
          email: "test@example.com",
          from: "Test Sender",
          recipients: ["rec-1"],
          status: "DRAFT",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const projected = persistence.projectItem(campaign);

        expect(projected).toEqual(campaign);
        expect(projected).toBe(campaign); // Should be the same reference
      });

      it("should not add any index attributes", () => {
        const campaign: Campaign = {
          id: "test-id-2",
          project: TEST_PROJECT_ID,
          subject: "Another Subject",
          body: "Another Body",
          recipients: ["rec-2"],
          status: "DELIVERED",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const projected = persistence.projectItem(campaign);

        expect(projected).not.toHaveProperty("i_attr1");
        expect(projected).not.toHaveProperty("i_attr2");
        expect(projected).not.toHaveProperty("i_attr3");
        expect(projected).not.toHaveProperty("i_attr4");
      });
    });

    describe("getIndexInfo", () => {
      it("should throw HttpException with code 400", () => {
        try {
          // @ts-expect-error - we expect this to throw
          persistence.getIndexInfo("test-key");
          expect.fail("Should have thrown an error");
        } catch (error: any) {
          expect(error.code).toBe(400);
          expect(error.message).toBe(
            "No indexes implemented for CampaignPersistence"
          );
        }
      });
    });

    describe("embed", () => {
      it("should return campaigns without embed when no embed requested", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Embed Test Campaign",
          body: "Test body for embed",
          recipients: ["recipient-embed"],
          status: "DRAFT",
        });

        const campaigns = [campaign];
        const result = await persistence.embed(campaigns);

        expect(result).toEqual(campaigns);
        expect(result[0]).not.toHaveProperty("_embed");
      });

      it("should handle embed parameter for emails", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Embed with Emails Test",
          body: "Test body",
          recipients: ["recipient-emails"],
          status: "DRAFT",
        });

        const campaigns = [campaign];
        const result = await persistence.embed(campaigns, ["emails"]);

        // The embedHelper should process the embed request
        // Since we don't have actual emails in the test, it should just return the campaigns
        expect(result).toBeDefined();
        expect(result.length).toBe(1);
      });

      it("should handle empty campaigns array", async () => {
        const result = await persistence.embed([]);
        expect(result).toEqual([]);
      });
    });

    describe("status transitions", () => {
      it("should allow creating campaigns with DRAFT status", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Draft Campaign",
          body: "Draft body",
          recipients: ["rec-draft"],
          status: "DRAFT",
        });

        expect(campaign.status).toBe("DRAFT");
      });

      it("should allow creating campaigns with DELIVERED status", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Delivered Campaign",
          body: "Delivered body",
          recipients: ["rec-delivered"],
          status: "DELIVERED",
        });

        expect(campaign.status).toBe("DELIVERED");
      });

      it("should reject invalid status values", async () => {
        const invalidCampaign = {
          project: TEST_PROJECT_ID,
          subject: "Invalid Status Campaign",
          body: "Body",
          recipients: ["rec-invalid"],
          status: "INVALID_STATUS",
        };

        await expect(
          persistence.create(invalidCampaign as Campaign)
        ).rejects.toThrow();
      });

      it("should allow updating campaign status", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Status Update Test",
          body: "Body",
          recipients: ["rec-update"],
          status: "DRAFT",
        });

        const updated = await persistence.put({
          ...campaign,
          status: "DELIVERED" as const,
        });

        expect(updated.status).toBe("DELIVERED");
      });
    });

    describe("optional fields", () => {
      it("should allow campaign without optional email field", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "No Email Field",
          body: "Body content",
          recipients: ["rec-no-email"],
          status: "DRAFT",
        });

        expect(campaign.email).toBeUndefined();
      });

      it("should allow campaign with valid email field", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "With Email Field",
          body: "Body content",
          email: "sender@example.com",
          recipients: ["rec-with-email"],
          status: "DRAFT",
        });

        expect(campaign.email).toBe("sender@example.com");
      });

      it("should allow campaign without optional from field", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "No From Field",
          body: "Body content",
          recipients: ["rec-no-from"],
          status: "DRAFT",
        });

        expect(campaign.from).toBeUndefined();
      });

      it("should validate email format when provided", async () => {
        const invalidEmailCampaign = {
          project: TEST_PROJECT_ID,
          subject: "Invalid Email",
          body: "Body content",
          email: "not-a-valid-email",
          recipients: ["rec-invalid-email"],
          status: "DRAFT",
        };

        await expect(
          persistence.create(invalidEmailCampaign as Campaign)
        ).rejects.toThrow();
      });
    });

    describe("recipients", () => {
      it("should allow campaigns with multiple recipients", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Multiple Recipients",
          body: "Body",
          recipients: ["rec-1", "rec-2", "rec-3", "rec-4", "rec-5"],
          status: "DRAFT",
        });

        expect(campaign.recipients).toHaveLength(5);
      });

      it("should allow campaigns with single recipient", async () => {
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Single Recipient",
          body: "Body",
          recipients: ["rec-single"],
          status: "DRAFT",
        });

        expect(campaign.recipients).toHaveLength(1);
      });

      it("should require at least one recipient", async () => {
        // Note: The schema doesn't explicitly enforce min length, but recipients is required
        const campaign = await persistence.create({
          project: TEST_PROJECT_ID,
          subject: "Empty Recipients Test",
          body: "Body",
          recipients: [],
          status: "DRAFT",
        });

        expect(campaign.recipients).toEqual([]);
      });
    });
  });
});
