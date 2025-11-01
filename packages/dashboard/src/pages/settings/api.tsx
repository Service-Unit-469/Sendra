import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import Card from "../../components/Card/Card";
import SettingTabs from "../../components/Navigation/SettingTabs/SettingTabs";
import Modal from "../../components/Overlay/Modal/Modal";
import FullscreenLoader from "../../components/Utility/FullscreenLoader/FullscreenLoader";
import { Dashboard } from "../../layouts";
import { API_URI } from "../../lib/constants";
import { useActiveProject, useActiveProjectKeys } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

const ClipboardButton = ({ text, label, description }: { text: string; label: string; description: string }) => {
  return (
    <label className="block text-sm font-medium text-neutral-700">
      <button
        onClick={() => {
          void navigator.clipboard.writeText(text);
          toast.success(`Copied your ${label}`);
        }}
        className="w-full"
      >
        {label}
        <p className="cursor-pointer rounded-sm border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm truncate" id="api-endpoint">
          {text}
        </p>

        <p className="text-sm text-neutral-500">{description}</p>
      </button>
    </label>
  );
};

/**
 *
 */
export default function Index() {
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  const { data: activeProjectKeys, mutate: activeProjectKeysMutate } = useActiveProjectKeys();
  const activeProject = useActiveProject();

  if (!activeProject) {
    return <FullscreenLoader />;
  }

  function expiresAt(key: string | undefined) {
    if (!key) {
      return "";
    }
    const expiresAt = JSON.parse(atob(key.split(".")[1])).exp;
    return new Date(expiresAt * 1000).toLocaleString();
  }

  const regenerate = () => {
    setShowRegenerateModal(!showRegenerateModal);

    toast.promise(
      network
        .fetch<
          {
            public: string;
            secret: string;
          },
          never
        >(`/projects/${activeProject.id}/keys`, { method: "POST" })
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
      <Dashboard>
        <SettingTabs />
        <Card
          title="API Access"
          description={`Manage your API access for ${activeProject.name}.`}
          actions={
            <button
              onClick={() => setShowRegenerateModal(!showRegenerateModal)}
              className={"flex items-center gap-x-1 rounded-sm bg-red-600 px-8 py-2 text-center text-sm font-medium text-white transition ease-in-out hover:bg-red-700"}
            >
              <RefreshCw strokeWidth={1.5} size={18} />
              Regenerate
            </button>
          }
        >
          <div className="mt-4">
            <ClipboardButton text={API_URI ?? ""} label="API Endpoint" description="The endpoint to your Sendra API." />
          </div>

          <div className="mt-4">
            <ClipboardButton text={activeProject?.id ?? ""} label="Project ID" description="The ID of your project, used to identify your project in the API." />
          </div>

          <div className="mt-4">
            <ClipboardButton
              text={activeProjectKeys?.public ?? ""}
              label="Public API Key"
              description={`Use this key for any front-end services. This key can only be used to publish events. This key expires at ${expiresAt(activeProjectKeys?.public)}.`}
            />
          </div>

          <div className="mt-4">
            <ClipboardButton
              text={activeProjectKeys?.secret ?? ""}
              label="Secret API Key"
              description={`Use this key for any secure back-end services. This key gives complete access to your Sendra setup. This key expires at ${expiresAt(activeProjectKeys?.secret)}.`}
            />
          </div>
        </Card>
      </Dashboard>
    </>
  );
}
