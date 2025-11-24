import "../styles/index.css";

import type { Subscriber } from "@sendra/shared";
import { motion } from "framer-motion";
import { LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { useSubscriber } from "./lib/subscriber";

/**
 *
 */
export default function App() {
  const { subscriber, error, updateSubscriber, isLoading } = useSubscriber();
  const [submitted, setSubmitted] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscriber["subscriptions"]>([]);

  useEffect(() => {
    if (subscriber) {
      setSubscriptions(subscriber.subscriptions.sort((a, b) => a.name.localeCompare(b.name)));
    }
  }, [subscriber]);

  useEffect(() => {
    document.title = "Manage your subscription preferences";
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <LoaderCircle className="animate-spin" size={24} />
      </div>
    );
  }

  const update = () => {
    if (!subscriber) {
      return;
    }
    setSubmitted(true);
    toast.promise(() => updateSubscriber(subscriptions), {
      loading: "Updating your preferences",
      success: () => {
        setSubmitted(false);
        return "Updated your preferences";
      },
      error: () => {
        setSubmitted(false);
        return "Could not update your preferences!";
      },
    });
  };

  return (
    <div className={"flex h-screen w-full flex-col items-center justify-center bg-neutral-50"}>
      <Toaster position="bottom-right" />
      <div className={"w-3/4 rounded-sm border border-neutral-200 bg-white p-12 shadow-xs md:w-2/4 xl:w-2/6"}>
        {error && (
          <div className={"text-center text-sm text-neutral-500"}>
            <p>Unable to load your subscriptions</p>
            <p>{error.message}</p>
          </div>
        )}
        {subscriber && (
          <>
            <h1 className={"text-center text-2xl font-bold leading-tight text-neutral-800"}>Your Subscriptions</h1>
            <div className={"my-8 text-center text-sm text-neutral-500 flex flex-col gap-y-2"}>
              {subscriptions.map((subscription) => (
                <div key={subscription.id}>
                  <label htmlFor={subscription.id}>
                    <span className="text-sm font-medium text-neutral-800">{subscription.name}</span>
                    <input
                      className="ml-2 border-neutral-300 text-neutral-600 focus:ring-neutral-800"
                      id={subscription.id}
                      type="checkbox"
                      checked={subscription.subscribed}
                      onChange={() => setSubscriptions(subscriptions.map((s) => (s.id === subscription.id ? { ...s, subscribed: !s.subscribed } : s)))}
                    />
                    <br />
                    <span className="ml-2 text-sm text-neutral-500">
                      You will {subscription.subscribed ? "receive" : "not receive"} emails from {subscription.name}
                    </span>
                  </label>
                </div>
              ))}
            </div>
            <div className="relative mt-2 w-full">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                onClick={update}
                className={"mt-5 flex w-full items-center justify-center rounded-sm bg-neutral-800 py-2.5 text-sm font-medium text-white"}
              >
                {submitted ? <LoaderCircle className="animate-spin" size={18} /> : "Update Subscriptions"}
              </motion.button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
