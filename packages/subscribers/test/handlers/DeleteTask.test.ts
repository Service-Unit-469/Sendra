import {
	ActionPersistence,
	CampaignPersistence,
	ContactPersistence,
	EmailPersistence,
	EventPersistence,
	MembershipPersistence,
	TemplatePersistence,
	UserPersistence,
} from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { handleDelete } from "../../src/handlers/DeleteTask";
import { createTestAction, createTestCampaign, createTestContact, createTestEmail, createTestSetup, createTestTemplate } from "../utils/test-helpers";

describe("DeleteTask Handler", () => {
	let projectId: string;
	let userId: string;

	beforeAll(async () => {
		await startupDynamoDB();
	});

	afterAll(async () => {
		await stopDynamoDB();
	});

	beforeEach(async () => {
		const { user, project } = await createTestSetup();
		userId = user.id;
		projectId = project.id;
	});

	describe("Project Deletion", () => {
		test("should delete all actions associated with project", async () => {
			const template = await createTestTemplate(projectId);
			await createTestAction(projectId, template.id);
			await createTestAction(projectId, template.id);

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "PROJECT" as const,
					id: projectId,
				},
			};

			await handleDelete(task, "test-message-id");

			// Verify all actions were deleted
			const actionPersistence = new ActionPersistence(projectId);
			const actions = await actionPersistence.listAll();
			expect(actions.length).toBe(0);
		});

		test("should delete all campaigns associated with project", async () => {
			await createTestCampaign(projectId);
			await createTestCampaign(projectId);
			await createTestCampaign(projectId);

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "PROJECT" as const,
					id: projectId,
				},
			};

			await handleDelete(task, "test-message-id");

			// Verify all campaigns were deleted
			const campaignPersistence = new CampaignPersistence(projectId);
			const campaigns = await campaignPersistence.listAll();
			expect(campaigns.length).toBe(0);
		});

		test("should delete all contacts associated with project", async () => {
			await createTestContact(projectId);
			await createTestContact(projectId);
			await createTestContact(projectId);

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "PROJECT" as const,
					id: projectId,
				},
			};

			await handleDelete(task, "test-message-id");

			// Verify all contacts were deleted
			const contactPersistence = new ContactPersistence(projectId);
			const contacts = await contactPersistence.listAll();
			expect(contacts.length).toBe(0);
		});

		test("should delete all emails associated with project", async () => {
			const contact = await createTestContact(projectId);
			await createTestEmail(projectId, contact.id, "msg-1");
			await createTestEmail(projectId, contact.id, "msg-2");

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "PROJECT" as const,
					id: projectId,
				},
			};

			await handleDelete(task, "test-message-id");

			// Verify all emails were deleted
			const emailPersistence = new EmailPersistence(projectId);
			const emails = await emailPersistence.listAll();
			expect(emails.length).toBe(0);
		});

		test("should delete all events associated with project", async () => {
			const contact = await createTestContact(projectId);
			const eventPersistence = new EventPersistence(projectId);
			await eventPersistence.create({
				project: projectId,
				eventType: "user.signup",
				contact: contact.id,
			});
			await eventPersistence.create({
				project: projectId,
				eventType: "user.login",
				contact: contact.id,
			});

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "PROJECT" as const,
					id: projectId,
				},
			};

			await handleDelete(task, "test-message-id");

			// Verify all events were deleted
			const events = await eventPersistence.listAll();
			expect(events.length).toBe(0);
		});

		test("should delete all templates associated with project", async () => {
			await createTestTemplate(projectId);
			await createTestTemplate(projectId);

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "PROJECT" as const,
					id: projectId,
				},
			};

			await handleDelete(task, "test-message-id");

			// Verify all templates were deleted
			const templatePersistence = new TemplatePersistence(projectId);
			const templates = await templatePersistence.listAll();
			expect(templates.length).toBe(0);
		});

		test("should delete all memberships associated with project", async () => {
			// Create additional memberships
			const userPersistence = new UserPersistence();
			const user2 = await userPersistence.create({
				email: `testuser2-${Date.now()}@example.com`,
				password: "hashedpassword",
				enabled: true,
			});

			const membershipPersistence = new MembershipPersistence();
			await membershipPersistence.create({
				email: user2.email,
				user: user2.id,
				project: projectId,
				role: "MEMBER",
			});

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "PROJECT" as const,
					id: projectId,
				},
			};

			// Get membership count before deletion
			const membershipsBefore = await membershipPersistence.findAllBy({
				key: "project",
				value: projectId,
			});
			expect(membershipsBefore.length).toBeGreaterThan(0);

			await handleDelete(task, "test-message-id");

			// Verify all memberships were deleted
			const membershipsAfter = await membershipPersistence.findAllBy({
				key: "project",
				value: projectId,
			});
			expect(membershipsAfter.length).toBe(0);
		});

		test("should delete all project-related data in one operation", async () => {
			// Create comprehensive test data
			const template = await createTestTemplate(projectId);
			await createTestAction(projectId, template.id);
			await createTestCampaign(projectId);
			const contact = await createTestContact(projectId);
			await createTestEmail(projectId, contact.id, "msg-1");

			const eventPersistence = new EventPersistence(projectId);
			await eventPersistence.create({
				project: projectId,
				eventType: "user.signup",
				contact: contact.id,
			});

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "PROJECT" as const,
					id: projectId,
				},
			};

			await handleDelete(task, "test-message-id");

			// Verify all data was deleted
			expect((await new ActionPersistence(projectId).listAll()).length).toBe(0);
			expect((await new CampaignPersistence(projectId).listAll()).length).toBe(0);
			expect((await new ContactPersistence(projectId).listAll()).length).toBe(0);
			expect((await new EmailPersistence(projectId).listAll()).length).toBe(0);
			expect((await new EventPersistence(projectId).listAll()).length).toBe(0);
			expect((await new TemplatePersistence(projectId).listAll()).length).toBe(0);

			const memberships = await new MembershipPersistence().findAllBy({
				key: "project",
				value: projectId,
			});
			expect(memberships.length).toBe(0);
		});
	});

	describe("User Deletion", () => {
		test("should delete all memberships associated with user", async () => {
			// Get initial memberships
			const membershipPersistence = new MembershipPersistence();
			const membershipsBefore = await membershipPersistence.findAllBy({
				key: "user",
				value: userId,
			});
			expect(membershipsBefore.length).toBeGreaterThan(0);

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "USER" as const,
					id: userId,
				},
			};

			await handleDelete(task, "test-message-id");

			// Verify all user memberships were deleted
			const membershipsAfter = await membershipPersistence.findAllBy({
				key: "user",
				value: userId,
			});
			expect(membershipsAfter.length).toBe(0);
		});

		test("should delete memberships for user in multiple projects", async () => {
			// Create additional projects with memberships for the same user
			const { project: project2 } = await createTestSetup();
			const membershipPersistence = new MembershipPersistence();

			// Add user to second project
			await membershipPersistence.create({
				email: `user-${userId}@example.com`,
				user: userId,
				project: project2.id,
				role: "ADMIN",
			});

			// Verify user has memberships in multiple projects
			const membershipsBefore = await membershipPersistence.findAllBy({
				key: "user",
				value: userId,
			});
			expect(membershipsBefore.length).toBeGreaterThan(1);

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "USER" as const,
					id: userId,
				},
			};

			await handleDelete(task, "test-message-id");

			// Verify all user memberships were deleted across all projects
			const membershipsAfter = await membershipPersistence.findAllBy({
				key: "user",
				value: userId,
			});
			expect(membershipsAfter.length).toBe(0);
		});
	});

	describe("Empty Data Handling", () => {
		test("should handle project with no data gracefully", async () => {
			// Create a new empty project
			const { project: emptyProject } = await createTestSetup();

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "PROJECT" as const,
					id: emptyProject.id,
				},
			};

			// Should not throw
			await handleDelete(task, "test-message-id");

			// Verify it completed successfully
			expect((await new ActionPersistence(emptyProject.id).listAll()).length).toBe(0);
		});

		test("should handle user with no memberships gracefully", async () => {
			// Create a user without memberships
			const userPersistence = new UserPersistence();
			const userWithoutMemberships = await userPersistence.create({
				email: `nomembership-${Date.now()}@example.com`,
				password: "hashedpassword",
				enabled: true,
			});

			const task = {
				type: "batchDeleteRelated" as const,
				payload: {
					type: "USER" as const,
					id: userWithoutMemberships.id,
				},
			};

			// Should not throw
			await handleDelete(task, "test-message-id");

			// Verify no memberships exist
			const memberships = await new MembershipPersistence().findAllBy({
				key: "user",
				value: userWithoutMemberships.id,
			});
			expect(memberships.length).toBe(0);
		});
	});

	describe("Concurrent Deletions", () => {
		test("should handle multiple project deletions concurrently", async () => {
			const { project: project2 } = await createTestSetup();
			const { project: project3 } = await createTestSetup();

			// Add data to each project
			await createTestContact(projectId);
			await createTestContact(project2.id);
			await createTestContact(project3.id);

			const tasks = [
				{
					type: "batchDeleteRelated" as const,
					payload: {
						type: "PROJECT" as const,
						id: projectId,
					},
				},
				{
					type: "batchDeleteRelated" as const,
					payload: {
						type: "PROJECT" as const,
						id: project2.id,
					},
				},
				{
					type: "batchDeleteRelated" as const,
					payload: {
						type: "PROJECT" as const,
						id: project3.id,
					},
				},
			];

			// Execute deletions concurrently
			await Promise.all(tasks.map((task, i) => handleDelete(task, `test-message-${i}`)));

			// Verify all projects' data was deleted
			expect((await new ContactPersistence(projectId).listAll()).length).toBe(0);
			expect((await new ContactPersistence(project2.id).listAll()).length).toBe(0);
			expect((await new ContactPersistence(project3.id).listAll()).length).toBe(0);
		});
	});
});

