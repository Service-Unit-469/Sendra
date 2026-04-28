import { Copy, LoaderCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DangerButton } from "../../../components/Buttons/DangerButton";
import Card from "../../../components/Card/Card";
import SettingTabs from "../../../components/Navigation/SettingTabs/SettingTabs";
import Modal from "../../../components/Overlay/Modal/Modal";
import { API_URI } from "../../../lib/constants";
import { useCurrentProject, useCurrentProjectKeys } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

const ClipboardButton = ({
  text,
  label,
  description,
  warning,
  canReveal,
  canCopy,
  isRevealed,
  isLoading,
  onToggleReveal,
}: {
  text: string;
  label: string;
  description: string;
  warning?: string;
  canReveal?: boolean;
  canCopy?: boolean;
  isRevealed?: boolean;
  isLoading?: boolean;
  onToggleReveal?: () => void;
}) => {
  const isMasked = Boolean(canReveal && !isRevealed && !isLoading && text);
  const displayText = isLoading ? "Loading..." : text || "Unavailable";
  const disableActions = isLoading || !text;

  return (
    <div className="mt-4">
      <div className="block text-sm font-medium text-neutral-700">
        <p>{label}</p>
        <div className="mt-1 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 grow rounded-sm border border-neutral-300 bg-neutral-100 px-3 py-2">
            <p className="text-sm truncate" data-testid={`${label.toLowerCase().replaceAll(" ", "-")}-value`}>
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <LoaderCircle size={14} className="animate-spin" />
                  Loading...
                </span>
              ) : isMasked ? (
                <span
                  data-testid={`${label.toLowerCase().replaceAll(" ", "-")}-mask`}
                  className="inline-block h-[1em] w-full align-middle rounded-sm bg-[repeating-linear-gradient(90deg,#9ca3af_0_6px,transparent_6px_9px)]"
                />
              ) : (
                displayText
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {canReveal && (
              <button
                type="button"
                onClick={onToggleReveal}
                disabled={disableActions}
                className="rounded-sm border border-neutral-300 bg-white px-2 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRevealed ? "Hide key" : "Reveal key"}
              </button>
            )}
            {canCopy && (
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(text);
                  toast.success(`Copied your ${label}`);
                }}
                disabled={disableActions}
                className="inline-flex items-center gap-1 rounded-sm border border-neutral-300 bg-white px-2 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Copy size={12} /> Copy
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-neutral-500">{description}</p>
        {warning && <p className="mt-1 text-sm font-medium text-red-700">{warning}</p>}
      </div>
    </div>
  );
};

/**
 *
 */
export default function ApiSettingsPage() {
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isSecretKeyRevealed, setIsSecretKeyRevealed] = useState(false);

  const { data: activeProjectKeys, mutate: activeProjectKeysMutate, isLoading: isProjectKeysLoading } = useCurrentProjectKeys();
  const project = useCurrentProject();

  function expiresAt(key: string | undefined) {
    if (!key) {
      return "";
    }
    const expiresAt = JSON.parse(atob(key.split(".")[1])).exp;
    return new Date(expiresAt * 1000).toLocaleString();
  }

  const regenerate = () => {
    setShowRegenerateModal(!showRegenerateModal);
    setIsSecretKeyRevealed(false);

    toast.promise(
      network
        .fetch<
          {
            public: string;
            secret: string;
          },
          never
        >(`/projects/${project.id}/keys`, { method: "POST" })
        .then(() => activeProjectKeysMutate()),
      {
        loading: "Regenerating API keys...",
        success: "Successfully regenerated API keys!",
        error: "Failed to create new API keys",
      },
    );
  };

  return (
    <>
      <Modal
        isOpen={showRegenerateModal}
        onToggle={() => setShowRegenerateModal(!showRegenerateModal)}
        onAction={regenerate}
        type="danger"
        title="Are you sure?"
        description="Any applications that use your previously generated keys will stop working!"
      />

      <SettingTabs />
      <Card
        title="API Access"
        description={`Manage your API access for ${project.name}.`}
        actions={
          <DangerButton onClick={() => setShowRegenerateModal(!showRegenerateModal)}>
            <RefreshCw strokeWidth={1.5} size={18} />
            Regenerate
          </DangerButton>
        }
      >
        <ClipboardButton text={API_URI ?? ""} label="API Endpoint" description="The endpoint to your Sendra API." canCopy />
        <ClipboardButton text={project.id} label="Project ID" description="The ID of your project, used to identify your project in the API." canCopy />
        <ClipboardButton
          text={activeProjectKeys?.public ?? ""}
          label="Public API Key"
          description={`Use this key for any front-end services. This key can only be used to publish events. This key expires at ${expiresAt(activeProjectKeys?.public)}.`}
          canCopy
          isLoading={isProjectKeysLoading}
        />
        <ClipboardButton
          text={activeProjectKeys?.secret ?? ""}
          label="Secret API Key"
          description={`Use this key for any secure back-end services. This key gives complete access to your Sendra setup. This key expires at ${expiresAt(activeProjectKeys?.secret)}.`}
          warning="Warning: Never expose this key in client-side code or public repositories."
          canReveal
          canCopy
          isRevealed={isSecretKeyRevealed}
          isLoading={isProjectKeysLoading}
          onToggleReveal={() => setIsSecretKeyRevealed(!isSecretKeyRevealed)}
        />
      </Card>
    </>
  );
}
