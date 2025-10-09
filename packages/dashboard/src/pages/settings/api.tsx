import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Card, FullscreenLoader, Modal, SettingTabs } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject, useActiveProjectKeys } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

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
        type={"danger"}
        title={"Are you sure?"}
        description={"Any applications that use your previously generated keys will stop working!"}
      />
      <Dashboard>
        <SettingTabs />
        <Card
          title={"API access"}
          description={`Manage your API keys for ${activeProject.name}`}
          actions={
            <button
              onClick={() => setShowRegenerateModal(!showRegenerateModal)}
              className={"flex items-center gap-x-1 rounded bg-red-600 px-8 py-2 text-center text-sm font-medium text-white transition ease-in-out hover:bg-red-700"}
            >
              <RefreshCw strokeWidth={1.5} size={18} />
              Regenerate
            </button>
          }
        >
          <button
            onClick={() => {
              void navigator.clipboard.writeText(activeProjectKeys?.public ?? "");
              toast.success("Copied your public API key");
            }}
          >
            <label className="block text-sm font-medium text-neutral-700" htmlFor="public-api-key">
              Public API Key
            </label>
            <p className="cursor-pointer rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm truncate" id="public-api-key">
              {activeProjectKeys?.public}
            </p>

            <p className="text-sm text-neutral-500">Use this key for any front-end services. This key can only be used to publish events.</p>
          </button>

          <div className="mt-4">
            <button
              onClick={() => {
                void navigator.clipboard.writeText(activeProjectKeys?.secret ?? "");
                toast.success("Copied your secret API key");
              }}
            >
              <label className="block text-sm font-medium text-neutral-700" htmlFor="secret-api-key">
                Secret API Key
              </label>
              <p className="cursor-pointer rounded border border-neutral-300 bg-neutral-100 px-3 py-2 text-sm truncate" id="secret-api-key">
                {activeProjectKeys?.secret}
              </p>

              <p className="text-sm text-neutral-500">Use this key for any secure back-end services. This key gives complete access to your Sendra setup.</p>
            </button>
          </div>
        </Card>
      </Dashboard>
    </>
  );
}
