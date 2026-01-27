import { zodResolver } from "@hookform/resolvers/zod";
import type { Campaign, CampaignUpdate } from "@sendra/shared";
import { CampaignSchemas } from "@sendra/shared";
import { Copy, Edit, FlaskConical, Save, Send, Trash } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ErrorAlert } from "../../../../components/Alert/ErrorAlert";
import { BlackButton } from "../../../../components/Buttons/BlackButton";
import { MenuButton } from "../../../../components/Buttons/MenuButton";
import { SecondaryButton } from "../../../../components/Buttons/SecondaryButton";
import Card from "../../../../components/Card/Card";
import GroupOrContacts from "../../../../components/ContactSelector/GroupOrContacts";
import Dropdown from "../../../../components/Input/Dropdown/Dropdown";
import { StyledLabel } from "../../../../components/Label/StyledLabel";
import Modal from "../../../../components/Overlay/Modal/Modal";
import FullscreenLoader from "../../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useCampaignsWithEmails } from "../../../../lib/hooks/campaigns";
import { useCurrentProject } from "../../../../lib/hooks/projects";
import { network } from "../../../../lib/network";

/**
 *
 */
export default function DraftCampaign({ campaign, mutate: campaignMutate }: { campaign: Campaign; mutate: () => void }) {
  const navigate = useNavigate();
  const project = useCurrentProject();
  const { mutate: campaignsMutate } = useCampaignsWithEmails();

  const [confirmModal, setConfirmModal] = useState(false);
  const [delay, setDelay] = useState(0);

  const {
    handleSubmit,
    formState: { errors },
    watch,
    reset,
    setValue,
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(CampaignSchemas.update.omit({ id: true })),
    defaultValues: { recipients: [], body: undefined },
  });

  useEffect(() => {
    if (!campaign) {
      return;
    }

    reset({
      ...campaign,
      recipients: campaign.recipients,
    });
  }, [reset, campaign]);

  useEffect(() => {
    watch((value, { name }) => {
      if (name === "email") {
        if (value.email && project?.email && !value.email.endsWith(project.email.split("@")[1])) {
          setError("email", {
            type: "manual",
            message: `The sender address must end with @${project.email?.split("@")[1]}`,
          });
        } else {
          clearErrors("email");
        }
      }
    });
  }, [watch, project, setError, clearErrors]);

  const saveCampaign = useCallback(
    async (data: Omit<CampaignUpdate, "id">) => {
      if (data.email?.trim() === "") {
        delete data.email;
      }
      if (!project || !campaign) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        toast.promise(
          network.fetch(`/projects/${project.id}/campaigns/${campaign.id}`, {
            method: "PUT",
            body: {
              id: campaign.id,
              ...data,
            },
          }),
          {
            loading: "Saving your campaign",
            success: () => {
              void campaignMutate();
              resolve();
              return "Saved your campaign";
            },
            error: (error) => {
              reject(error);
              return `Could not save your campaign: ${error}`;
            },
          },
        );
      });
    },
    [project, campaign, campaignMutate],
  );

  if (!campaign || (watch("body") as object | undefined) === undefined) {
    return <FullscreenLoader />;
  }

  const send = async (data: Omit<CampaignUpdate, "id">) => {
    setConfirmModal(false);

    toast.success("Saved your campaign. Starting delivery now, please hold on!");

    await saveCampaign(data);

    toast.promise(
      network.fetch(`/projects/${project.id}/campaigns/${campaign.id}/send`, {
        method: "POST",
        body: {
          id: campaign.id,
          live: true,
          delay,
        },
      }),

      {
        loading: "Starting delivery...",
        success: () => {
          void campaignMutate();
          void campaignsMutate();

          return `Started delivery of your campaign to ${watch("recipients").length} recipients`;
        },
        error: () => {
          return "Could not send your campaign!";
        },
      },
    );
  };

  const sendTest = async (data: Omit<CampaignUpdate, "id">) => {
    await saveCampaign(data);

    toast.promise(
      network.fetch(`/projects/${project.id}/campaigns/${campaign.id}/send`, {
        method: "POST",
        body: {
          live: false,
          delay: 0,
        },
      }),
      {
        loading: "Sending all project members a test campaign",
        success: "Sent all project members a test campaign",
        error: "Could not send test campaign!",
      },
    );
  };

  const update = (data: Omit<CampaignUpdate, "id">) => {
    toast.promise(saveCampaign(data), {
      loading: "Saving your campaign",
      success: () => {
        void campaignMutate();
        void campaignsMutate();
        return "Saved your campaign";
      },
      error: "Could not save your campaign!",
    });
  };

  const duplicate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(
      network.fetch(`/projects/${project.id}/campaigns`, {
        method: "POST",
        body: {
          ...campaign,
        },
      }),
      {
        loading: "Duplicating your campaign",
        success: () => {
          void campaignMutate();
          void campaignsMutate();
          return "Duplicated your campaign";
        },
        error: "Could not duplicate your campaign!",
      },
    );

    navigate("/campaigns");
  };

  const remove = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(
      network.fetch(`/projects/${project.id}/campaigns/${campaign.id}`, {
        method: "DELETE",
      }),
      {
        loading: "Deleting your campaign",
        success: () => {
          void campaignMutate();
          void campaignsMutate();
          return "Deleted your campaign";
        },
        error: "Could not delete your campaign!",
      },
    );

    navigate("/campaigns");
  };

  return (
    <>
      <Modal
        isOpen={confirmModal}
        onToggle={() => setConfirmModal(!confirmModal)}
        onAction={handleSubmit(send)}
        type="info"
        title="Send campaign"
        description={`Once you start sending this campaign to ${watch("recipients").length} contacts, you can no longer make changes or undo it.`}
      >
        <StyledLabel>
          Delay
          <Dropdown
            className="mt-1"
            inModal={true}
            onChange={(val) => setDelay(Number.parseInt(val, 10))}
            values={[
              {
                name: "Send immediately",
                value: "0",
              },
              {
                name: "In an hour",
                value: "60",
              },
              {
                name: "In 6 hours",
                value: "360",
              },
              {
                name: "In 12 hours",
                value: "720",
              },
              {
                name: "In 24 hours",
                value: "1440",
              },
            ]}
            selectedValue={delay.toString()}
          />
        </StyledLabel>
      </Modal>

      <Card
        title="Update campaign"
        options={
          <>
            <MenuButton onClick={duplicate}>
              <Copy size={18} />
              Duplicate
            </MenuButton>
            <MenuButton onClick={remove}>
              <Trash size={18} />
              Delete
            </MenuButton>
          </>
        }
      >
        <form onSubmit={handleSubmit(update)} className="space-y-6 sm:space-y-0 sm:space-6 sm:grid sm:gap-6 sm:grid-cols-6">
          <GroupOrContacts
            onRecipientsChange={(r: string[]) => setValue("recipients", r)}
            onGroupsChange={(g: string[]) => setValue("groups", g)}
            disabled={false}
            label="Recipients"
            selectedContacts={campaign.recipients}
            selectedGroups={campaign.groups}
          />

          <ErrorAlert message={(errors.recipients as FieldError | undefined)?.message} />

          <div className={"sm:col-span-6"}>
            <div className="h-[calc(100vh-550px)] min-h-[600px]">
              <div className="flex justify-between gap-2">
                <h2 className="text-lg font-semibold text-neutral-800">Preview</h2>
                <BlackButton
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/campaigns/${campaign.id}/edit`);
                  }}
                >
                  <Edit size={18} />
                  Edit
                </BlackButton>
              </div>

              <iframe srcDoc={campaign.body.html} className="w-full h-full" title={campaign.subject ?? "Campaign preview"} />
            </div>
            <ErrorAlert message={errors.body?.message} />
          </div>

          <div className="ml-auto mt-6 sm:flex justify-end sm:gap-x-5 sm:col-span-6">
            <BlackButton
              onClick={(e) => {
                e.preventDefault();
                setConfirmModal(true);
              }}
            >
              <Send />
              Send
            </BlackButton>
            <SecondaryButton onClick={handleSubmit(sendTest)}>
              <FlaskConical size={18} />
              Test
            </SecondaryButton>
            <SecondaryButton>
              <Save strokeWidth={1.5} size={18} />
              Save
            </SecondaryButton>
          </div>
        </form>
      </Card>
    </>
  );
}
