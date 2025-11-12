import type { Fields } from "@measured/puck";
import type { Action, Template, TemplateCreate } from "@sendra/shared";
import { ColorPickerRender } from "dashboard/src/components/EmailEditor/Fields";
import { useMemo } from "react";
import useSWR from "swr";
import { useActiveProject, useActiveProjectIdentity } from "./projects";

export type TemplateWithActions = Template & {
  _embed: { actions: Action[] };
};

/**
 *
 * @param id
 */
export function useTemplate(id: string) {
  const activeProject = useActiveProject();
  return useSWR<TemplateWithActions>(activeProject ? `/projects/${activeProject.id}/templates/${id}?embed=actions` : null);
}

/**
 *
 */
export function useTemplates() {
  const activeProject = useActiveProject();

  return useSWR<TemplateWithActions[]>(activeProject ? `/projects/${activeProject.id}/templates/all?embed=actions` : null);
}

export type TemplateFormValues = Partial<Omit<TemplateCreate, "body" | "subject">> & { title?: string };

export function useTemplateFields(): Fields {
  const { data: projectIdentity } = useActiveProjectIdentity();
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
