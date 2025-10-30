import type { ContactCreate } from "@sendra/shared";
import { Plus, Trash } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";

export type ContactMetadataFormProps = {
  initialData?: ContactCreate["data"];
  onDataChange?: (data: ContactCreate["data"]) => void;
  className?: string;
};

export function ContactMetadataForm({ initialData = {}, onDataChange, className = "" }: ContactMetadataFormProps) {
  const { register, control, watch } = useForm({
    defaultValues: {
      data: Object.entries(initialData).map(([key, value]) => ({
        value: { key, value },
      })),
    },
  });

  watch((data) => {
    const formattedData = data.data?.reduce(
      (acc, field) => {
        if (field?.value?.key && field?.value?.value) {
          acc[field.value.key] = field.value.value as string | number | boolean | string[] | null;
        }
        return acc;
      },
      {} as ContactCreate["data"],
    );

    onDataChange?.(formattedData ?? {});
  });

  const { fields, append: fieldAppend, remove: fieldRemove } = useFieldArray({ control, name: "data" });

  return (
    <div className={className}>
      <div className="grid sm:col-span-2">
        <div className="grid items-center gap-3 sm:grid-cols-9">
          <h5 className="block text-sm font-medium text-neutral-700 sm:col-span-8">Metadata</h5>
          <button
            onClick={(e) => {
              e.preventDefault();
              fieldAppend({ value: { key: "", value: "" } });
            }}
            className={
              "ml-auto flex w-full items-center justify-center gap-x-0.5 rounded border border-neutral-200 bg-white py-1 text-center text-sm text-neutral-700 transition ease-in-out hover:bg-neutral-50 sm:col-span-1"
            }
          >
            <Plus strokeWidth={1.5} size={18} />
            Add
          </button>
        </div>

        {fields.length > 0 ? (
          fields.map((field, index) => {
            return (
              <div key={field.id}>
                <div className="grid w-full grid-cols-9 items-end gap-3">
                  <div className="col-span-4">
                    <label className="text-xs font-light">
                      Key
                      <input
                        type={"text"}
                        placeholder={"Key"}
                        className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                        key={field.id}
                        {...register(`data.${index}.value.key`)}
                      />
                    </label>
                  </div>

                  <div className="col-span-4">
                    <label className="text-xs font-light">
                      Value
                      <input
                        type={"text"}
                        placeholder={"Value"}
                        className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                        key={field.id}
                        {...register(`data.${index}.value.value`)}
                      />
                    </label>
                  </div>
                  <button
                    className="col-span-1 flex h-10 items-center justify-center rounded bg-red-100 text-sm text-red-800 transition hover:bg-red-200"
                    aria-label="Remove field"
                    onClick={(e) => {
                      e.preventDefault();
                      fieldRemove(index);
                    }}
                  >
                    <Trash />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <p className={"text-sm text-neutral-500"}>No fields added</p>
        )}
      </div>
    </div>
  );
}
