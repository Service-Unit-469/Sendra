import {
	ActionPersistence,
	CampaignPersistence,
	ContactPersistence,
	EmailPersistence,
	MembershipPersistence,
	ProjectPersistence,
	TemplatePersistence,
	UserPersistence,
} from "@sendra/lib";

/**
 * Creates a complete test setup with user, project, and membership
 * @returns Object containing user, project
 */
export const createTestSetup = async () => {
	const userPersistence = new UserPersistence();
	const user = await userPersistence.create({
		email: `testuser-${Date.now()}@example.com`,
		password: "hashedpassword",
		enabled: true,
	});

	const projectPersistence = new ProjectPersistence();
	const project = await projectPersistence.create({
		name: `Test Project ${Date.now()}`,
		url: `https://test-${Date.now()}.example.com`,
		public: `test-public-${Date.now()}`,
		secret: `test-secret-${Date.now()}`,
		eventTypes: ["user.signup"],
	});

	const membershipPersistence = new MembershipPersistence();
	await membershipPersistence.create({
		email: user.email,
		user: user.id,
		project: project.id,
		role: "ADMIN",
	});

	return { user, project };
};

/**
 * Creates a test template for a project
 * @param projectId - The ID of the project to create the template for
 * @returns The created template
 */
export const createTestTemplate = async (projectId: string) => {
	const templatePersistence = new TemplatePersistence(projectId);
	return await templatePersistence.create({
		project: projectId,
		subject: "Test Email Subject",
		body: "<p>Test email body content</p>",
		templateType: "MARKETING",
	});
};

/**
 * Creates a test contact for a project
 * @param projectId - The ID of the project
 * @param email - Optional custom email address, defaults to auto-generated one
 * @returns The created contact
 */
export const createTestContact = async (projectId: string, email?: string) => {
	const contactPersistence = new ContactPersistence(projectId);
	return await contactPersistence.create({
		project: projectId,
		email: email || `contact-${Date.now()}@example.com`,
		subscribed: true,
		data: {},
	});
};

/**
 * Creates a test action for a project
 * @param projectId - The ID of the project
 * @param templateId - The ID of the template to use
 * @returns The created action
 */
export const createTestAction = async (projectId: string, templateId: string) => {
	const actionPersistence = new ActionPersistence(projectId);
	return await actionPersistence.create({
		project: projectId,
		name: `Test Action ${Date.now()}`,
		template: templateId,
		events: ["user.signup"],
		notevents: [],
		delay: 0,
		runOnce: false,
	});
};

/**
 * Creates a test campaign for a project
 * @param projectId - The ID of the project
 * @returns The created campaign
 */
export const createTestCampaign = async (projectId: string) => {
	const campaignPersistence = new CampaignPersistence(projectId);
	return await campaignPersistence.create({
		project: projectId,
		name: `Test Campaign ${Date.now()}`,
		subject: "Test Campaign Subject",
		body: "<p>Test campaign body</p>",
		recipients: [],
		status: "DRAFT",
	});
};

/**
 * Creates a test email record for a project
 * @param projectId - The ID of the project
 * @param contactId - The ID of the contact
 * @param messageId - The SES message ID
 * @returns The created email
 */
export const createTestEmail = async (projectId: string, contactId: string, messageId: string) => {
	const emailPersistence = new EmailPersistence(projectId);
	return await emailPersistence.create({
		project: projectId,
		contact: contactId,
		messageId,
		subject: "Test Email",
		body: "<p>Test body</p>",
		email: "test@example.com",
		status: "SENT",
		sendType: "MARKETING",
		sourceType: "ACTION",
		source: "test-action-id",
	});
};

