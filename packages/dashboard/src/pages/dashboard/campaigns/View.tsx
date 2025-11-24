import { zodResolver } from "@hookform/resolvers/zod";
import type { CampaignUpdate, Email } from "@sendra/shared";
import { CampaignSchemas } from "@sendra/shared";
import { Copy, Edit, Eye, LoaderCircle, Save, Send, Trash } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type FieldError, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ErrorAlert } from "../../../components/Alert/ErrorAlert";
import Badge from "../../../components/Badge/Badge";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import { MenuButton } from "../../../components/Buttons/MenuButton";
import Card from "../../../components/Card/Card";
import GroupOrContacts from "../../../components/ContactSelector/GroupOrContacts";
import Dropdown from "../../../components/Input/Dropdown/Dropdown";
import Modal from "../../../components/Overlay/Modal/Modal";
import Table from "../../../components/Table/Table";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useCampaign, useCampaignsWithEmails } from "../../../lib/hooks/campaigns";
import { useEmailsByCampaign } from "../../../lib/hooks/emails";
import { useCurrentProject } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

/**
 *
 */
export default function ViewCampaignPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const project = useCurrentProject();
  const { mutate: campaignsMutate } = useCampaignsWithEmails();
  const { data: campaign, mutate: campaignMutate } = useCampaign(id ?? "");

  const { data: emails } = useEmailsByCampaign(campaign?.id);

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

      await network.fetch(`/projects/${project.id}/campaigns/${campaign.id}`, {
        method: "PUT",
        body: {
          id: campaign.id,
          ...data,
        },
      });
    },
    [project, campaign],
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
        loading: "Sending you a test campaign",
        success: "Sent all project members a test campaign",
        error: "Could not send your campaign!",
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
        type={"info"}
        title={"Send campaign"}
        description={`Once you start sending this campaign to ${watch("recipients").length} contacts, you can no longer make changes or undo it.`}
      >
        <label htmlFor="campaign-delay" className="block text-sm font-medium text-neutral-700">
          Delay
        </label>
        <Dropdown
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
      </Modal>

      <Card
        title={campaign.status !== "DRAFT" ? "View campaign" : "Update campaign"}
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
            disabled={campaign.status !== "DRAFT"}
            label="Recipients"
            selectedContacts={campaign.recipients}
            selectedGroups={campaign.groups}
          />

          <ErrorAlert message={(errors.recipients as FieldError | undefined)?.message} />

          {campaign.status !== "DRAFT" &&
            (emails?.length === 0 ? (
              <div className={"flex items-center gap-6 rounded-sm border border-neutral-300 px-6 py-3 sm:col-span-6"}>
                <LoaderCircle size={20} className="animate-spin" />
                <div>
                  <h1 className={"text-lg font-semibold text-neutral-800"}>Hang on!</h1>
                  <p className={"text-sm text-neutral-600"}>We are still sending your campaign. Emails will start appearing here once they are sent.</p>
                </div>
              </div>
            ) : (
              <div className={"max-h-[400px] overflow-x-hidden overflow-y-scroll rounded-sm border border-neutral-200 sm:col-span-6"}>
                <Table
                  values={(emails ?? []).map((e: Email) => {
                    return {
                      Email: e.email,
                      Status: <Badge type={e.status === "DELIVERED" ? "info" : e.status === "OPENED" ? "success" : "danger"}>{e.status.at(0)?.toUpperCase() + e.status.slice(1).toLowerCase()}</Badge>,
                      View: (
                        <Link to={`/contacts/${e.contact}`}>
                          <Eye size={20} />
                        </Link>
                      ),
                    };
                  })}
                />
              </div>
            ))}

          <div className={"sm:col-span-6"}>
            <div className="h-[calc(100vh-550px)] min-h-[600px]">
              <div className="flex justify-between gap-2">
                <h2 className="text-lg font-semibold text-neutral-800">Preview</h2>
                {campaign.status === "DRAFT" && (
                  <BlackButton
                    onClick={(e) => {
                      e.preventDefault();
                      navigate(`/campaigns/${campaign.id}/edit`);
                    }}
                  >
                    <Edit size={18} />
                    Edit
                  </BlackButton>
                )}
              </div>

              <iframe srcDoc={campaign.body.html} className="w-full h-full" title={campaign.subject ?? "Campaign preview"} />
            </div>
            <ErrorAlert message={errors.body?.message} />
          </div>

          <div className={"ml-auto mt-6 sm:flex justify-end sm:gap-x-5 sm:col-span-6"}>
            {campaign.status === "DRAFT" ? (
              <>
                <BlackButton onClick={handleSubmit(sendTest)}>
                  <Send />
                  Send test to {project.name}'s members
                </BlackButton>
                <BlackButton
                  onClick={(e) => {
                    e.preventDefault();
                    setConfirmModal(true);
                  }}
                >
                  <Send />
                  Save & Send
                </BlackButton>
                <BlackButton>
                  <Save strokeWidth={1.5} size={18} />
                  Save
                </BlackButton>
              </>
            ) : null}
          </div>
        </form>
      </Card>
    </>
  );
}
