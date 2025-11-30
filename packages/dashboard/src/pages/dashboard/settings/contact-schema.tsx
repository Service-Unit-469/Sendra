import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BlackButton } from "../../../components/Buttons/BlackButton";
import Card from "../../../components/Card/Card";
import SettingTabs from "../../../components/Navigation/SettingTabs/SettingTabs";
import { useCurrentProject, useProjects } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

const exampleSchema = {
  type: "object",
  properties: {
    firstName: {
      type: "string",
      title: "First Name",
      minLength: 1,
    },
    lastName: {
      type: "string",
      title: "Last Name",
    },
    plan: {
      type: "string",
      enum: ["free", "premium", "enterprise"],
      title: "Plan",
    },
  },
  required: ["firstName", "lastName"],
};

/**
 *
 */
export default function ContactSchemaPage() {
  const project = useCurrentProject();
  const { mutate: projectsMutate } = useProjects();
  const [schemaText, setSchemaText] = useState("");

  useEffect(() => {
    const contactDataSchema = (project as { contactDataSchema?: string })?.contactDataSchema;
    if (contactDataSchema) {
      try {
        const parsed = JSON.parse(contactDataSchema);
        setSchemaText(JSON.stringify(parsed, null, 2));
      } catch {
        setSchemaText(contactDataSchema);
      }
    } else {
      setSchemaText(JSON.stringify(exampleSchema, null, 2));
    }
  }, [project]);

  const update = async () => {
    // Validate JSON before submitting
    let parsedSchema: object;
    try {
      parsedSchema = JSON.parse(schemaText);
    } catch (error) {
      console.error("Invalid JSON schema format", error);
      toast.error(`Invalid JSON schema format: ${(error as Error).message}`);
      return;
    }

    toast.promise(
      network.fetch(`/projects/${project.id}`, {
        method: "PUT",
        body: {
          id: project.id,
          name: project.name,
          url: project.url,
          colors: project.colors,
          contactDataSchema: JSON.stringify(parsedSchema),
        },
      }),
      {
        loading: "Updating contact data schema",
        success: "Updated contact data schema",
        error: "Could not update contact data schema",
      },
    );

    await projectsMutate();
  };

  return (
    <>
      <SettingTabs />
      <Card title="Contact Data Schema" description="Define the structure and validation rules for contact data">
        <div className="space-y-6">
          <div>
            <label htmlFor="schema" className="block text-sm font-medium text-neutral-700 mb-2">
              JSON Schema
            </label>
            <textarea
              id="schema"
              value={schemaText}
              onChange={(e) => setSchemaText(e.target.value)}
              className="block w-full rounded-sm border-neutral-300 font-mono text-sm transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800"
              rows={20}
              placeholder={JSON.stringify(exampleSchema, null, 2)}
            />
            <p className="mt-2 text-xs text-neutral-500">
              Define the JSON schema for contact data. This will be used to generate forms and validate contact data. See{" "}
              <a href="https://json-schema.org/learn/getting-started-step-by-step" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                JSON Schema documentation
              </a>{" "}
              for more information.
            </p>
          </div>
          <div className="flex justify-end">
            <BlackButton type="button" onClick={update}>
              Save Schema
            </BlackButton>
          </div>
        </div>
      </Card>
    </>
  );
}
