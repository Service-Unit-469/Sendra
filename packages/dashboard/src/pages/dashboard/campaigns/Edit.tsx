import { zodResolver } from "@hookform/resolvers/zod";
import type { Fields } from "@measured/puck";
import type { CampaignUpdate } from "@sendra/shared";
import { CampaignSchemas } from "@sendra/shared";
import { Save } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import { ColorPickerRender } from "../../../components/EmailEditor/Fields";
import PuckEmailEditor from "../../../components/EmailEditor/PuckEmailEditor";
import QuickEmailEditor from "../../../components/EmailEditor/QuickEmailEditor";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useCampaign } from "../../../lib/hooks/campaigns";
import { useCurrentProject, useCurrentProjectIdentity } from "../../../lib/hooks/projects";
import { useTemplate } from "../../../lib/hooks/templates";
import { network } from "../../../lib/network";

/**
 *
 */
export default function EditCampaignPage() {
  const { id } = useParams<{ id: string }>();
  const project = useCurrentProject();
  const { data: campaign, mutate: campaignMutate } = useCampaign(id ?? "");
  const { data: projectIdentity } = useCurrentProjectIdentity();
  const { data: template } = useTemplate(campaign?.template ?? "");
  const navigate = useNavigate();

  const { setValue, getValues, reset } = useForm({
    resolver: zodResolver(CampaignSchemas.update.omit({ id: true, status: true, template: true, groups: true, recipients: true })),
    defaultValues: { body: undefined },
  });

  useEffect(() => {
    if (campaign) {
      reset(campaign);
    }
  }, [campaign, reset]);

  const fields = useMemo(() => {
    if (!projectIdentity) {
      return {};
    }
    if (!projectIdentity.identity?.verified) {
      return {
        title: {
          type: "text",
          label: "Subject",
        },
        preview: {
          type: "textarea",
          label: "Preview",
        },
        from: {
          type: "text",
          label: "From",
        },
        email: {
          type: "text",
          label: "Email",
        },
        backgroundColor: {
          type: "custom",
          label: "Background Color",
          render: ColorPickerRender,
        },
        style: {
          type: "textarea",
          label: "Style",
        },
      } as Fields;
    }
    return {
      title: {
        type: "text",
        label: "Subject",
      },
      preview: {
        type: "textarea",
        label: "Preview",
      },
      backgroundColor: {
        type: "custom",
        label: "Background Color",
        render: ColorPickerRender,
      },
      style: {
        type: "textarea",
        label: "Style",
      },
    } as Fields;
  }, [projectIdentity]);

  const saveCampaign = useCallback(
    async (data: Omit<CampaignUpdate, "id" | "template" | "status" | "recipients" | "groups">) => {
      if (data.email?.trim() === "") {
        delete data.email;
      }
      if (!project || !campaign) {
        return;
      }

      toast.promise(
        () =>
          network.fetch(`/projects/${project.id}/campaigns/${campaign.id}`, {
            method: "PUT",
            body: {
              ...data,
              id: campaign.id,
              recipients: campaign.recipients,
              template: campaign.template,
              status: campaign.status,
              groups: campaign.groups,
            },
          }),
        {
          loading: "Saving your campaign",
          success: () => {
            campaignMutate();
            navigate(`/campaigns/${campaign.id}`);
            return "Saved your campaign";
          },
          error: "Could not save your campaign!",
        },
      );
    },
    [project, campaign, campaignMutate, navigate],
  );

  if (!campaign || !template) {
    return <FullscreenLoader />;
  }

  // Render Quick Email Editor for quick email templates
  if (template.quickEmail) {
    return (
      <QuickEmailEditor
        template={template}
        initialCampaign={campaign}
        onChange={(value) => {
          setValue("body", value.body);
          setValue("subject", value.subject);
        }}
        actions={() => (
          <>
            <BlackButton onClick={() => saveCampaign(getValues())}>
              <Save strokeWidth={1.5} size={18} />
              Save
            </BlackButton>
            <button type="button" className="flex items-center gap-x-2 text-sm text-neutral-500" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
              Back
            </button>
          </>
        )}
      />
    );
  }

  // Render regular Email Editor for non-quick email templates
  return (
    <PuckEmailEditor
      initialData={JSON.parse(campaign.body.data)}
      onChange={(value) => {
        setValue("body", {
          ...value,
          data: JSON.stringify(value.data),
        });
      }}
      fields={fields}
      actions={() => (
        <>
          <BlackButton onClick={() => saveCampaign(getValues())}>
            <Save strokeWidth={1.5} size={18} />
            Save
          </BlackButton>
          <button type="button" className="flex items-center gap-x-2 text-sm text-neutral-500" onClick={() => navigate(`/campaigns/${campaign.id}`)}>
            Back
          </button>
        </>
      )}
    />
  );
}
