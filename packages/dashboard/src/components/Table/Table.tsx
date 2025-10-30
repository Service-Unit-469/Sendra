import { Check, X } from "lucide-react";
import type React from "react";

export interface TableProps {
  values: {
    [key: string]: string | number | boolean | React.ReactNode | null;
  }[];
}

/**
 * @param root0
 * @param root0.values
 */
export default function Table({ values }: TableProps) {
  if (values.length === 0) {
    return <h1>No values provided</h1>;
  }

  return (
    <div className="flex flex-col">
      <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded border border-neutral-200">
            <table className="min-w-full">
              <thead className="bg-neutral-50">
                <tr>
                  {Object.keys(values[0]).map((header) => {
                    return (
                      <th key={header} scope="col" className={`${typeof values[0][header] === "boolean" ? "text-center" : "text-left"} px-6 py-3 text-xs font-medium text-neutral-800`}>
                        {header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {values.map((row, rowIndex) => {
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: Table rows don't have unique IDs and order is stable
                    <tr key={rowIndex} className={"border-t border-neutral-100 bg-white transition ease-in-out hover:bg-neutral-50"}>
                      {Object.entries(row).map((value) => {
                        if (value[1] === null || value[1] === undefined) {
                          return <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">Not specified</td>;
                        }

                        if (typeof value[1] === "boolean") {
                          return <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500">{value[1] ? <Check size={18} /> : <X size={18} />}</td>;
                        }
                        return (
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-500" key={`${value[0]}-${value[1]}`}>
                            {value[1]}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
