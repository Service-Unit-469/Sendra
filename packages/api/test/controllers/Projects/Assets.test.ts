import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { startupDynamoDB, stopDynamoDB } from "@sendra/test";
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { app } from "../../../src/app";
import { AuthService } from "../../../src/services/AuthService";
import { createTestSetup } from "../../utils/test-helpers";

// Mock AWS SDK - must be before app import
vi.mock("@aws-sdk/client-s3", async () => {
  const actual = await vi.importActual("@aws-sdk/client-s3");
  const mockSend = vi.fn();
  return {
    ...actual,
    S3Client: vi.fn(function () {
      return {
        send: mockSend,
      };
    }),
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    HeadObjectCommand: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    __mockSend: mockSend,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// AppConfig reads from process.env which is already set in test/setup.ts
// No need to mock it since vi.stubEnv sets the environment variables

describe("Assets Endpoint Contract Tests", () => {
  let mockSend: ReturnType<typeof vi.fn>;
  const mockGetSignedUrl = vi.mocked(getSignedUrl);

  beforeAll(async () => {
    await startupDynamoDB();
    
    // Get the mock send function
    const s3Module = await import("@aws-sdk/client-s3");
    mockSend = (s3Module as any).__mockSend;
  });

  afterAll(async () => {
    await stopDynamoDB();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSignedUrl.mockResolvedValue("https://test-bucket.s3.amazonaws.com/presigned-url");
  });

  describe("GET /projects/{projectId}/assets", () => {
    test("should return empty list when no assets exist", async () => {
      const { project, token } = await createTestSetup();

      // Mock empty list response
      mockSend.mockResolvedValueOnce({
        Contents: [],
        IsTruncated: false,
      });

      const response = await app.request(`/api/v1/projects/${project.id}/assets`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(0);
    });

    test("should return list of assets", async () => {
      const { project, token } = await createTestSetup();

      const now = new Date();
      // Mock list response with assets, then HeadObjectCommand for each asset
      mockSend
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: `${project.id}/asset1.png`,
              Size: 1024,
              LastModified: now,
            },
            {
              Key: `${project.id}/asset2.jpg`,
              Size: 2048,
              LastModified: now,
            },
          ],
          IsTruncated: false,
        })
        .mockResolvedValueOnce({
          ContentLength: 1024,
          LastModified: now,
          ContentType: "image/png",
        })
        .mockResolvedValueOnce({
          ContentLength: 2048,
          LastModified: now,
          ContentType: "image/jpeg",
        });

      const response = await app.request(`/api/v1/projects/${project.id}/assets`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(data[0]).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        size: expect.any(Number),
        mimeType: expect.any(String),
        url: expect.any(String),
        project: project.id,
      });
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/assets`, {
        method: "GET",
      });

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const response = await app.request(`/api/v1/projects/${project.id}/assets`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${otherUserSetup.token}`,
        },
      });

      expect(response.status).toBe(404);
    });

    test("should return 401 when using secret key (not supported)", async () => {
      const { project } = await createTestSetup();
      const secretToken = AuthService.createProjectToken(
        project.secret,
        "secret",
        project.id,
      );

      const response = await app.request(`/api/v1/projects/${project.id}/assets`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretToken}`,
        },
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /projects/{projectId}/assets/{id}", () => {
    test("should successfully get an asset by ID", async () => {
      const { project, token } = await createTestSetup();

      const now = new Date();
      const s3Key = `${project.id}/test-asset.png`;
      const assetId = Buffer.from(s3Key).toString("base64url");

      // Mock HeadObject response
      mockSend.mockResolvedValueOnce({
        ContentLength: 1024,
        LastModified: now,
        ContentType: "image/png",
      });

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/${assetId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        id: assetId,
        name: expect.any(String),
        size: 1024,
        mimeType: "image/png",
        url: expect.any(String),
        project: project.id,
      });
    });

    test("should return 404 when asset does not exist", async () => {
      const { project, token } = await createTestSetup();

      const s3Key = `${project.id}/non-existent.png`;
      const assetId = Buffer.from(s3Key).toString("base64url");

      // Mock NotFound error - need to create an error object with the right structure
      const notFoundError = new Error("Not Found");
      (notFoundError as any).name = "NotFound";
      mockSend.mockRejectedValueOnce(notFoundError);

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/${assetId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(404);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();
      const assetId = Buffer.from(`${project.id}/test.png`).toString("base64url");

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/${assetId}`,
        {
          method: "GET",
        },
      );

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();
      const assetId = Buffer.from(`${project.id}/test.png`).toString("base64url");

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/${assetId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${otherUserSetup.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /projects/{projectId}/assets/{id}", () => {
    test("should successfully delete an asset", async () => {
      const { project, token } = await createTestSetup();

      const s3Key = `${project.id}/test-asset.png`;
      const assetId = Buffer.from(s3Key).toString("base64url");

      // Mock DeleteObject - deleteAsset doesn't check if asset exists first
      mockSend.mockResolvedValueOnce({});

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/${assetId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(204);
    });

    test("should return 204 when deleting non-existent asset (idempotent)", async () => {
      const { project, token } = await createTestSetup();

      const s3Key = `${project.id}/non-existent.png`;
      const assetId = Buffer.from(s3Key).toString("base64url");

      // Mock DeleteObject - delete is idempotent, so it succeeds even if asset doesn't exist
      mockSend.mockResolvedValueOnce({});

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/${assetId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      expect(response.status).toBe(204);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();
      const assetId = Buffer.from(`${project.id}/test.png`).toString("base64url");

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/${assetId}`,
        {
          method: "DELETE",
        },
      );

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();
      const assetId = Buffer.from(`${project.id}/test.png`).toString("base64url");

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/${assetId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${otherUserSetup.token}`,
          },
        },
      );

      expect(response.status).toBe(404);
    });
  });

  describe("POST /projects/{projectId}/assets/upload-url", () => {
    test("should successfully generate upload URL", async () => {
      const { project, token } = await createTestSetup();

      const uploadPayload = {
        name: "test-image.png",
        size: 1024,
        mimeType: "image/png",
      };

      // Mock HeadObject to return NotFound (asset doesn't exist yet)
      mockSend.mockRejectedValueOnce({ name: "NotFound" });
      mockGetSignedUrl.mockResolvedValue("https://test-bucket.s3.amazonaws.com/presigned-url");

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/upload-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        },
      );

      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toMatchObject({
        uploadUrl: expect.stringContaining("https://"),
        id: expect.any(String),
        expiresIn: expect.any(Number),
      });
      expect(data.expiresIn).toBeGreaterThan(0);
    });

    test("should return 400 when name is empty", async () => {
      const { project, token } = await createTestSetup();

      const uploadPayload = {
        name: "",
        size: 1024,
        mimeType: "image/png",
      };

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/upload-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        },
      );

      expect(response.status).toBe(400);
    });

    test("should return 400 when size is not positive", async () => {
      const { project, token } = await createTestSetup();

      const uploadPayload = {
        name: "test.png",
        size: 0,
        mimeType: "image/png",
      };

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/upload-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        },
      );

      expect(response.status).toBe(400);
    });

    test("should return 400 when size is negative", async () => {
      const { project, token } = await createTestSetup();

      const uploadPayload = {
        name: "test.png",
        size: -1,
        mimeType: "image/png",
      };

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/upload-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        },
      );

      expect(response.status).toBe(400);
    });

    test("should return 400 when size exceeds 10MB", async () => {
      const { project, token } = await createTestSetup();

      const uploadPayload = {
        name: "large-file.pdf",
        size: 11 * 1024 * 1024, // 11MB
        mimeType: "application/pdf",
      };

      // Mock HeadObject to return NotFound
      mockSend.mockRejectedValueOnce({ name: "NotFound" });

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/upload-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        },
      );

      expect(response.status).toBe(400);
    });

    test("should return 400 when mimeType is empty", async () => {
      const { project, token } = await createTestSetup();

      const uploadPayload = {
        name: "test.png",
        size: 1024,
        mimeType: "",
      };

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/upload-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        },
      );

      expect(response.status).toBe(400);
    });

    test("should return 401 when not authenticated", async () => {
      const { project } = await createTestSetup();

      const uploadPayload = {
        name: "test.png",
        size: 1024,
        mimeType: "image/png",
      };

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/upload-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        },
      );

      expect(response.status).toBe(401);
    });

    test("should return 404 when user is not a member of the project", async () => {
      const { project } = await createTestSetup();
      const otherUserSetup = await createTestSetup();

      const uploadPayload = {
        name: "test.png",
        size: 1024,
        mimeType: "image/png",
      };

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/upload-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${otherUserSetup.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        },
      );

      expect(response.status).toBe(404);
    });

    test("should return 401 when using secret key (not supported)", async () => {
      const { project } = await createTestSetup();
      const secretToken = AuthService.createProjectToken(
        project.secret,
        "secret",
        project.id,
      );

      const uploadPayload = {
        name: "test.png",
        size: 1024,
        mimeType: "image/png",
      };

      const response = await app.request(
        `/api/v1/projects/${project.id}/assets/upload-url`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(uploadPayload),
        },
      );

      expect(response.status).toBe(401);
    });
  });
});

