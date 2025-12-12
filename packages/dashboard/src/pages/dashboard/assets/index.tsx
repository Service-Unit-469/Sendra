import type { Asset } from "@sendra/shared";
import dayjs from "dayjs";
import { FileImage, FileText, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import Badge from "../../../components/Badge/Badge";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import Card from "../../../components/Card/Card";
import Modal from "../../../components/Overlay/Modal/Modal";
import Skeleton from "../../../components/Skeleton/Skeleton";
import Empty from "../../../components/Utility/Empty/Empty";
import { deleteAsset, uploadAsset, useAssets } from "../../../lib/hooks/assets";
import { useCurrentProject } from "../../../lib/hooks/projects";

/**
 * Assets management page
 */
export default function Index() {
  const { data: assets, mutate } = useAssets();
  const [uploading, setUploading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const currentProject = useCurrentProject();

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) {
        toast.error("No files selected");
        return;
      }

      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          await uploadAsset(currentProject.id, file);
          toast.success(`Uploaded ${file.name}`);
        }
        await mutate();
      } catch (error) {
        toast.error(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setUploading(false);
        event.target.value = "";
      }
    },
    [mutate, currentProject.id],
  );

  const handleDelete = useCallback(async () => {
    if (!assetToDelete) return;

    try {
      await deleteAsset(currentProject.id, assetToDelete.id);
      toast.success("Asset deleted successfully");
      await mutate();
      setDeleteModalOpen(false);
      setAssetToDelete(null);
    } catch (error) {
      toast.error(`Failed to delete asset: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }, [assetToDelete, mutate, currentProject.id]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <Card
        title={"Assets"}
        description={"Images and attachments for your emails"}
        actions={
          <label htmlFor="file-upload">
            <BlackButton disabled={uploading} onClick={() => document.getElementById("file-upload")?.click()}>
              {uploading ? <Upload strokeWidth={1.5} size={18} className="animate-pulse" /> : <Plus strokeWidth={1.5} size={18} />}
              {uploading ? "Uploading..." : "Upload"}
            </BlackButton>
            <input id="file-upload" type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        }
      >
        {assets ? (
          assets.length > 0 ? (
            <div className={"grid grid-cols-1 gap-6 lg:grid-cols-3"}>
              {assets.map((asset) => {
                const isImage = asset.mimeType.startsWith("image/");
                return (
                  <div className="col-span-1 divide-y divide-neutral-200 rounded-sm border border-neutral-200 bg-white" key={asset.id}>
                    <div className="flex w-full items-start justify-between space-x-4 p-6">
                      {isImage ? (
                        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-sm border border-neutral-200">
                          <img src={asset.url} alt={asset.name} className="h-full w-full object-cover" width={80} height={80} />
                        </div>
                      ) : (
                        <span className="inline-flex flex-shrink-0 rounded-sm bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">
                          <FileText size={32} />
                        </span>
                      )}
                      <div className="flex-1 truncate">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="truncate text-sm font-medium text-neutral-800">{asset.name}</h3>
                            <p className="mt-1 text-xs text-neutral-500">{formatFileSize(asset.size)}</p>
                            <div className="mt-2">
                              <Badge type={isImage ? "success" : "info"}>{isImage ? "IMAGE" : "ATTACHMENT"}</Badge>
                            </div>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-neutral-400">Uploaded {dayjs().to(asset.updatedAt)}</p>
                      </div>
                    </div>
                    <div>
                      <div className="-mt-px flex divide-x divide-neutral-200">
                        <div className="flex w-0 flex-1">
                          <a
                            href={asset.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center border border-transparent py-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 hover:text-neutral-700"
                          >
                            <FileImage size={18} />
                            <span className="ml-3">View</span>
                          </a>
                        </div>
                        <div className="flex w-0 flex-1">
                          <button
                            onClick={() => {
                              setAssetToDelete(asset);
                              setDeleteModalOpen(true);
                            }}
                            className="relative inline-flex w-0 flex-1 items-center justify-center rounded-br border border-transparent py-4 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 size={18} />
                            <span className="ml-3">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty title={"No assets yet"} description={"Upload images and attachments to use in your email templates"} />
          )
        ) : (
          <Skeleton type={"table"} />
        )}
      </Card>
      <Modal
        title="Delete Asset"
        description={`Are you sure you want to delete "${assetToDelete?.name}"? This action cannot be undone.`}
        isOpen={deleteModalOpen}
        onAction={() => {
          handleDelete();
          setDeleteModalOpen(false);
        }}
        type="danger"
        onToggle={() => {
          setDeleteModalOpen(false);
          setAssetToDelete(null);
        }}
      />
    </>
  );
}
