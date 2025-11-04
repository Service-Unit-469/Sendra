import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, type HeadObjectCommandOutput, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Asset } from "@sendra/shared";
import { rootLogger } from "../logging/Logger";
import { HttpException } from "../persistence/utils/HttpException";
import { getAssetsConfig } from "./AppConfig";

const logger = rootLogger.child({
  module: "AssetService",
});

export class AssetService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    const assetsConfig = getAssetsConfig();
    this.s3Client = new S3Client();
    this.bucketName = assetsConfig.ASSETS_BUCKET_NAME || "";

    if (!this.bucketName) {
      throw new Error("ASSETS_BUCKET_NAME environment variable is not set");
    }
  }

  /**
   * Convert S3 key to asset ID
   */
  private s3KeyToId(s3Key: string): string {
    return Buffer.from(s3Key).toString("base64url");
  }

  /**
   * Convert asset ID back to S3 key
   */
  private idToS3Key(id: string): string {
    return Buffer.from(id, "base64url").toString();
  }

  /**
   * Convert S3 object to Asset type
   */
  private s3ObjectToAsset(key: string, response: HeadObjectCommandOutput): Asset {
    const [projectId, ...filenameParts] = key.split("/");
    const filename = filenameParts.join("/");
    const name = filename;
    const mimeType = response.ContentType ?? "application/octet-stream";
    const url = `https://${this.bucketName}.s3.amazonaws.com/${key}`;

    return {
      id: this.s3KeyToId(key),
      name,
      size: response.ContentLength ?? 0,
      mimeType,
      url,
      project: projectId,
      updatedAt: response.LastModified,
    };
  }

  /**
   * Generate a pre-signed URL for uploading a file to S3
   */
  async generateUploadUrl(
    projectId: string,
    name: string,
    size: number,
    mimeType: string,
  ): Promise<{
    uploadUrl: string;
    id: string;
    expiresIn: number;
  }> {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (size > maxSize) {
      throw new HttpException(400, `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`);
    }

    // Validate mime type
    const allowedMimeTypes = [
      // Images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // Other
      "text/csv",
      "text/plain",
    ];

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new HttpException(400, `File type ${mimeType} is not allowed`);
    }

    const s3Key = `${projectId}/${name}`;
    const id = this.s3KeyToId(s3Key);

    try {
      const asset = await this.getAsset(projectId, id);
      if (asset) {
        throw new HttpException(409, "Asset with this name already exists");
      }
    } catch {
      // Asset does not exist, continue
    }

    // Create pre-signed URL for upload with metadata
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const expiresIn = 300; // 5 minutes
    const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });

    logger.info(
      {
        projectId,
        s3Key,
        size,
        mimeType,
      },
      "Generated upload URL",
    );

    return {
      uploadUrl,
      id: this.s3KeyToId(s3Key),
      expiresIn,
    };
  }

  /**
   * Generate a pre-signed URL for downloading a file from S3
   */
  async generateDownloadUrl(projectId: string, id: string, expiresIn: number = 3600): Promise<string> {
    const s3Key = this.idToS3Key(id);
    // Verify the asset belongs to this project
    if (!s3Key.startsWith(`${projectId}/`)) {
      throw new HttpException(403, "Access denied to this asset");
    }
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn,
    });

    logger.info(
      {
        id,
        s3Key,
      },
      "Generated download URL",
    );

    return downloadUrl;
  }

  /**
   * Get asset by ID
   */
  async getAsset(projectId: string, id: string): Promise<Asset> {
    const s3Key = this.idToS3Key(id);

    // Verify the asset belongs to this project
    if (!s3Key.startsWith(`${projectId}/`)) {
      throw new HttpException(403, "Access denied to this asset");
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);

      if (!response.ContentLength || !response.LastModified) {
        throw new HttpException(404, "Asset not found");
      }

      return this.s3ObjectToAsset(s3Key, response);
    } catch (error) {
      if ((error as { name?: string }).name === "NotFound") {
        throw new HttpException(404, "Asset not found");
      }
      throw error;
    }
  }

  /**
   * List all assets for a project
   */
  async listAssets(projectId: string): Promise<Asset[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: `${projectId}/`,
    });
    ``;
    const response = await this.s3Client.send(command);
    const assets: Asset[] = [];

    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key && object.Size !== undefined && object.LastModified) {
          // Fetch metadata for each object
          try {
            const headCommand = new HeadObjectCommand({
              Bucket: this.bucketName,
              Key: object.Key,
            });
            const headResponse = await this.s3Client.send(headCommand);
            assets.push(this.s3ObjectToAsset(object.Key, headResponse));
          } catch (error) {
            logger.warn({ key: object.Key }, "Failed to fetch metadata for object");
          }
        }
      }
    }

    logger.info(
      {
        projectId,
        count: assets.length,
      },
      "Listed assets",
    );

    return assets;
  }

  /**
   * List assets by type
   */
  async listAssetsByType(projectId: string, assetType: "IMAGE" | "ATTACHMENT"): Promise<Asset[]> {
    const allAssets = await this.listAssets(projectId);

    return allAssets.filter((asset) => {
      const isImage = asset.mimeType.startsWith("image/");
      return assetType === "IMAGE" ? isImage : !isImage;
    });
  }

  /**
   * Delete asset from S3
   */
  async deleteAsset(projectId: string, id: string): Promise<void> {
    const s3Key = this.idToS3Key(id);

    // Verify the asset belongs to this project
    if (!s3Key.startsWith(`${projectId}/`)) {
      throw new HttpException(403, "Access denied to this asset");
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
    });

    await this.s3Client.send(command);

    logger.info(
      {
        projectId,
        id,
        s3Key,
      },
      "Deleted asset",
    );
  }
}
