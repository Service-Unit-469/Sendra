import type { Contact, Project } from "@sendra/shared";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ContactPersistence } from "../../src/persistence/ContactPersistence";
import { EventPersistence } from "../../src/persistence/EventPersistence";
import { ProjectPersistence } from "../../src/persistence/ProjectPersistence";
import { ContactService } from "../../src/services/ContactService";

describe("ContactService", () => {
	let contactPersistence: ContactPersistence;
	let eventPersistence: EventPersistence;
	let projectPersistence: ProjectPersistence;
	let testProject: Project;

	beforeAll(async () => {
		await startupDynamoDB();
	});

	afterAll(async () => {
		await stopDynamoDB();
	});

	beforeEach(async () => {
		projectPersistence = new ProjectPersistence();

		// Create test project
		testProject = await projectPersistence.create({
			name: "Test Project",
			secret: "test-secret",
			public: "test-public",
			url: "https://test-project.example.com",
			eventTypes: [],
		});

		// Initialize persistence instances with the created project ID
		contactPersistence = new ContactPersistence(testProject.id);
		eventPersistence = new EventPersistence(testProject.id);
	});

	describe("updateContact", () => {
		it("should create subscribe event when changing from false to true", async () => {
			// Create a contact with subscribed = false
			const contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-subscribe@example.com",
				data: {},
				subscribed: false,
			});

			// Update contact to subscribed = true
			const updatedContact = await ContactService.updateContact({
				oldContact: contact,
				newContact: { ...contact, subscribed: true },
				contactPersistence,
			});

			expect(updatedContact.subscribed).toBe(true);

			// Check that subscribe event was created
			const events = await eventPersistence.findBy({
				key: "contact",
				value: contact.id,
			});

		expect(events.items).toHaveLength(1);
		expect(events.items[0].eventType).toBe("subscribe");
		expect(events.items[0].contact).toBe(contact.id);
		expect(events.items[0].project).toBe(testProject.id);

		// OOTB events should NOT be added to project.eventTypes
		const updatedProject = await projectPersistence.get(testProject.id);
		expect(updatedProject?.eventTypes).not.toContain("subscribe");
		});

		it("should create unsubscribe event when changing from true to false", async () => {
			// Create a contact with subscribed = true
			const contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-unsubscribe@example.com",
				data: {},
				subscribed: true,
			});

			// Update contact to subscribed = false
			const updatedContact = await ContactService.updateContact({
				oldContact: contact,
				newContact: { ...contact, subscribed: false },
				contactPersistence,
			});

			expect(updatedContact.subscribed).toBe(false);

			// Check that unsubscribe event was created
			const events = await eventPersistence.findBy({
				key: "contact",
				value: contact.id,
			});

		expect(events.items).toHaveLength(1);
		expect(events.items[0].eventType).toBe("unsubscribe");
		expect(events.items[0].contact).toBe(contact.id);
		expect(events.items[0].project).toBe(testProject.id);

		// OOTB events should NOT be added to project.eventTypes
		const updatedProject = await projectPersistence.get(testProject.id);
		expect(updatedProject?.eventTypes).not.toContain("unsubscribe");
		});

		it("should not create event when subscription status does not change", async () => {
			// Create a contact with subscribed = true
			const contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-no-change@example.com",
				data: {},
				subscribed: true,
			});

			// Update contact with same subscription status
			await ContactService.updateContact({
				oldContact: contact,
				newContact: { ...contact, data: { updated: true } },
				contactPersistence,
			});

			// Check that no events were created
			const events = await eventPersistence.findBy({
				key: "contact",
				value: contact.id,
			});

			expect(events.items).toHaveLength(0);
		});

		it("should not create event when only updating other fields", async () => {
			// Create a contact
			const contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-other-fields@example.com",
				data: { firstName: "John" },
				subscribed: true,
			});

			// Update contact data but not subscription
			await ContactService.updateContact({
				oldContact: contact,
				newContact: {
					...contact,
					data: { firstName: "Jane", lastName: "Doe" },
				},
				contactPersistence,
			});

			// Check that no events were created
			const events = await eventPersistence.findBy({
				key: "contact",
				value: contact.id,
			});

			expect(events.items).toHaveLength(0);
		});

		it("should handle undefined to true transition", async () => {
			// Create a contact with undefined subscribed
			const contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-undefined-true@example.com",
				data: {},
			});

			expect(contact.subscribed).toBeUndefined();

			// Update to subscribed = true
			const updatedContact = await ContactService.updateContact({
				oldContact: contact,
				newContact: { ...contact, subscribed: true },
				contactPersistence,
			});

			expect(updatedContact.subscribed).toBe(true);

			// Check that subscribe event was created
			const events = await eventPersistence.findBy({
				key: "contact",
				value: contact.id,
			});

			expect(events.items).toHaveLength(1);
			expect(events.items[0].eventType).toBe("subscribe");
		});

		it("should handle undefined to false transition", async () => {
			// Create a contact with undefined subscribed
			const contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-undefined-false@example.com",
				data: {},
			});

			expect(contact.subscribed).toBeUndefined();

			// Update to subscribed = false
			const updatedContact = await ContactService.updateContact({
				oldContact: contact,
				newContact: { ...contact, subscribed: false },
				contactPersistence,
			});

			expect(updatedContact.subscribed).toBe(false);

			// Check that unsubscribe event was created
			const events = await eventPersistence.findBy({
				key: "contact",
				value: contact.id,
			});

			expect(events.items).toHaveLength(1);
			expect(events.items[0].eventType).toBe("unsubscribe");
		});

		it("should not create event when changing to undefined", async () => {
			// Create a contact with subscribed = true
			const contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-to-undefined@example.com",
				data: {},
				subscribed: true,
			});

			// Update to undefined (edge case)
			await ContactService.updateContact({
				oldContact: contact,
				newContact: { ...contact, subscribed: undefined },
				contactPersistence,
			});

			// Check that no events were created
			const events = await eventPersistence.findBy({
				key: "contact",
				value: contact.id,
			});

			expect(events.items).toHaveLength(0);
		});

		it("should not duplicate event type in project if it already exists", async () => {
			// Add subscribe event type to project
			testProject.eventTypes.push("subscribe");
			await projectPersistence.put(testProject);

			// Create a contact
			const contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-no-duplicate@example.com",
				data: {},
				subscribed: false,
			});

			// Update to subscribed = true
			await ContactService.updateContact({
				oldContact: contact,
				newContact: { ...contact, subscribed: true },
				contactPersistence,
			});

			// Check that event type wasn't duplicated
			const updatedProject = await projectPersistence.get(testProject.id);
			const subscribeCount = updatedProject?.eventTypes.filter(
				(t) => t === "subscribe",
			).length;
			expect(subscribeCount).toBe(1);
		});

		it("should create multiple events for multiple subscription changes", async () => {
			// Create a contact
			let contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-multiple@example.com",
				data: {},
				subscribed: true,
			});

			// Unsubscribe
			contact = await ContactService.updateContact({
				oldContact: contact,
				newContact: { ...contact, subscribed: false },
				contactPersistence,
			});

			// Subscribe again
			contact = await ContactService.updateContact({
				oldContact: contact,
				newContact: { ...contact, subscribed: true },
				contactPersistence,
			});

			// Check that both events were created
			const events = await eventPersistence.findBy({
				key: "contact",
				value: contact.id,
			});

		expect(events.items).toHaveLength(2);
		expect(events.items.map((e) => e.eventType).sort()).toEqual([
			"subscribe",
			"unsubscribe",
		]);

		// OOTB events should NOT be added to project.eventTypes
		const updatedProject = await projectPersistence.get(testProject.id);
		expect(updatedProject?.eventTypes).not.toContain("subscribe");
		expect(updatedProject?.eventTypes).not.toContain("unsubscribe");
		});

		it("should handle contact with all fields updated including subscription", async () => {
			// Create a contact
			const contact = await contactPersistence.create({
				project: testProject.id,
				email: "test-all-fields@example.com",
				data: { firstName: "John" },
				subscribed: false,
			});

			// Update all fields
			const updatedContact = await ContactService.updateContact({
				oldContact: contact,
				newContact: {
					...contact,
					data: { firstName: "Jane", lastName: "Doe" },
					subscribed: true,
				},
				contactPersistence,
			});

			expect(updatedContact.subscribed).toBe(true);
			expect(updatedContact.data.firstName).toBe("Jane");
			expect(updatedContact.data.lastName).toBe("Doe");

			// Check that subscribe event was created
			const events = await eventPersistence.findBy({
				key: "contact",
				value: contact.id,
			});

			expect(events.items).toHaveLength(1);
			expect(events.items[0].eventType).toBe("subscribe");
		});
	});
});

