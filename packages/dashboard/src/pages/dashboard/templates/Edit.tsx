"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import type { TemplateUpdate } from "@sendra/shared";
import { TemplateSchemas } from "@sendra/shared";
import { Copy, Save, Trash } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import { MenuButton } from "../../../components/Buttons/MenuButton";
import { EmailEditor } from "../../../components/EmailEditor";
import { Options } from "../../../components/Overlay/Options";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useCurrentProject } from "../../../lib/hooks/projects";
import { type TemplateFormValues, useTemplate, useTemplateFields, useTemplates } from "../../../lib/hooks/templates";
import { network } from "../../../lib/network";

export default function EditTemplatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const project = useCurrentProject();
  const { mutate } = useTemplates();
  const { data: template } = useTemplate(id ?? "");
  const { watch, setValue, reset, setError, clearErrors } = useForm({
    resolver: zodResolver(TemplateSchemas.update),
    defaultValues: {
      body: undefined,
    },
  });

  useEffect(() => {
    if (!template) {
      return;
    }

    reset(template);
  }, [reset, template]);

  useEffect(() => {
    watch((value, { name }) => {
      if (name === "email") {
        if (value.email && project.email && !value.email.endsWith(project.email.split("@")[1])) {
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

  const fields = useTemplateFields();

  // Memoize initialData to prevent editor reset on template refetch
  const initialData = useMemo(() => {
    if (!template?.body?.data) {
      return undefined;
    }
    try {
      return JSON.parse(template.body.data);
    } catch {
      return undefined;
    }
  }, [template?.body?.data]);

  if (!template || (watch("body") as object | undefined) === undefined || !initialData) {
    return <FullscreenLoader />;
  }

  const update = (data: Omit<TemplateUpdate, "id">) => {
    if (data.email?.trim() === "") {
      delete data.email;
    }

    toast.promise(
      network.fetch(`/projects/${project.id}/templates/${template.id}`, {
        method: "PUT",
        body: {
          id: template.id,
          ...data,
        },
      }),
      {
        loading: "Saving your template",
        success: () => {
          void mutate();

          return "Saved your template";
        },
        error: "Could not save your template!",
      },
    );
  };

  const duplicate = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    toast.promise(
      network.fetch(`/projects/${project.id}/templates`, {
        method: "POST",
        body: {
          ...template,
          id: undefined,
        },
      }),
      {
        loading: "Duplicating your template",
        success: () => {
          void mutate();
          return "Duplicated your template";
        },
        error: "Could not duplicate your template!",
      },
    );

    navigate("/dashboard/templates");
  };

  const remove = async (e: { preventDefault: () => void }) => {
    e.preventDefault();

    if (template._embed.actions.length > 0) {
      return toast.error("You cannot delete a template that is linked to an action!");
    }

    toast.promise(
      network.fetch(`/projects/${project.id}/templates/${template.id}`, {
        method: "DELETE",
      }),
      {
        loading: "Deleting your template",
        success: () => {
          void mutate();
          return "Deleted your template";
        },
        error: (err) => {
          console.error("Failed to delete template", err);
          return "Could not delete your template!";
        },
      },
    );

    navigate("/dashboard/templates");
  };

  return (
    <EmailEditor
      initialData={initialData}
      fields={fields}
      onChange={(value) => {
        setValue("body", {
          ...value,
          data: JSON.stringify(value.data),
        });
        const props = (value.data.root?.props ?? {}) as TemplateFormValues;
        setValue("subject", props.title ?? "");
        setValue("email", props.email ?? undefined);
        setValue("from", props.from ?? undefined);
        setValue("templateType", props.templateType ?? "MARKETING");
        setValue("quickEmail", props.quickEmail === "true");
      }}
      actions={() => (
        <>
          <BlackButton
            onClick={() =>
              update({
                subject: watch("subject"),
                email: watch("email"),
                from: watch("from"),
                body: {
                  data: watch("body").data,
                  html: watch("body").html,
                  plainText: watch("body").plainText,
                },
                templateType: watch("templateType") as "MARKETING" | "TRANSACTIONAL",
                quickEmail: watch("quickEmail") ?? false,
              })
            }
          >
            <Save strokeWidth={1.5} size={18} />
            Save
          </BlackButton>
          <Options
            options={
              <>
                <MenuButton onClick={(e) => duplicate(e)}>
                  <Copy strokeWidth={1.5} size={18} />
                  Duplicate
                </MenuButton>
                <MenuButton onClick={(e) => remove(e)}>
                  <Trash strokeWidth={1.5} size={18} />
                  Delete
                </MenuButton>
              </>
            }
          />
        </>
      )}
    />
  );
}
