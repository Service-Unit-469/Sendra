import type { Contact } from "@sendra/shared";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import Toggle from "../Toggle/Toggle";
import Filter from "./Filter";
import type { MetadataFilterGroupType } from "./types";

/**
 * Editor for the metadata filter
 * @param onChange Callback to call when the metadata filter changes
 * @param contacts Contacts to filter
 * @returns Editor for the metadata filter
 */
export default function MetadataFilterEditor({ onChange, contacts }: { onChange: (metadataFilter: MetadataFilterGroupType) => void; contacts: Contact[] }) {
  const [group, setGroup] = useState<MetadataFilterGroupType>({
    combination: "and",
    filters: [],
  });

  useEffect(() => {
    onChange(group);
  }, [group, onChange]);

  return (
    <>
      <div className={"sm:col-span-4"}>
        <Toggle
          title="All contacts with parameter"
          description={group.combination === "and" ? "match all filters" : "match at least one filter"}
          toggled={group.combination === "and"}
          onToggle={() => setGroup({ ...group, combination: group.combination === "and" ? "or" : "and" })}
        />
      </div>

      {group.filters.map((filter, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: Filters don't have unique IDs and order is stable
        <div className={"sm:col-span-4"} key={`filter-${index}`}>
          <Filter
            initialFilter={filter}
            onFilterChange={(filter) => setGroup({ ...group, filters: group.filters.map((f, i) => (i === index ? filter : f)) })}
            contacts={contacts}
            index={index}
            onFilterRemove={(index) => setGroup({ ...group, filters: group.filters.filter((_, i) => i !== index) })}
          />
        </div>
      ))}
      <div className={"sm:col-span-1"}>
        <button
          onClick={(e) => {
            e.preventDefault();
            setGroup({ ...group, filters: [...group.filters, { field: "", value: "", condition: "is" }] });
          }}
          className={
            "mt-6 flex items-center justify-center gap-x-1 rounded border border-neutral-300 bg-white px-8 py-1 text-center text-sm font-medium text-neutral-800 transition ease-in-out hover:bg-neutral-100"
          }
        >
          <Plus size={18} />
          Add filter
        </button>
      </div>
    </>
  );
}
