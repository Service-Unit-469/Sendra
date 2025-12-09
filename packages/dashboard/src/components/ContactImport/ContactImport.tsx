import type { EventTrack } from "@sendra/shared";
import { LoaderCircle } from "lucide-react";
import pMap from "p-map";
import Papa from "papaparse";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { network } from "../../lib/network";
import { BlackButton } from "../Buttons/BlackButton";
import { SecondaryButton } from "../Buttons/SecondaryButton";

type ImportError = {
  email?: string;
  error: string;
};

type ImportResult = {
  success: number;
  failed: number;
  errors: Array<ImportError>;
};

export type ContactImportProps = {
  projectId: string;
  onClose: () => void;
};

const normalizeColumnName = (name: string): string => {
  return name.toLowerCase().trim();
};

const parseSubscribed = (value: string): boolean | undefined => {
  if (!value) {
    return undefined;
  }
  const normalized = value.toLowerCase().trim();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return undefined;
};

export function ContactImport({ projectId, onClose }: ContactImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [toImport, setToImport] = useState<EventTrack[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);

  const abortController = useMemo(() => new AbortController(), []);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setToImport([]);
    setImportResult(null);
    setIsCompleted(false);

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      if (file.type !== "text/csv") {
        throw new Error("Please select a CSV file");
      }
      const text = await file.text();

      const parseResult = Papa.parse<Record<string, string>>(text, {
        header: true,
      });

      if (parseResult.errors.length > 0) {
        throw new Error(parseResult.errors[0].message);
      }

      const rows = parseResult.data;

      // Find email column (required)
      const emailColumn = Object.keys(rows[0] || {}).find((col) => normalizeColumnName(col) === "email");

      if (!emailColumn || rows.some((row) => !row[emailColumn])) {
        throw new Error("CSV must contain an 'email' column");
      }
      const subscribedColumn = Object.keys(rows[0] || {}).find((col) => normalizeColumnName(col) === "subscribed");

      setToImport(
        rows.map((row) => {
          const email = row[emailColumn].trim();
          const data: Record<string, string | number | boolean | string[] | null> = {};
          Object.keys(row).forEach((key) => {
            if (key !== emailColumn && key !== subscribedColumn && row[key]) {
              const value = row[key].trim();
              // Try to parse as number or boolean, otherwise keep as string
              if (value === "true" || value === "false") {
                data[key] = value === "true";
              } else if (!Number.isNaN(Number(value)) && value !== "") {
                data[key] = Number(value);
              } else {
                data[key] = value;
              }
            }
          });
          return {
            email,
            subscribed: subscribedColumn ? parseSubscribed(row[subscribedColumn]) : undefined,
            event: "import",
            data,
          };
        }),
      );
    } catch (error) {
      toast.error(`Failed to parse CSV file: ${error instanceof Error ? error.message : "Unknown error"}`);
      setToImport([]);
      setImportResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, []);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setImportResult({
      success: 0,
      failed: 0,
      errors: [],
    });

    pMap(
      toImport,
      (track) =>
        network
          .fetch(`/projects/${projectId}/track`, {
            method: "POST",
            body: track,
          })
          .then(() => {
            setImportResult((prev) => (prev ? { ...prev, success: prev.success + 1 } : null));
          })
          .catch((error) => {
            setImportResult((prev) =>
              prev ? { ...prev, failed: prev.failed + 1, errors: [...prev.errors, { email: track.email, error: error instanceof Error ? error.message : "Unknown error" }] } : null,
            );
          }),
      { concurrency: 2, signal: abortController.signal },
    ).finally(() => {
      setIsImporting(false);
      setToImport([]);
      setIsCompleted(true);
    });
  }, [projectId, toImport, abortController]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="csv-file" className="block text-sm font-medium text-neutral-800 mb-2">
          Import contacts from CSV
        </label>
        <p className="text-sm text-neutral-600 mb-4">
          Your CSV file must include an <code className="px-1 py-0.5 bg-neutral-100 rounded text-xs">email</code> column. Optional columns include{" "}
          <code className="px-1 py-0.5 bg-neutral-100 rounded text-xs">subscribed</code> (true/false) and any custom data fields.
        </p>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            disabled={isImporting}
            className="block w-full text-sm text-neutral-700 file:mr-4 file:py-2 file:px-4 file:rounded-sm file:border-0 file:text-sm file:font-medium file:bg-neutral-800 file:text-white hover:file:bg-neutral-900 file:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {toImport.length > 0 && !isImporting && (
        <div className="text-sm text-neutral-600">
          <p>CSV parsed successfully. Found {toImport.length} contacts to import. Click "Import" to continue.</p>
        </div>
      )}

      {isImporting && (
        <div className="text-sm text-neutral-600">
          <p>
            Importing contacts {importResult?.success} of {toImport.length}
          </p>
        </div>
      )}

      {importResult && (
        <div className="space-y-2">
          <div className="text-sm">{importResult.failed > 0 && <p className="text-red-600">✗ Failed: {importResult.failed}</p>}</div>
          {importResult.errors.length > 0 && importResult.errors.length <= 10 && (
            <div className="text-xs text-neutral-600 space-y-1">
              <p className="font-medium">Errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {importResult.errors.map((error, index) => (
                  <li key={error.email ?? index}>
                    {error.email && ` (${error.email})`}: {error.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {importResult.errors.length > 10 && (
            <div className="text-xs text-neutral-600">
              <p>First 10 errors shown. Total errors: {importResult.errors.length}</p>
            </div>
          )}
        </div>
      )}
      <div className="mt-5 flex flex-row-reverse gap-3">
        {!isCompleted && (
          <>
            <BlackButton type="button" disabled={isImporting || toImport.length === 0} onClick={handleImport}>
              {isImporting && <LoaderCircle className="animate-spin" size={18} />}
              {!isImporting && "Import"}
            </BlackButton>
            <SecondaryButton
              type="button"
              onClick={() => {
                abortController.abort();
                onClose();
              }}
            >
              Cancel
            </SecondaryButton>
          </>
        )}
        {isCompleted && (
          <BlackButton type="button" onClick={onClose}>
            Close
          </BlackButton>
        )}
      </div>
    </div>
  );
}
