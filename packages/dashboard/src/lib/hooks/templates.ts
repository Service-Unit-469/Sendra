import type { Fields } from "@measured/puck";
import type { Action, Template, TemplateCreate } from "@sendra/shared";
import { useMemo } from "react";
import useSWR from "swr";
import { ColorPickerRender } from "../../components/EmailEditor/Fields";
import { useCurrentProject, useCurrentProjectIdentity } from "./projects";

export type TemplateWithActions = Template & {
  _embed: { actions: Action[] };
  quickEmail?: boolean;
};

/**
 *
 * @param id
 */
export function useTemplate(id: string) {
  const currentProject = useCurrentProject();
  return useSWR<TemplateWithActions>(`/projects/${currentProject.id}/templates/${id}?embed=actions`);
}

/**
 *
 */
export function useTemplates() {
  const currentProject = useCurrentProject();

  return useSWR<TemplateWithActions[]>(`/projects/${currentProject.id}/templates/all?embed=actions`);
}

export type TemplateFormValues = Partial<Omit<TemplateCreate, "body" | "subject" | "quickEmail">> & { title?: string; quickEmail: string };

export function useTemplateFields(): Fields {
  const { data: projectIdentity } = useCurrentProjectIdentity();
  return useMemo(() => {
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
        templateType: {
          type: "select",
          label: "Template Type",
          options: [
            { label: "Marketing", value: "MARKETING" },
            { label: "Transactional", value: "TRANSACTIONAL" },
          ],
        },
        quickEmail: {
          type: "select",
          label: "Quick Email Template",
          options: [
            { label: "Yes", value: "true" },
            { label: "No", value: "false" },
          ],
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
      templateType: {
        type: "select",
        label: "Template Type",
        options: [
          { label: "Marketing", value: "MARKETING" },
          { label: "Transactional", value: "TRANSACTIONAL" },
        ],
      },
      quickEmail: {
        type: "select",
        label: "Quick Email Template",
        options: [
          { label: "Yes", value: "true" },
          { label: "No", value: "false" },
        ],
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
}
