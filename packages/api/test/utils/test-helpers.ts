import {
  ContactPersistence,
  EventPersistence,
  MembershipPersistence,
  ProjectPersistence,
  TemplatePersistence,
  UserPersistence,
} from "@sendra/lib";
import { AuthService } from "../../src/services/AuthService";

/**
 * Creates a complete test setup with user, project, and membership
 * @returns Object containing user, project, and authentication token
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
    eventTypes: ["user.signup", "user.login"],
  });

  const membershipPersistence = new MembershipPersistence();
  await membershipPersistence.create({
    email: user.email,
    user: user.id,
    project: project.id,
    role: "ADMIN",
  });

  const token = AuthService.createUserToken(user.id, user.email);

  return { user, project, token };
};

/**
 * Creates a test template for a project with {{body}} token
 * @param projectId - The ID of the project to create the template for
 * @returns The created template
 */
export const createTestTemplate = async (projectId: string) => {
  const templatePersistence = new TemplatePersistence(projectId);
  const editorJsData = JSON.stringify({
    time: Date.now(),
    blocks: [
      {
        id: "test-block",
        type: "paragraph",
        data: {
          text: "Header {{body}} Footer",
        },
      },
    ],
    version: "2.28.0",
  });
  return await templatePersistence.create({
    project: projectId,
    subject: "Test Email Subject",
    body: {
      data: editorJsData,
      html: "<p>Header</p>{{body}}<p>Footer</p>",
      plainText: "Header {{body}} Footer",
    },
    templateType: "MARKETING",
  });
};

/**
 * Creates a test event for a project and contact
 * @param projectId - The ID of the project
 * @param contactId - The ID of the contact
 * @returns The created event
 */
export const createTestEvent = async (projectId: string, contactId: string) => {
  const eventPersistence = new EventPersistence(projectId);
  return await eventPersistence.create({
    project: projectId,
    eventType: "user.signup",
    contact: contactId,
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

