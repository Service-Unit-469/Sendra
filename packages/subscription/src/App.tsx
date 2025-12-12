import "../styles/index.css";

import { LoaderCircle } from "lucide-react";
import { lazy, useEffect } from "react";
import { useSubscriber } from "./lib/subscriber";

const ManageSubscriber = lazy(() => import("./ManageSubscriber"));

/**
 *
 */
export default function App() {
  const { subscriber, error, isLoading, updateSubscriber } = useSubscriber();

  useEffect(() => {
    document.title = "Manage your subscription preferences";
  }, []);

  if (isLoading || !subscriber) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="animate-spin" size={24} />
      </div>
    );
  }

  return <ManageSubscriber subscriber={subscriber} updateSubscriber={updateSubscriber} error={error} />;
}
