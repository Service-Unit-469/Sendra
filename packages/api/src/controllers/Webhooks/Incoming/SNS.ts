// import { createRoute, z } from "@hono/zod-openapi";
// import {
// 	ActionPersistence,
// 	CampaignPersistence,
// 	type Contact,
// 	ContactPersistence,
// 	type Email,
// 	EmailPersistence,
// 	EventPersistence,
// 	type Project,
// 	ProjectPersistence,
// 	TriggerPersistence,
// } from "@sendra/shared";
// import signale from "signale";
// import type { AppType } from "../../../app";
// import { ActionsService } from "../../../services/ActionsService";

// const eventMap = {
// 	Bounce: "BOUNCED",
// 	Delivery: "DELIVERED",
// 	Open: "OPENED",
// 	Complaint: "COMPLAINT",
// 	Click: "CLICKED",
// } as const;

// async function handleClick(
// 	project: Project,
// 	contact: Contact,
// 	email: Email,
// 	body: any,
// 	eventPersistence: EventPersistence,
// 	triggerPersistence: TriggerPersistence,
// ) {
// 	signale.success(`Click received for ${contact.email} from ${project.name}`);

// 	let event = await eventPersistence.getByName(`email_${body.eventType}`);
// 	if (!event) {
// 		event = await eventPersistence.create({
// 			name: `email_${body.eventType}`,
// 			project: project.id,
// 		});
// 	}

// 	await triggerPersistence.create({
// 		contact: contact.id,
// 		event: event.id,
// 		action: email.action,
// 		email: email.id,
// 		project: project.id,
// 		data: {
// 			email: email.id,
// 			link: body.click.link,
// 		},
// 	});
// }

// export const registerSNSWebhookRoutes = (app: AppType) => {
// 	app.openapi(
// 		createRoute({
// 			method: "post",
// 			path: "/webhooks/incoming/sns",
// 			request: {
// 				body: {
// 					content: {
// 						"application/json": {
// 							schema: z.object({
// 								messageId: z.string(),
// 							}),
// 						},
// 					},
// 				},
// 			},
// 			responses: {
// 				200: {
// 					content: {
// 						"application/json": {
// 							schema: z.any(),
// 						},
// 					},
// 					description: "Receive SNS webhook",
// 				},
// 			},
// 		}),
// 		async (c) => {
// 			try {
// 				const parsed = await c.req.parseBody();
// 				const body = JSON.parse(parsed.Message as string);

// 				// Find email by messageId in DynamoDB
// 				const emailPersistence = new EmailPersistence();
// 				const email = await emailPersistence.getByMessageId(body.mail.messageId);

// 				if (!email) {
// 					return c.json({});
// 				}

// 				const projectId = email.project;
// 				const actionPersistence = new ActionPersistence(projectId);
// 				const contactPersistence = new ContactPersistence(projectId);
// 				// Get related entities
// 				const [contact, action, campaign, project] = await Promise.all([
// 					contactPersistence.get(email.contact),
// 					email.action ? actionPersistence.get(email.action) : null,
// 					email.campaign ? new CampaignPersistence(projectId).get(email.campaign) : null,
// 					email.project ? new ProjectPersistence().get(email.project) : null,
// 				]);

// 				if (!contact) {
// 					return c.json({});
// 				}

// 				if (!project) {
// 					return c.json({ success: false });
// 				}

// 				const eventPersistence = new EventPersistence(projectId);
// 				const triggerPersistence = new TriggerPersistence(projectId);

// 				// The email was a transactional email
// 				if (email.sendType === "TRANSACTIONAL") {
// 					if (body.eventType === "Click") {
// 						await handleClick(project, contact, email, body, eventPersistence, triggerPersistence);
// 						return c.json({ success: true });
// 					}

// 					if (body.eventType === "Complaint") {
// 						signale.warn(`Complaint received for ${contact.email} from ${project.name}`);
// 					}

// 					if (body.eventType === "Bounce") {
// 						signale.warn(`Bounce received for ${contact.email} from ${project.name}`);
// 					}

// 					// Update email status in DynamoDB
// 					const updatedEmail = {
// 						...email,
// 						status: eventMap[body.eventType as "Bounce" | "Delivery" | "Open" | "Complaint"],
// 					};
// 					await emailPersistence.put(updatedEmail);

// 					return c.json({ success: true });
// 				}

// 				if (body.eventType === "Complaint" || body.eventType === "Bounce") {
// 					signale.warn(`${body.eventType} received for ${contact.email} from ${project.name}`);

// 					// Update email status in DynamoDB
// 					const updatedEmail = {
// 						...email,
// 						status: eventMap[body.eventType as "Bounce" | "Complaint"],
// 					};
// 					await emailPersistence.put(updatedEmail);

// 					// Update contact subscription status in DynamoDB
// 					const updatedContact = {
// 						...contact,
// 						subscribed: false,
// 					};
// 					await contactPersistence.put(updatedContact);

// 					return c.json({ success: true });
// 				}

// 				if (body.eventType === "Click") {
// 					await handleClick(project, contact, email, body, eventPersistence, triggerPersistence);
// 					return c.json({ success: true });
// 				}

// 				let event: any = undefined;
// 				if (action) {
// 					// Get template events for action
// 					const templateEvents = await eventPersistence.findAllBy({
// 						partitionKey: "template",
// 						partionValue: action.template,
// 					});
// 					event = templateEvents.find((e) =>
// 						e.name.includes(
// 							(body.eventType as "Bounce" | "Delivery" | "Open" | "Complaint" | "Click") === "Delivery"
// 								? "delivered"
// 								: "opened",
// 						),
// 					);
// 				}

// 				if (campaign) {
// 					// Get campaign events
// 					const campaignEvents = await eventPersistence.findAllBy({
// 						partitionKey: "campaign",
// 						partionValue: campaign.id,
// 					});
// 					event = campaignEvents.find((e: any) =>
// 						e.name.includes(
// 							(body.eventType as "Bounce" | "Delivery" | "Open" | "Complaint" | "Click") === "Delivery"
// 								? "delivered"
// 								: "opened",
// 						),
// 					);
// 				}

// 				if (!event) {
// 					return c.json({ success: false });
// 				}

// 				switch (body.eventType as "Delivery" | "Open") {
// 					case "Delivery": {
// 						signale.success(`Delivery received for ${contact.email} from ${project.name}`);
// 						// Update email status in DynamoDB
// 						const deliveredEmail = {
// 							...email,
// 							status: "DELIVERED",
// 						} as const;
// 						await emailPersistence.put(deliveredEmail);
// 						await triggerPersistence.create({
// 							contact: contact.id,
// 							event: event.id,
// 							project: project.id,
// 						});

// 						break;
// 					}
// 					case "Open":
// 						signale.success(`Open received for ${contact.email} from ${project.name}`);
// 						// Update email status
// 						await emailPersistence.put({
// 							...email,
// 							status: "OPENED",
// 						} as const);

// 						// Create trigger
// 						await triggerPersistence.create({
// 							contact: contact.id,
// 							event: event.id,
// 							project: project.id,
// 						});

// 						break;
// 				}

// 				if (email.action) {
// 					await ActionsService.trigger({ event, contact, project });
// 				}
// 			} catch (e) {
// 				const body = await c.req.parseBody();
// 				if (body.SubscribeURL) {
// 					signale.info("--------------");
// 					signale.info("SNS Topic Confirmation URL:");
// 					signale.info(body.SubscribeURL);
// 					signale.info("--------------");
// 				} else {
// 					signale.error(e);
// 				}
// 			}

// 			return c.json({ success: true });
// 		},
// 	);
// };
