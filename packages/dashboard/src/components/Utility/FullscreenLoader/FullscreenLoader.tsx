/**
 *
 */
import { LoaderCircle } from "lucide-react";
import { Suspense, useMemo } from "react";

const LOADING_MESSAGES = [
  "Warming up the email engines...",
  "Counting subscribers...",
  "Polishing campaigns...",
  "Checking for typos...",
  "Syncing contact lists...",
  "Teaching the servers to read your mind...",
  "Convincing pixels to load faster...",
  "Herding email subscribers...",
  "Caffeinating the database...",
];

export const RandomLoadingMessage = () => {
  return useMemo(() => LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)], []);
};

/**
 *
 */
export default function FullscreenLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 py-12 sm:px-6 lg:px-8">
      <div className="mt-8 flex flex-col items-center justify-center sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="mt-6">
          <LoaderCircle size={48} className="animate-spin" />
        </div>
        <h1 className="mt-3 text-center">Loading...</h1>
        <p className="text-center text-sm text-neutral-600">
          <Suspense fallback={null}>
            <RandomLoadingMessage />
          </Suspense>
        </p>
      </div>
    </div>
  );
}
