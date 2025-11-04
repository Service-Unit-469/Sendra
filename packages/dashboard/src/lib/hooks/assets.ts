import type { Asset } from "@sendra/shared";
import useSWR, { mutate } from "swr";
import { network } from "../network";
import { useActiveProject } from "./projects";

export const useAssets = () => {
  const activeProject = useActiveProject();
  return useSWR<Asset[]>(["assets"], async () => {
    if (!activeProject) {
      return [];
    }
    return network.fetch<Asset[], void>(`/projects/${activeProject.id}/assets`);
  });
};

export const useAsset = (id?: string) => {
  const activeProject = useActiveProject();
  return useSWR<Asset | undefined>(id ? ["assets", id] : null, async () => {
    if (!id || !activeProject) {
      return undefined;
    }
    return network.fetch<Asset | undefined, void>(`/projects/${activeProject.id}/assets/${id}`);
  });
};

export const useAssetsByType = (assetType: "IMAGE" | "ATTACHMENT") => {
  const activeProject = useActiveProject();
  return useSWR<Asset[]>(["assets", "by-type", assetType], async () => {
    if (!activeProject) {
      return [];
    }
    return network.fetch<Asset[], void>(`/assets/by-type/${assetType}`);
  });
};

export const uploadAsset = async (projectId: string, file: File): Promise<Asset> => {
  // Step 1: Get upload URL
  const uploadUrlResponse = await network.fetch<{ uploadUrl: string; id: string }, { name: string; size: number; mimeType: string }>(`/projects/${projectId}/assets/upload-url`, {
    method: "POST",
    body: {
      name: file.name,
      size: file.size,
      mimeType: file.type,
    },
  });

  // Step 2: Upload file to S3 with metadata
  const uploadResponse = await fetch(uploadUrlResponse.uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file to S3");
  }

  // Step 3: Fetch the asset metadata (now stored in S3)
  const asset = await network.fetch<Asset, void>(`/projects/${projectId}/assets/${uploadUrlResponse.id}`);

  // Invalidate cache
  const assetType = file.type.startsWith("image/") ? "IMAGE" : "ATTACHMENT";
  await mutate(["assets"]);
  await mutate(["assets", "by-type", assetType]);

  return asset;
};

export const updateAsset = async (projectId: string, id: string, updates: Partial<Asset>): Promise<Asset> => {
  const asset = await network.fetch<Asset, Partial<Asset>>(`/projects/${projectId}/assets/${id}`, {
    method: "PUT",
    body: updates,
  });

  // Invalidate cache
  await mutate(["assets"]);
  await mutate(["assets", id]);

  return asset;
};

export const deleteAsset = async (projectId: string, id: string): Promise<void> => {
  await network.fetch(`/projects/${projectId}/assets/${id}`, {
    method: "DELETE",
  });

  // Invalidate cache
  await mutate(["assets"]);
};
