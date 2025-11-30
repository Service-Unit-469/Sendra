import type { IChangeEvent } from "@rjsf/core";
import Form from "@rjsf/core";
import type { FieldTemplateProps } from "@rjsf/utils";
import validator from "@rjsf/validator-ajv8";
import { useEffect, useState } from "react";
import { useCurrentProject } from "../../lib/hooks/projects";

export type SchemaDrivenFormProps = {
  formData: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
};

// Minimal Field Template - styling handled via CSS classes
function FieldTemplate(props: FieldTemplateProps) {
  const { id, classNames, style, label, help, required, description, errors, children } = props;
  const hasErrors = errors && typeof errors === "object" && "props" in errors;

  return (
    <div className={`mb-4 ${classNames}`} style={style}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {description && <p className="text-xs text-neutral-500 mb-2">{description}</p>}
      <div className="rjsf-field-input">{children}</div>
      {hasErrors && <div className="mt-1">{errors}</div>}
      {help && <p className="mt-1 text-xs text-neutral-500">{help}</p>}
    </div>
  );
}

export function SchemaDrivenForm({ formData, onChange }: SchemaDrivenFormProps) {
  const project = useCurrentProject();
  const [schema, setSchema] = useState<object | null>(null);

  useEffect(() => {
    const contactDataSchema = (project as { contactDataSchema?: string })?.contactDataSchema;
    if (contactDataSchema) {
      try {
        const parsed = JSON.parse(contactDataSchema);
        setSchema(parsed);
      } catch {
        setSchema(null);
      }
    } else {
      setSchema(null);
    }
  }, [project]);

  if (!schema) {
    return null;
  }

  const handleChange = (data: IChangeEvent<Record<string, unknown>, object>) => {
    onChange(data.formData || {});
  };

  return (
    <div className="col-span-2 rjsf-form-wrapper">
      <div className="space-y-4">
        <Form
          schema={schema}
          formData={formData}
          validator={validator}
          onChange={handleChange}
          liveValidate={false}
          showErrorList={false}
          templates={{
            FieldTemplate,
          }}
          uiSchema={{
            "ui:submitButtonOptions": {
              norender: true,
            },
          }}
        />
      </div>
    </div>
  );
}
