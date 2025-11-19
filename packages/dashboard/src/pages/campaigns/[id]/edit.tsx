import { zodResolver } from "@hookform/resolvers/zod";
import type { Fields } from "@measured/puck";
import type { CampaignUpdate } from "@sendra/shared";
import { CampaignSchemas } from "@sendra/shared";
import { ColorPickerRender } from "dashboard/src/components/EmailEditor/Fields";
import { Save } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import { EmailEditor } from "../../../components/EmailEditor";
import QuickEmailEditor from "../../../components/EmailEditor/QuickEmailEditor";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { Dashboard } from "../../../layouts";
import { useCampaign } from "../../../lib/hooks/campaigns";
import { useActiveProject, useActiveProjectIdentity } from "../../../lib/hooks/projects";
import { useTemplate } from "../../../lib/hooks/templates";
import { network } from "../../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();
  const project = useActiveProject();
  const { data: campaign, mutate: campaignMutate } = useCampaign(router.query.id as string);
  const { data: projectIdentity } = useActiveProjectIdentity();
  const { data: template } = useTemplate(campaign?.template ?? "");
  const [quickBodyContent, setQuickBodyContent] = useState<string>("");

  const { setValue, watch, reset } = useForm({
    resolver: zodResolver(CampaignSchemas.update.omit({ id: true, status: true, template: true, groups: true, recipients: true })),
    defaultValues: { body: undefined },
  });

  // Extract quick email content from campaign body if it's a quick email
  useEffect(() => {
    if (campaign && template?.quickEmail) {
      try {
        const bodyData = JSON.parse(campaign.body.data);
        if (bodyData.quickBody) {
          setQuickBodyContent(bodyData.quickBody);
        }
      } catch (error) {
        console.error("Failed to parse campaign body data", error);
      }
    }
    if (campaign) {
      reset(campaign);
    }
  }, [campaign, template, reset]);

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
              id: campaign.id,
              ...data,
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
            router.push(`/campaigns/${campaign.id}`);
            return "Saved your campaign";
          },
          error: "Could not save your campaign!",
        },
      );
    },
    [project, campaign, campaignMutate, router],
  );

  if (!router.isReady || !project || !campaign || !template) {
    return <FullscreenLoader />;
  }

  // Render Quick Email Editor for quick email templates
  if (template.quickEmail) {
    return (
      <Dashboard wideLayout={true}>
        <QuickEmailEditor
          templateHtml={template.body.html}
          templatePlainText={template.body.plainText}
          initialContent={quickBodyContent}
          onChange={(value) => {
            setValue("body", {
              data: value.data,
              html: value.html,
              plainText: value.plainText,
            });
          }}
          actions={() => (
            <>
              <BlackButton
                onClick={() =>
                  saveCampaign({
                    subject: watch("subject") ?? "",
                    email: watch("email") ?? undefined,
                    from: watch("from") ?? undefined,
                    body: {
                      data: watch("body")?.data ?? "",
                      html: watch("body")?.html ?? "",
                      plainText: watch("body")?.plainText ?? undefined,
                    },
                  })
                }
              >
                <Save strokeWidth={1.5} size={18} />
                Save
              </BlackButton>
              <button type="button" className="flex items-center gap-x-2 text-sm text-neutral-500" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                Back
              </button>
            </>
          )}
        />
      </Dashboard>
    );
  }

  // Render regular Email Editor for non-quick email templates
  return (
    <Dashboard wideLayout={true}>
      <EmailEditor
        fields={fields}
        actions={() => (
          <>
            <BlackButton
              onClick={() =>
                saveCampaign({
                  subject: watch("subject") ?? "",
                  email: watch("email") ?? undefined,
                  from: watch("from") ?? undefined,
                  body: {
                    data: watch("body")?.data ?? "",
                    html: watch("body")?.html ?? "",
                    plainText: watch("body")?.plainText ?? undefined,
                  },
                })
              }
            >
              <Save strokeWidth={1.5} size={18} />
              Save
            </BlackButton>
            <button type="button" className="flex items-center gap-x-2 text-sm text-neutral-500" onClick={() => router.push(`/campaigns/${campaign.id}`)}>
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
          setValue("email", props.email ?? undefined);
          setValue("from", props.from ?? undefined);
        }}
      />
    </Dashboard>
  );
}
