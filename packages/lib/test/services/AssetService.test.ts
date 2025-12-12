import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AssetService } from "../../src/services/AssetService";
import { HttpException } from "../../src/persistence/utils/HttpException";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  const mockSend = vi.fn();
  return {
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

vi.mock("../../src/services/AppConfig", () => ({
  getAssetsConfig: vi.fn(() => ({
    ASSETS_BUCKET_NAME: "test-bucket",
    APP_URL: "https://test-bucket.s3.amazonaws.com",
  })),
  getLogConfig: vi.fn(() => ({
    level: "info",
    pretty: false,
  })),
}));

// Get mock functions
// @ts-expect-error mocking
const mockSend = vi.mocked((await import("@aws-sdk/client-s3")).__mockSend as any);
const mockGetSignedUrl = vi.mocked(getSignedUrl);

describe("AssetService", () => {
  let assetService: AssetService;
  const TEST_PROJECT_ID = "test-project-123";

  beforeEach(() => {
    vi.clearAllMocks();
    assetService = new AssetService();
  });

  describe("constructor", () => {
    it("should throw error when ASSETS_BUCKET_NAME is not set", async () => {
      // Temporarily change the mock to return empty bucket name
      const { getAssetsConfig } = await import("../../src/services/AppConfig");
      vi.mocked(getAssetsConfig).mockReturnValueOnce({
        ASSETS_BUCKET_NAME: "",
        APP_URL: "https://test-bucket.s3.amazonaws.com",
      });

      expect(() => new AssetService()).toThrow(
        "ASSETS_BUCKET_NAME environment variable is not set"
      );
    });
  });

  describe("generateUploadUrl", () => {
    it("should generate upload URL for valid file", async () => {
      // Mock getAsset to throw 404 (asset doesn't exist)
      mockSend.mockRejectedValueOnce({ name: "NotFound" });
      mockGetSignedUrl.mockResolvedValue(
        "https://test-bucket.s3.amazonaws.com/presigned-url"
      );

      const result = await assetService.generateUploadUrl(
        TEST_PROJECT_ID,
        "test-image.png",
        1024,
        "image/png"
      );

      expect(result).toMatchObject({
        uploadUrl: "https://test-bucket.s3.amazonaws.com/presigned-url",
        id: expect.any(String),
        expiresIn: 300,
      });
      expect(mockGetSignedUrl).toHaveBeenCalled();
      const callArgs = mockGetSignedUrl.mock.calls[0];
      expect(callArgs[2]).toEqual({ expiresIn: 300 });
    });

    it("should reject file size exceeding 10MB", async () => {
      const largeSize = 11 * 1024 * 1024; // 11MB

      await expect(
        assetService.generateUploadUrl(
          TEST_PROJECT_ID,
          "large-file.pdf",
          largeSize,
          "application/pdf"
        )
      ).rejects.toThrow(HttpException);
    });

    it("should reject disallowed MIME types", async () => {
      await expect(
        assetService.generateUploadUrl(
          TEST_PROJECT_ID,
          "script.exe",
          1024,
          "application/x-msdownload"
        )
      ).rejects.toThrow("File type application/x-msdownload is not allowed");
    });

    it("should allow all supported image types", async () => {
      mockGetSignedUrl.mockResolvedValue("https://presigned-url");

      const imageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ];

      for (const mimeType of imageTypes) {
        // Mock getAsset to throw 404 (asset doesn't exist) for each iteration
        mockSend.mockRejectedValueOnce({ name: "NotFound" });
        await expect(
          assetService.generateUploadUrl(
            TEST_PROJECT_ID,
            "test-image",
            1024,
            mimeType
          )
        ).resolves.toBeDefined();
      }
    });

    it("should allow all supported document types", async () => {
      mockGetSignedUrl.mockResolvedValue("https://presigned-url");

      const documentTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/csv",
        "text/plain",
      ];

      for (const mimeType of documentTypes) {
        // Mock getAsset to throw 404 (asset doesn't exist) for each iteration
        mockSend.mockRejectedValueOnce({ name: "NotFound" });
        await expect(
          assetService.generateUploadUrl(
            TEST_PROJECT_ID,
            "test-doc",
            1024,
            mimeType
          )
        ).resolves.toBeDefined();
      }
    });

    it("should throw error when asset with same name already exists", async () => {
      mockSend.mockResolvedValueOnce({
        ContentLength: 1024,
        LastModified: new Date(),
        ContentType: "image/png",
      });
      const error = await assetService
        .generateUploadUrl(
          TEST_PROJECT_ID,
          "existing-file.png",
          1024,
          "image/png"
        )
        .catch((e) => e);
      expect(error).toBeInstanceOf(HttpException);
      expect(error.message).toBe("Asset with this name already exists");
    });
  });

  describe("getAsset", () => {
    it("should return asset for valid ID", async () => {
      const s3Key = `${TEST_PROJECT_ID}/test-image.png`;
      const id = Buffer.from(s3Key).toString("base64url");

      mockSend.mockResolvedValue({
        ContentLength: 2048,
        LastModified: new Date("2024-01-01"),
        ContentType: "image/png",
      });

      const asset = await assetService.getAsset(TEST_PROJECT_ID, id);

      expect(asset).toMatchObject({
        id: id,
        name: "test-image.png",
        size: 2048,
        mimeType: "image/png",
        url: expect.stringContaining("test-image.png"),
        project: TEST_PROJECT_ID,
      });
    });

    it("should deny access to asset from different project", async () => {
      const s3Key = "different-project/test-file.pdf";
      const id = Buffer.from(s3Key).toString("base64url");

      await expect(assetService.getAsset(TEST_PROJECT_ID, id)).rejects.toThrow(
        "Access denied to this asset"
      );
    });

    it("should throw 404 when asset not found", async () => {
      const s3Key = `${TEST_PROJECT_ID}/nonexistent.png`;
      const id = Buffer.from(s3Key).toString("base64url");

      mockSend.mockRejectedValue({ name: "NotFound" });

      await expect(assetService.getAsset(TEST_PROJECT_ID, id)).rejects.toThrow(
        "Asset not found"
      );
    });

    it("should throw 404 when ContentLength is missing", async () => {
      const s3Key = `${TEST_PROJECT_ID}/test-file.pdf`;
      const id = Buffer.from(s3Key).toString("base64url");

      mockSend.mockResolvedValue({
        LastModified: new Date(),
        ContentType: "application/pdf",
      });

      await expect(assetService.getAsset(TEST_PROJECT_ID, id)).rejects.toThrow(
        "Asset not found"
      );
    });

    it("should throw 404 when LastModified is missing", async () => {
      const s3Key = `${TEST_PROJECT_ID}/test-file.pdf`;
      const id = Buffer.from(s3Key).toString("base64url");

      mockSend.mockResolvedValue({
        ContentLength: 1024,
        ContentType: "application/pdf",
      });

      await expect(assetService.getAsset(TEST_PROJECT_ID, id)).rejects.toThrow(
        "Asset not found"
      );
    });

    it("should use default mime type when ContentType is missing", async () => {
      const s3Key = `${TEST_PROJECT_ID}/test-file`;
      const id = Buffer.from(s3Key).toString("base64url");

      mockSend.mockResolvedValue({
        ContentLength: 1024,
        LastModified: new Date(),
      });

      const asset = await assetService.getAsset(TEST_PROJECT_ID, id);

      expect(asset.mimeType).toBe("application/octet-stream");
    });

    it("should handle nested file paths", async () => {
      const s3Key = `${TEST_PROJECT_ID}/folder/subfolder/test-image.png`;
      const id = Buffer.from(s3Key).toString("base64url");

      mockSend.mockResolvedValue({
        ContentLength: 2048,
        LastModified: new Date(),
        ContentType: "image/png",
      });

      const asset = await assetService.getAsset(TEST_PROJECT_ID, id);

      expect(asset.name).toBe("folder/subfolder/test-image.png");
    });
  });

  describe("listAssets", () => {
    it("should return empty array when no assets exist", async () => {
      mockSend.mockResolvedValue({
        Contents: [],
      });

      const assets = await assetService.listAssets(TEST_PROJECT_ID);

      expect(assets).toEqual([]);
    });

    it("should return list of assets", async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: `${TEST_PROJECT_ID}/file1.png`,
              Size: 1024,
              LastModified: new Date("2024-01-01"),
            },
            {
              Key: `${TEST_PROJECT_ID}/file2.pdf`,
              Size: 2048,
              LastModified: new Date("2024-01-02"),
            },
          ],
        })
        .mockResolvedValueOnce({
          ContentLength: 1024,
          LastModified: new Date("2024-01-01"),
          ContentType: "image/png",
        })
        .mockResolvedValueOnce({
          ContentLength: 2048,
          LastModified: new Date("2024-01-02"),
          ContentType: "application/pdf",
        });

      const assets = await assetService.listAssets(TEST_PROJECT_ID);

      expect(assets).toHaveLength(2);
      expect(assets[0].name).toBe("file1.png");
      expect(assets[1].name).toBe("file2.pdf");
    });

    it("should skip objects with missing metadata", async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: `${TEST_PROJECT_ID}/file1.png`,
              Size: 1024,
              LastModified: new Date(),
            },
            {
              Key: `${TEST_PROJECT_ID}/file2.pdf`,
              // Missing Size
              LastModified: new Date(),
            },
          ],
        })
        .mockResolvedValueOnce({
          ContentLength: 1024,
          LastModified: new Date(),
          ContentType: "image/png",
        });

      const assets = await assetService.listAssets(TEST_PROJECT_ID);

      expect(assets).toHaveLength(1);
    });

    it("should handle HeadObjectCommand errors gracefully", async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [
            {
              Key: `${TEST_PROJECT_ID}/file1.png`,
              Size: 1024,
              LastModified: new Date(),
            },
          ],
        })
        .mockRejectedValueOnce(new Error("Failed to get object metadata"));

      const assets = await assetService.listAssets(TEST_PROJECT_ID);

      expect(assets).toHaveLength(0);
    });
  });

  describe("deleteAsset", () => {
    it("should delete asset successfully", async () => {
      const s3Key = `${TEST_PROJECT_ID}/test-file.png`;
      const id = Buffer.from(s3Key).toString("base64url");

      mockSend.mockResolvedValue({});

      await assetService.deleteAsset(TEST_PROJECT_ID, id);

      expect(mockSend).toHaveBeenCalled();
    });

    it("should deny deletion of asset from different project", async () => {
      const s3Key = "different-project/test-file.pdf";
      const id = Buffer.from(s3Key).toString("base64url");

      await expect(
        assetService.deleteAsset(TEST_PROJECT_ID, id)
      ).rejects.toThrow("Access denied to this asset");
    });
  });

  describe("ID conversion utilities", () => {
    it("should correctly convert between S3 key and ID", async () => {
      const s3Key = `${TEST_PROJECT_ID}/test-file.png`;
      const id = Buffer.from(s3Key).toString("base64url");

      mockSend.mockResolvedValue({
        ContentLength: 1024,
        LastModified: new Date(),
        ContentType: "image/png",
      });

      const asset = await assetService.getAsset(TEST_PROJECT_ID, id);

      expect(asset.id).toBe(id);
    });
  });
});
