import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Action, Contact, EventType, Project, Template } from "@sendra/shared";
import { ActionsService } from "../../src/services/ActionsService";
import { ActionPersistence, EventPersistence, TemplatePersistence } from "../../src/persistence";
import { TaskQueue } from "../../src/services/TaskQueue";

// Mock the persistence modules
vi.mock("../../src/persistence", () => ({
	ActionPersistence: vi.fn(),
	EventPersistence: vi.fn(),
	TemplatePersistence: vi.fn(),
}));

// Mock TaskQueue
vi.mock("../../src/services/TaskQueue", () => ({
	TaskQueue: {
		addTask: vi.fn(),
	},
}));

describe("ActionsService", () => {
	const mockProject: Project = {
		id: "project-123",
		name: "Test Project",
		public: "public-key-123",
		secret: "secret-key-123",
		url: "https://example.com",
		createdAt: "1000",
		updatedAt: "1000",
	};

	const mockContact: Contact = {
		id: "contact-123",
		project: "project-123",
		email: "test@example.com",
		subscribed: true,
		data: {},
		createdAt: "1000",
		updatedAt: "1000",
	};

	const mockEventType: EventType = {
		id: "event-type-123",
		project: "project-123",
		name: "User Signed Up",
		createdAt: "1000",
		updatedAt: "1000",
	};

	const mockAction: Action = {
		id: "action-123",
		project: "project-123",
		name: "Welcome Email",
		events: ["event-type-123"],
		notevents: [],
		template: "template-123",
		runOnce: false,
		delay: 0,
		createdAt: "1000",
		updatedAt: "1000",
	};

	const mockTemplate: Template = {
		id: "template-123",
		project: "project-123",
		subject: "Welcome!",
		body: "<mjml><mj-body><mj-text>Welcome {{contact.email}}</mj-text></mj-body></mjml>",
		templateType: "TRANSACTIONAL",
		from: "Test Sender <sender@example.com>",
		createdAt: "1000",
		updatedAt: "1000",
	};

	let mockActionPersistence: any;
	let mockEventPersistence: any;
	let mockTemplatePersistence: any;

	beforeEach(() => {
		vi.clearAllMocks();

		// Setup mock persistence instances
		mockActionPersistence = {
			listAll: vi.fn().mockResolvedValue([]),
		};

		mockEventPersistence = {
			findAllBy: vi.fn().mockResolvedValue([]),
			create: vi.fn().mockResolvedValue({}),
		};

		mockTemplatePersistence = {
			get: vi.fn().mockResolvedValue(null),
		};

		vi.mocked(ActionPersistence).mockImplementation(() => mockActionPersistence);
		vi.mocked(EventPersistence).mockImplementation(() => mockEventPersistence);
		vi.mocked(TemplatePersistence).mockImplementation(() => mockTemplatePersistence);
	});

	describe("trigger", () => {
		it("should not trigger any actions when no actions exist", async () => {
			mockActionPersistence.listAll.mockResolvedValue([]);

			await ActionsService.trigger({
				eventType: mockEventType,
				contact: mockContact,
				project: mockProject,
			});

			expect(mockActionPersistence.listAll).toHaveBeenCalled();
			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});

		it("should not trigger actions that don't match the event type", async () => {
			const unmatchedAction = {
				...mockAction,
				events: ["different-event-type"],
			};
			mockActionPersistence.listAll.mockResolvedValue([unmatchedAction]);

			await ActionsService.trigger({
				eventType: mockEventType,
				contact: mockContact,
				project: mockProject,
			});

			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});

	it("should trigger action when event type matches", async () => {
		mockActionPersistence.listAll.mockResolvedValue([mockAction]);
		mockTemplatePersistence.get.mockResolvedValue(mockTemplate);

		// Mock that the contact has triggered the required event
		mockEventPersistence.findAllBy.mockResolvedValue([
			{
				id: "event-123",
				eventType: mockEventType.id,
				contact: mockContact.id,
				createdAt: 900,
				updatedAt: 900,
			},
		]);

		await ActionsService.trigger({
			eventType: mockEventType,
			contact: mockContact,
			project: mockProject,
		});

		expect(mockEventPersistence.create).toHaveBeenCalledWith({
			action: mockAction.id,
			contact: mockContact.id,
			eventType: mockEventType.id,
			project: mockProject.id,
		});

		expect(TaskQueue.addTask).toHaveBeenCalledWith({
			type: "sendEmail",
			delaySeconds: 0,
			payload: {
				action: mockAction.id,
				contact: mockContact.id,
				project: mockProject.id,
			},
		});
	});

	it("should apply delay when action has delay configured", async () => {
		const delayedAction = {
			...mockAction,
			delay: 30, // 30 minutes
		};
		mockActionPersistence.listAll.mockResolvedValue([delayedAction]);
		mockTemplatePersistence.get.mockResolvedValue(mockTemplate);

		// Mock that the contact has triggered the required event
		mockEventPersistence.findAllBy.mockResolvedValue([
			{
				id: "event-123",
				eventType: mockEventType.id,
				contact: mockContact.id,
				createdAt: 900,
				updatedAt: 900,
			},
		]);

		await ActionsService.trigger({
			eventType: mockEventType,
			contact: mockContact,
			project: mockProject,
		});

		expect(TaskQueue.addTask).toHaveBeenCalledWith({
			type: "sendEmail",
			delaySeconds: 1800, // 30 * 60
			payload: {
				action: delayedAction.id,
				contact: mockContact.id,
				project: mockProject.id,
			},
		});
	});

		it("should not trigger runOnce action if it has already been triggered", async () => {
			const runOnceAction = {
				...mockAction,
				runOnce: true,
			};
			mockActionPersistence.listAll.mockResolvedValue([runOnceAction]);

			// Mock that the action has already been triggered
			mockEventPersistence.findAllBy.mockResolvedValue([
				{
					id: "event-123",
					relation: runOnceAction.id,
					eventType: mockEventType.id,
					contact: mockContact.id,
					createdAt: 900,
					updatedAt: 900,
				},
			]);

			await ActionsService.trigger({
				eventType: mockEventType,
				contact: mockContact,
				project: mockProject,
			});

			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});

	it("should trigger runOnce action if it has not been triggered before", async () => {
		const runOnceAction = {
			...mockAction,
			runOnce: true,
		};
		mockActionPersistence.listAll.mockResolvedValue([runOnceAction]);
		mockTemplatePersistence.get.mockResolvedValue(mockTemplate);

		// Contact has triggered the required event but not the action itself
		mockEventPersistence.findAllBy.mockResolvedValue([
			{
				id: "event-123",
				eventType: mockEventType.id,
				contact: mockContact.id,
				createdAt: 900,
				updatedAt: 900,
			},
		]);

		await ActionsService.trigger({
			eventType: mockEventType,
			contact: mockContact,
			project: mockProject,
		});

		expect(TaskQueue.addTask).toHaveBeenCalled();
	});

		it("should not trigger action when contact has a notevents condition", async () => {
			const actionWithNotEvents = {
				...mockAction,
				notevents: ["blocked-event-type"],
			};
			mockActionPersistence.listAll.mockResolvedValue([actionWithNotEvents]);

			// Contact has triggered the blocked event
			mockEventPersistence.findAllBy.mockResolvedValue([
				{
					id: "event-123",
					eventType: "blocked-event-type",
					contact: mockContact.id,
					createdAt: 900,
					updatedAt: 900,
				},
			]);

			await ActionsService.trigger({
				eventType: mockEventType,
				contact: mockContact,
				project: mockProject,
			});

			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});

		it("should trigger action when contact has no blocked events", async () => {
			const actionWithNotEvents = {
				...mockAction,
				notevents: ["blocked-event-type"],
			};
			mockActionPersistence.listAll.mockResolvedValue([actionWithNotEvents]);
			mockTemplatePersistence.get.mockResolvedValue(mockTemplate);

			// Contact has no blocked events
			mockEventPersistence.findAllBy.mockResolvedValue([
				{
					id: "event-123",
					eventType: mockEventType.id,
					contact: mockContact.id,
					createdAt: 900,
					updatedAt: 900,
				},
			]);

			await ActionsService.trigger({
				eventType: mockEventType,
				contact: mockContact,
				project: mockProject,
			});

			expect(TaskQueue.addTask).toHaveBeenCalled();
		});

		it("should not trigger action when template is not found", async () => {
			mockActionPersistence.listAll.mockResolvedValue([mockAction]);
			mockTemplatePersistence.get.mockResolvedValue(null);

			await ActionsService.trigger({
				eventType: mockEventType,
				contact: mockContact,
				project: mockProject,
			});

			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});

		it("should not send marketing emails to unsubscribed contacts", async () => {
			const marketingTemplate = {
				...mockTemplate,
				templateType: "MARKETING",
			};
			const unsubscribedContact = {
				...mockContact,
				subscribed: false,
			};

			mockActionPersistence.listAll.mockResolvedValue([mockAction]);
			mockTemplatePersistence.get.mockResolvedValue(marketingTemplate);

			await ActionsService.trigger({
				eventType: mockEventType,
				contact: unsubscribedContact,
				project: mockProject,
			});

			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});

	it("should send transactional emails to unsubscribed contacts", async () => {
		const unsubscribedContact = {
			...mockContact,
			subscribed: false,
		};

		mockActionPersistence.listAll.mockResolvedValue([mockAction]);
		mockTemplatePersistence.get.mockResolvedValue(mockTemplate); // TRANSACTIONAL

		// Mock that the contact has triggered the required event
		mockEventPersistence.findAllBy.mockResolvedValue([
			{
				id: "event-123",
				eventType: mockEventType.id,
				contact: unsubscribedContact.id,
				createdAt: 900,
				updatedAt: 900,
			},
		]);

		await ActionsService.trigger({
			eventType: mockEventType,
			contact: unsubscribedContact,
			project: mockProject,
		});

		expect(TaskQueue.addTask).toHaveBeenCalled();
	});

		it("should handle actions requiring multiple events", async () => {
			const multiEventAction = {
				...mockAction,
				events: ["event-type-123", "event-type-456"],
			};
			mockActionPersistence.listAll.mockResolvedValue([multiEventAction]);
			mockTemplatePersistence.get.mockResolvedValue(mockTemplate);

			// Contact has only triggered one event
			mockEventPersistence.findAllBy.mockResolvedValue([
				{
					id: "event-123",
					eventType: "event-type-123",
					contact: mockContact.id,
					createdAt: 900,
					updatedAt: 900,
				},
			]);

			await ActionsService.trigger({
				eventType: mockEventType,
				contact: mockContact,
				project: mockProject,
			});

			// Should not trigger because not all required events have been triggered
			expect(TaskQueue.addTask).not.toHaveBeenCalled();
		});

	it("should trigger action when all required events have been triggered", async () => {
		const multiEventEventType: EventType = {
			...mockEventType,
			id: "event-type-456",
		};

		const multiEventAction = {
			...mockAction,
			events: ["event-type-123", "event-type-456"],
		};
		mockActionPersistence.listAll.mockResolvedValue([multiEventAction]);
		mockTemplatePersistence.get.mockResolvedValue(mockTemplate);

		// Contact has triggered both required events
		mockEventPersistence.findAllBy.mockResolvedValue([
			{
				id: "event-123",
				eventType: "event-type-123",
				contact: mockContact.id,
				createdAt: 900,
				updatedAt: 900,
			},
			{
				id: "event-456",
				eventType: "event-type-456",
				contact: mockContact.id,
				createdAt: 950,
				updatedAt: 950,
			},
		]);

		await ActionsService.trigger({
			eventType: multiEventEventType,
			contact: mockContact,
			project: mockProject,
		});

		// Should trigger because all required events have been triggered
		expect(TaskQueue.addTask).toHaveBeenCalledWith({
			type: "sendEmail",
			delaySeconds: 0,
			payload: {
				action: multiEventAction.id,
				contact: mockContact.id,
				project: mockProject.id,
			},
		});
	});
	});
});

