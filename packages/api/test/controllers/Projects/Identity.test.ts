import { VerificationStatus } from "@aws-sdk/client-ses";
import { ProjectPersistence } from "@sendra/lib";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vitest";
import { app } from "../../../src/app";
import * as SesService from "../../../src/services/SesService";
import { createTestSetup } from "../../utils/test-helpers";

// Mock AWS SES client
vi.mock("@aws-sdk/client-ses", async () => {
  const actual = await vi.importActual("@aws-sdk/client-ses");
  return {
    ...actual,
    SES: vi.fn(() => ({
      verifyEmailIdentity: vi.fn(),
      verifyDomainDkim: vi.fn(),
      setIdentityMailFromDomain: vi.fn(),
      getIdentityVerificationAttributes: vi.fn(),
      getIdentityDkimAttributes: vi.fn(),
    })),
  };
});

describe("Identity Endpoint Contract Tests", () => {
  let mockSes: {
    verifyEmailIdentity: ReturnType<typeof vi.fn>;
    verifyDomainDkim: ReturnType<typeof vi.fn>;
    setIdentityMailFromDomain: ReturnType<typeof vi.fn>;
    getIdentityVerificationAttributes: ReturnType<typeof vi.fn>;
    getIdentityDkimAttributes: ReturnType<typeof vi.fn>;
  };

  beforeAll(async () => {
    await startupDynamoDB();

    // Set required email config environment variables
    vi.stubEnv("APP_URL", "https://test.example.com");
    vi.stubEnv("DEFAULT_EMAIL", "no-reply@test.example.com");
    vi.stubEnv("EMAIL_CONFIGURATION_SET_NAME", "test-config-set");
    vi.stubEnv("ALLOW_DUPLICATE_PROJECT_IDENTITIES", "false");
  });

  afterAll(async () => {
    await stopDynamoDB();
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    // Reset mocks before each test
    mockSes = SesService.ses as unknown as typeof mockSes;
    vi.clearAllMocks();
  });

  describe("GET /projects/:projectId/identity", () => {
    test("should return NotStarted status when project has no identity", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        status: "NotStarted",
      });
      expect(data.identity).toBeUndefined();
    });

    test("should return identity verification status for email identity", async () => {
      const { project, token } = await createTestSetup();

      // Add identity to project
      const projectPersistence = new ProjectPersistence();
      await projectPersistence.put({
        ...project,
        identity: {
          identityType: "email",
          identity: "test@example.com",
          verified: false,
        },
      });

      mockSes.getIdentityVerificationAttributes.mockResolvedValue({
        VerificationAttributes: {
          "test@example.com": {
            VerificationStatus: VerificationStatus.Pending,
          },
        },
      });

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        identity: {
          identityType: "email",
          identity: "test@example.com",
          verified: false,
        },
        status: "Pending",
      });
    });

    test("should return identity verification status for domain identity with DKIM tokens", async () => {
      const { project, token } = await createTestSetup();

      // Add domain identity to project
      const projectPersistence = new ProjectPersistence();
      await projectPersistence.put({
        ...project,
        identity: {
          identityType: "domain",
          identity: "example.com",
          verified: false,
        },
      });

      mockSes.getIdentityDkimAttributes.mockResolvedValue({
        DkimAttributes: {
          "example.com": {
            DkimVerificationStatus: VerificationStatus.Pending,
            DkimTokens: ["token1", "token2", "token3"],
            DkimEnabled: true,
          },
        },
      });

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        identity: {
          identityType: "domain",
          identity: "example.com",
          verified: false,
        },
        status: "Pending",
        dkimTokens: ["token1", "token2", "token3"],
        dkimEnabled: true,
      });
    });

    test("should update project verification status when identity is verified", async () => {
      const { project, token } = await createTestSetup();

      // Add unverified identity to project
      const projectPersistence = new ProjectPersistence();
      await projectPersistence.put({
        ...project,
        identity: {
          identityType: "email",
          identity: "test@example.com",
          verified: false,
        },
      });

      mockSes.getIdentityVerificationAttributes.mockResolvedValue({
        VerificationAttributes: {
          "test@example.com": {
            VerificationStatus: VerificationStatus.Success,
          },
        },
      });

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe("Success");

      // Verify project was updated in database
      const updatedProject = await projectPersistence.get(project.id);
      expect(updatedProject?.identity?.verified).toBe(true);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when project not found", async () => {
      const { token } = await createTestSetup();

      const response = await app.request("/projects/nonexistent-id/identity", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should return 404 when authenticated as different user without access", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("POST /projects/:projectId/identity", () => {
    test("should verify email identity successfully", async () => {
      const { project, token } = await createTestSetup();
      const uniqueEmail = `test-${Date.now()}@unique-${Date.now()}.com`;

      mockSes.verifyEmailIdentity.mockResolvedValue({});

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "email",
          identity: uniqueEmail,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({});

      expect(mockSes.verifyEmailIdentity).toHaveBeenCalledWith({
        EmailAddress: uniqueEmail,
      });

      // Verify project was updated in database
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.get(project.id);
      expect(updatedProject?.identity).toMatchObject({
        identityType: "email",
        identity: uniqueEmail,
        verified: false,
      });
    });

    test("should verify domain identity successfully with DKIM tokens", async () => {
      const { project, token } = await createTestSetup();
      const uniqueDomain = `unique-${Date.now()}.com`;

      mockSes.verifyDomainDkim.mockResolvedValue({
        DkimTokens: ["token1", "token2", "token3"],
      });

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "domain",
          identity: uniqueDomain,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        dkimTokens: ["token1", "token2", "token3"],
      });

      expect(mockSes.verifyDomainDkim).toHaveBeenCalledWith({
        Domain: uniqueDomain,
      });

      // Verify project was updated in database
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.get(project.id);
      expect(updatedProject?.identity).toMatchObject({
        identityType: "domain",
        identity: uniqueDomain,
        verified: false,
      });
    });

    test("should verify domain identity with custom mailFromDomain", async () => {
      const { project, token } = await createTestSetup();
      const uniqueDomain = `unique-${Date.now()}.com`;
      const mailFromDomain = `bounce.${uniqueDomain}`;

      mockSes.verifyDomainDkim.mockResolvedValue({
        DkimTokens: ["token1", "token2", "token3"],
      });
      mockSes.setIdentityMailFromDomain.mockResolvedValue({});

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "domain",
          identity: uniqueDomain,
          mailFromDomain: mailFromDomain,
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        dkimTokens: ["token1", "token2", "token3"],
      });

      expect(mockSes.verifyDomainDkim).toHaveBeenCalledWith({
        Domain: uniqueDomain,
      });

      expect(mockSes.setIdentityMailFromDomain).toHaveBeenCalledWith({
        Identity: uniqueDomain,
        MailFromDomain: mailFromDomain,
      });

      // Verify project was updated in database
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.get(project.id);
      expect(updatedProject?.identity).toMatchObject({
        identityType: "domain",
        identity: uniqueDomain,
        mailFromDomain: mailFromDomain,
        verified: false,
      });
    });

    test("should return 409 when domain is already attached to another project", async () => {
      const { project, token } = await createTestSetup();
      const { project: otherProject } = await createTestSetup();

      // Add identity to other project
      const projectPersistence = new ProjectPersistence();
      await projectPersistence.put({
        ...otherProject,
        identity: {
          identityType: "domain",
          identity: "example.com",
          verified: false,
        },
      });

      // Mock email config to disallow duplicates
      vi.stubEnv("ALLOW_DUPLICATE_PROJECT_IDENTITIES", "false");

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "email",
          identity: "test@example.com",
        }),
      });

      expect(response.status).toBe(409);
    });

    test("should return 409 when email domain is already attached to another project", async () => {
      const { project, token } = await createTestSetup();
      const { project: otherProject } = await createTestSetup();

      // Add domain identity to other project
      const projectPersistence = new ProjectPersistence();
      await projectPersistence.put({
        ...otherProject,
        identity: {
          identityType: "domain",
          identity: "example.com",
          verified: false,
        },
      });

      // Mock email config to disallow duplicates
      vi.stubEnv("ALLOW_DUPLICATE_PROJECT_IDENTITIES", "false");

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "email",
          identity: "test@example.com",
        }),
      });

      expect(response.status).toBe(409);
    });

    test("should allow duplicate domains when configuration allows it", async () => {
      const { project, token } = await createTestSetup();
      const { project: otherProject } = await createTestSetup();
      const sharedDomain = `shared-${Date.now()}.com`;

      // Add identity to other project
      const projectPersistence = new ProjectPersistence();
      await projectPersistence.put({
        ...otherProject,
        identity: {
          identityType: "domain",
          identity: sharedDomain,
          verified: false,
        },
      });

      // Temporarily enable duplicate identities
      vi.stubEnv("ALLOW_DUPLICATE_PROJECT_IDENTITIES", "true");

      mockSes.verifyEmailIdentity.mockResolvedValue({});

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "email",
          identity: `test@${sharedDomain}`,
        }),
      });

      expect(response.status).toBe(200);

      // Reset back to default
      vi.stubEnv("ALLOW_DUPLICATE_PROJECT_IDENTITIES", "false");
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "email",
          identity: "test@example.com",
        }),
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when project not found", async () => {
      const { token } = await createTestSetup();

      const response = await app.request("/projects/nonexistent-id/identity", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "email",
          identity: "test@example.com",
        }),
      });

      expect(response.status).toBe(404);
    });

    test("should return 404 when authenticated as different user without admin access", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "email",
          identity: "test@example.com",
        }),
      });

      expect(response.status).toBe(404);
    });

    test("should return 400 when request body is invalid", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identityType: "invalid",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /projects/:projectId/identity", () => {
    test("should delete project identity successfully", async () => {
      const { project, token } = await createTestSetup();

      // Add identity to project
      const projectPersistence = new ProjectPersistence();
      const projectWithIdentity = await projectPersistence.put({
        ...project,
        identity: {
          identityType: "email",
          identity: "test@example.com",
          verified: true,
        },
        email: "test@example.com",
      });

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      // Verify project email was removed in database
      const updatedProject = await projectPersistence.get(project.id);
      expect(updatedProject?.email).toBeUndefined();
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "DELETE",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when project not found", async () => {
      const { token } = await createTestSetup();

      const response = await app.request("/projects/nonexistent-id/identity", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should return 404 when authenticated as different user without admin access", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /projects/:projectId/identity", () => {
    test("should update project sending information successfully", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sender Name",
          email: "sender@example.com",
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: project.id,
        name: project.name,
        from: "Sender Name",
        email: "sender@example.com",
      });

      // Verify project was updated in database
      const projectPersistence = new ProjectPersistence();
      const updatedProject = await projectPersistence.get(project.id);
      expect(updatedProject?.from).toBe("Sender Name");
      expect(updatedProject?.email).toBe("sender@example.com");
    });

    test("should update only from field", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "New Sender Name",
          email: "existing@example.com",
        }),
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.from).toBe("New Sender Name");
      expect(data.email).toBe("existing@example.com");
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sender Name",
          email: "sender@example.com",
        }),
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when project not found", async () => {
      const { token } = await createTestSetup();

      const response = await app.request("/projects/nonexistent-id/identity", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sender Name",
          email: "sender@example.com",
        }),
      });

      expect(response.status).toBe(404);
    });

    test("should return 404 when authenticated as different user without admin access", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sender Name",
          email: "sender@example.com",
        }),
      });

      expect(response.status).toBe(404);
    });

    test("should return 400 when request body is invalid", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sender Name",
          // Missing required email field
        }),
      });

      expect(response.status).toBe(400);
    });

    test("should return 400 when email format is invalid", async () => {
      const { project, token } = await createTestSetup();

      const response = await app.request(`/projects/${project.id}/identity`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Sender Name",
          email: "invalid-email",
        }),
      });

      expect(response.status).toBe(400);
    });
  });
});
