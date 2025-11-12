import { zodResolver } from "@hookform/resolvers/zod";
import type { Data, DefaultComponents } from "@measured/puck";
import type { TemplateCreate } from "@sendra/shared";
import { TemplateSchemas } from "@sendra/shared";
import { BlackButton } from "dashboard/src/components/Buttons/BlackButton";
import { EmailEditor } from "dashboard/src/components/EmailEditor";
import { Save } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { initialEmailData } from "../../components/EmailEditor/config";
import FullscreenLoader from "../../components/Utility/FullscreenLoader/FullscreenLoader";
import { Dashboard } from "../../layouts";
import { useActiveProject, useActiveProjectIdentity } from "../../lib/hooks/projects";
import { type TemplateFormValues, useTemplateFields, useTemplates } from "../../lib/hooks/templates";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();

  const project = useActiveProject();
  const { mutate } = useTemplates();

  const { watch, setValue, setError, clearErrors } = useForm({
    resolver: zodResolver(TemplateSchemas.create),
    defaultValues: {
      templateType: "MARKETING" as const,
      subject: "",
      body: {
        data: JSON.stringify({}),
        html: "",
        plainText: "",
      },
      quickEmail: false,
    },
  });
  const { data: projectIdentity } = useActiveProjectIdentity();

  const fields = useTemplateFields();

  const initialData: Data = useMemo(() => {
    if (!projectIdentity || !project) {
      return { root: {}, content: [] };
    }
    const data: Data<DefaultComponents, TemplateFormValues> = { ...initialEmailData };
    data.root.props = {
      ...data.root.props,
      email: projectIdentity.identity?.verified ? project.email : undefined,
      from: projectIdentity.identity?.verified ? project.from : undefined,
      templateType: "MARKETING",
      quickEmail: "false",
    };
    return data;
  }, [projectIdentity, project]);

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

  if (!project || !projectIdentity) {
    return <FullscreenLoader />;
  }

  const create = async (data: TemplateCreate) => {
    toast.promise(network.fetch(`/projects/${project.id}/templates`, { method: "POST", body: data }), {
      loading: "Creating new template",
      success: () => {
        void mutate();

        router.push("/templates");
        return "Created new template!";
      },
      error: "Could not create new template!",
    });
  };

  return (
    <Dashboard wideLayout={true}>
      <EmailEditor
        initialData={initialData}
        fields={fields}
        onChange={(value) => {
          setValue("body", {
            data: JSON.stringify(value.data),
            html: value.html,
            plainText: value.plainText,
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
                create({
                  templateType: watch("templateType") as "MARKETING" | "TRANSACTIONAL",
                  subject: watch("subject"),
                  email: watch("email"),
                  from: watch("from"),
                  body: {
                    data: watch("body").data,
                    html: watch("body").html,
                    plainText: watch("body").plainText,
                  },
                  quickEmail: watch("quickEmail") ?? false,
                })
              }
            >
              <Save strokeWidth={1.5} size={18} />
              Create
            </BlackButton>
          </>
        )}
      />
    </Dashboard>
  );
}
