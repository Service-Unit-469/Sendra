import { z } from "@hono/zod-openapi";
import { AssetService } from "@sendra/lib";
import { AssetSchema, AssetSchemas, UtilitySchemas } from "@sendra/shared";
import type { AppType } from "../../app";
import { getProblemResponseSchema } from "../../exceptions/responses";
import { BearerAuth, isAuthenticatedProjectMember } from "../../middleware/auth";

export const registerAssetsRoutes = (app: AppType) => {
  const assetService = new AssetService();

  // List all assets
  app.openapi(
    {
      operationId: "listAssets",
      tags: ["Assets"],
      method: "get",
      path: "/projects/{projectId}/assets",
      middleware: [isAuthenticatedProjectMember],
      ...BearerAuth,
      request: {
        params: UtilitySchemas.projectId,
      },
      responses: {
        200: {
          description: "List of assets",
          content: {
            "application/json": {
              schema: z.array(AssetSchema),
            },
          },
        },
      },
    },
    async (c) => {
      const { projectId } = c.req.valid("param");
      const assets = await assetService.listAssets(projectId);
      return c.json(assets, 200);
    },
  );

  app.openapi(
    {
      operationId: "getAsset",
      tags: ["Assets"],
      method: "get",
      path: "/projects/{projectId}/assets/{id}",
      middleware: [isAuthenticatedProjectMember],
      ...BearerAuth,
      request: {
        params: UtilitySchemas.projectAndId,
      },
      responses: {
        200: {
          description: "Asset details",
          content: {
            "application/json": {
              schema: AssetSchema,
            },
          },
        },
        404: {
          description: "Asset not found",
        },
      },
    },
    async (c) => {
      const { projectId, id } = c.req.valid("param");
      const asset = await assetService.getAsset(projectId, id);
      return c.json(asset, 200);
    },
  );

  app.openapi(
    {
      operationId: "deleteAsset",
      tags: ["Assets"],
      method: "delete",
      path: "/projects/{projectId}/assets/{id}",
      middleware: [isAuthenticatedProjectMember],
      ...BearerAuth,
      request: {
        params: UtilitySchemas.projectAndId,
      },
      responses: {
        204: {
          description: "Asset deleted successfully",
        },
        404: {
          description: "Asset not found",
        },
      },
    },
    async (c) => {
      const { projectId, id } = c.req.valid("param");
      await assetService.deleteAsset(projectId, id);
      return c.body(null, 204);
    },
  );

  app.openapi(
    {
      operationId: "generateAssetUploadUrl",
      tags: ["Assets"],
      method: "post",
      path: "/projects/{projectId}/assets/upload-url",
      middleware: [isAuthenticatedProjectMember],
      ...BearerAuth,
      request: {
        params: UtilitySchemas.projectId,
        body: {
          content: {
            "application/json": {
              schema: AssetSchemas.uploadUrl,
            },
          },
        },
      },
      responses: {
        200: {
          description: "Pre-signed upload URL generated",
          content: {
            "application/json": {
              schema: z.object({
                uploadUrl: z.string().url(),
                id: z.string(),
                expiresIn: z.number(),
              }),
            },
          },
        },
        400: getProblemResponseSchema(400),
        401: getProblemResponseSchema(401),
        403: getProblemResponseSchema(403),
        404: getProblemResponseSchema(404),
        500: getProblemResponseSchema(500),
      },
    },
    async (c) => {
      const { projectId } = c.req.valid("param");
      const { name, size, mimeType } = AssetSchemas.uploadUrl.parse(await c.req.json());

      const result = await assetService.generateUploadUrl(projectId, name, size, mimeType);

      return c.json(result, 200);
    },
  );
};
