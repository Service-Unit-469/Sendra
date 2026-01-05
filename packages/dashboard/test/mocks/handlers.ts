import { http, HttpResponse } from "msw";

const API_URL = "http://localhost:4000/api/v1";

/**
 * Default MSW handlers for common API endpoints
 * These can be overridden in individual tests using server.use()
 */
export const handlers = [
	// Auth endpoints
	http.post(`${API_URL}/auth/login`, () => {
		return HttpResponse.json({
			token: "mock-jwt-token",
			user: {
				id: "user-1",
				email: "test@example.com",
			},
		});
	}),

	http.post(`${API_URL}/auth/signup`, () => {
		return HttpResponse.json({
			token: "mock-jwt-token",
			user: {
				id: "user-1",
				email: "test@example.com",
			},
		});
	}),

	http.post(`${API_URL}/auth/logout`, () => {
		return HttpResponse.json({ success: true });
	}),

	// Projects endpoints
	http.get(`${API_URL}/projects`, () => {
		return HttpResponse.json([
			{
				id: "project-1",
				name: "Test Project",
				url: "https://test.example.com",
				public: "test-public-key",
			},
		]);
	}),

	http.get(`${API_URL}/projects/:id`, ({ params }) => {
		return HttpResponse.json({
			id: params.id,
			name: "Test Project",
			url: "https://test.example.com",
			public: "test-public-key",
			eventTypes: ["user.signup", "user.login"],
		});
	}),

	// Contacts endpoints
	http.get(`${API_URL}/projects/:projectId/contacts`, () => {
		return HttpResponse.json({
			data: [
				{
					id: "contact-1",
					email: "contact1@example.com",
					subscribed: true,
					data: { firstName: "John", lastName: "Doe" },
					createdAt: new Date().toISOString(),
				},
				{
					id: "contact-2",
					email: "contact2@example.com",
					subscribed: false,
					data: { firstName: "Jane", lastName: "Smith" },
					createdAt: new Date().toISOString(),
				},
			],
			count: 2,
		});
	}),

	http.get(`${API_URL}/projects/:projectId/contacts/:contactId`, ({ params }) => {
		return HttpResponse.json({
			id: params.contactId,
			email: "contact@example.com",
			subscribed: true,
			data: { firstName: "John", lastName: "Doe" },
			createdAt: new Date().toISOString(),
		});
	}),

	http.post(`${API_URL}/projects/:projectId/contacts`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({
			id: "contact-new",
			...(body as any),
			createdAt: new Date().toISOString(),
		});
	}),

	http.put(`${API_URL}/projects/:projectId/contacts/:contactId`, async ({ request, params }) => {
		const body = await request.json();
		return HttpResponse.json({
			id: params.contactId,
			...(body as any),
			updatedAt: new Date().toISOString(),
		});
	}),

	http.delete(`${API_URL}/projects/:projectId/contacts/:contactId`, () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// Templates endpoints
	http.get(`${API_URL}/projects/:projectId/templates`, () => {
		return HttpResponse.json([
			{
				id: "template-1",
				subject: "Welcome Email",
				body: "<p>Welcome to our platform!</p>",
				templateType: "MARKETING",
				createdAt: new Date().toISOString(),
			},
		]);
	}),

	http.get(`${API_URL}/projects/:projectId/templates/:templateId`, ({ params }) => {
		return HttpResponse.json({
			id: params.templateId,
			subject: "Welcome Email",
			body: "<p>Welcome to our platform!</p>",
			templateType: "MARKETING",
			createdAt: new Date().toISOString(),
		});
	}),

	http.post(`${API_URL}/projects/:projectId/templates`, async ({ request }) => {
		const body = await request.json();
		return HttpResponse.json({
			id: "template-new",
			...(body as any),
			createdAt: new Date().toISOString(),
		});
	}),

	// Campaigns endpoints
	http.get(`${API_URL}/projects/:projectId/campaigns`, () => {
		return HttpResponse.json([
			{
				id: "campaign-1",
				subject: "Monthly Newsletter",
				status: "DRAFT",
				createdAt: new Date().toISOString(),
			},
		]);
	}),

	http.get(`${API_URL}/projects/:projectId/campaigns/:campaignId`, ({ params }) => {
		return HttpResponse.json({
			id: params.campaignId,
			subject: "Monthly Newsletter",
			status: "DRAFT",
			body: "<p>Newsletter content</p>",
			createdAt: new Date().toISOString(),
		});
	}),

	// Events endpoints
	http.get(`${API_URL}/projects/:projectId/events`, () => {
		return HttpResponse.json({
			data: [
				{
					id: "event-1",
					eventType: "user.signup",
					contact: "contact-1",
					createdAt: new Date().toISOString(),
				},
			],
			count: 1,
		});
	}),

	// Groups endpoints
	http.get(`${API_URL}/projects/:projectId/groups`, () => {
		return HttpResponse.json([
			{
				id: "group-1",
				name: "Newsletter Subscribers",
				filter: {},
				createdAt: new Date().toISOString(),
			},
		]);
	}),

	// Actions endpoints
	http.get(`${API_URL}/projects/:projectId/actions`, () => {
		return HttpResponse.json([
			{
				id: "action-1",
				name: "Welcome Email",
				trigger: "user.signup",
				enabled: true,
				createdAt: new Date().toISOString(),
			},
		]);
	}),

	// Analytics endpoints
	http.get(`${API_URL}/projects/:projectId/analytics`, () => {
		return HttpResponse.json({
			sent: 1000,
			delivered: 950,
			opened: 500,
			clicked: 250,
			bounced: 20,
			complained: 5,
		});
	}),

	// Users endpoints
	http.get(`${API_URL}/users/me`, () => {
		return HttpResponse.json({
			id: "user-1",
			email: "test@example.com",
			enabled: true,
		});
	}),

	// Memberships endpoints
	http.get(`${API_URL}/projects/:projectId/memberships`, () => {
		return HttpResponse.json([
			{
				id: "membership-1",
				user: "user-1",
				email: "test@example.com",
				role: "ADMIN",
			},
		]);
	}),
];

