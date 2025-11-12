import type { CustomField } from "@measured/puck";
import type { Asset } from "@sendra/shared";
import Image from "next/image";
import { useState } from "react";
import { useAssets } from "../../../lib/hooks/assets";

export type ImagePickerProps = {
  label?: string;
  value?: string | undefined;
  onChange: (value: string | undefined) => void;
  name: string;
  id: string;
};

/**
 * Custom Puck field component for asset selection
 * Allows selecting assets from the project's asset library
 */
const ImagePicker: React.FC<ImagePickerProps> = ({ value, onChange, name, id, label }) => {
  const { data: assets, isLoading, error } = useAssets();
  const [manualUrl, setManualUrl] = useState(value || "");
  const [mode, setMode] = useState<"picker" | "manual">(value && assets && !assets.find((a) => a.url === value) ? "manual" : "picker");

  // Filter assets by type if specified
  const filteredAssets = assets?.filter((asset) => asset.mimeType.startsWith("image/"));

  const handleAssetSelect = (asset: Asset) => {
    onChange(asset.url);
    setManualUrl(asset.url);
  };

  const handleManualUrlChange = (url: string) => {
    setManualUrl(url);
    onChange(url || undefined);
  };

  const renderAssetGrid = () => {
    if (isLoading) {
      return <div className="text-sm text-neutral-500 py-4 text-center">Loading assets...</div>;
    }

    if (error) {
      return <div className="text-sm text-red-500 py-4 text-center">Error loading assets</div>;
    }

    if (!filteredAssets || filteredAssets.length === 0) {
      return <div className="text-sm text-neutral-500 py-4 text-center">No assets available. Upload assets in the Assets section.</div>;
    }

    return (
      <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
        {filteredAssets.map((asset) => {
          const isSelected = value === asset.url;
          const isImage = asset.mimeType.startsWith("image/");

          return (
            <button
              key={asset.id}
              type="button"
              onClick={() => handleAssetSelect(asset)}
              className={`
                relative aspect-square rounded border-2 transition-all hover:scale-105
                ${isSelected ? "border-neutral-900 ring-2 ring-neutral-900 ring-offset-2" : "border-neutral-300"}
              `}
              title={asset.name}
              aria-label={`Select ${asset.name}`}
            >
              {isImage ? (
                <Image src={asset.url} alt={asset.name} className="w-full h-full object-cover rounded" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-neutral-50">
                  <svg className="w-8 h-8 text-neutral-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-xs text-neutral-600 truncate w-full text-center">{asset.name.split(".").pop()?.toUpperCase()}</span>
                </div>
              )}
              {isSelected && (
                <div className="absolute top-1 right-1 bg-neutral-900 rounded-full p-1">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm text-neutral-800 mb-1">
        {label ?? "Asset"}
      </label>
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => setMode("picker")}
          className={`px-3 py-1 text-xs rounded transition ${mode === "picker" ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}`}
        >
          Asset Library
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={`px-3 py-1 text-xs rounded transition ${mode === "manual" ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"}`}
        >
          Manual URL
        </button>
      </div>
      {mode === "picker" ? (
        <div>
          {renderAssetGrid()}
          {value && (
            <div className="mt-2 text-xs text-neutral-500 truncate" title={value}>
              Selected: {value}
            </div>
          )}
        </div>
      ) : (
        <div>
          <input
            type="url"
            id={id}
            name={name}
            value={manualUrl}
            onChange={(e) => handleManualUrlChange(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="block w-full rounded border border-neutral-300 px-3 py-2 text-sm transition focus:border-neutral-800 focus:outline-none focus:ring-1 focus:ring-neutral-800"
          />
          {manualUrl?.startsWith("http") && (
            <div className="mt-2">
              <Image
                src={manualUrl}
                alt="Preview"
                className="w-full max-h-32 object-contain rounded border border-neutral-200"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ImagePickerRender: CustomField<string>["render"] = ({ value, onChange, name, id, field: { label } }) => (
  <ImagePicker value={value} onChange={(value) => onChange(value || "")} name={name} id={id} label={label} />
);
