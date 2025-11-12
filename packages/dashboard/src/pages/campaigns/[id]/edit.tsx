import { zodResolver } from "@hookform/resolvers/zod";
import type { Fields } from "@measured/puck";
import type { CampaignUpdate } from "@sendra/shared";
import { CampaignSchemas } from "@sendra/shared";
import { ColorPickerRender } from "dashboard/src/components/EmailEditor/Fields";
import { ArrowLeft, Save } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import { EmailEditor } from "../../../components/EmailEditor";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { Dashboard } from "../../../layouts";
import { useCampaign } from "../../../lib/hooks/campaigns";
import { useActiveProject, useActiveProjectIdentity } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();
  const project = useActiveProject();
  const { data: campaign, mutate: campaignMutate } = useCampaign(router.query.id as string);
  const { data: projectIdentity } = useActiveProjectIdentity();

  const { watch, setValue, handleSubmit } = useForm({
    resolver: zodResolver(CampaignSchemas.update.omit({ id: true })),
    defaultValues: { recipients: [], body: undefined },
  });

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
      campaignMutate();
      router.push(`/campaigns/${campaign.id}`);
    },
    [project, campaign, campaignMutate, router],
  );

  if (!router.isReady) {
    return <FullscreenLoader />;
  }

  if (!project || !campaign || (watch("body") as object | undefined) === undefined) {
    return <FullscreenLoader />;
  }

  return (
    <Dashboard wideLayout={true}>
      <EmailEditor
        fields={fields}
        actions={() => (
          <>
            <BlackButton onClick={handleSubmit(saveCampaign)}>
              <Save strokeWidth={1.5} size={18} />
              Save
            </BlackButton>
            <button type="button" className="flex items-center gap-x-2 text-sm text-neutral-500" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
              <ArrowLeft strokeWidth={1.5} size={18} />
              Back
            </button>
          </>
        )}
        initialData={JSON.parse(campaign.body.data)}
        onChange={(value) => {
          setValue("body", {
            ...value,
            data: JSON.stringify(value.data),
          });
          const props = (value.data.root?.props ?? {}) as { title?: string; email?: string; from?: string };
          setValue("subject", props.title ?? "");
          setValue("email", props.email ?? "");
          setValue("from", props.from ?? "");
        }}
      />
    </Dashboard>
  );
}
