import type { Subscriber, SubscriberUpdate } from "@sendra/shared";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FullscreenLoader, Toggle } from "../../components";
import { useSubscriber } from "../../lib/hooks/subscriber";
import { network } from "../../lib/network";
import Head from "next/head";

/**
 *
 */
export default function Index() {
  const router = useRouter();

  const { data: subscriber, error, mutate } = useSubscriber(router.query.email as string);
  const [submitted, setSubmitted] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Subscriber["subscriptions"]>([]);

  useEffect(() => {
    if (subscriber) {
      setSubscriptions(subscriber.subscriptions.sort((a, b) => a.name.localeCompare(b.name)));
    }
  }, [subscriber]);

  if (!router.isReady) {
    return <FullscreenLoader />;
  }

  if (!subscriber && !error) {
    return <FullscreenLoader />;
  }

  const update = () => {
    if (!subscriber) {
      return;
    }
    setSubmitted(true);
    toast.promise(
      network.fetch<never, SubscriberUpdate>("/subscriber", {
        method: "POST",
        body: {
          email: subscriber.email,
          subscriptions: subscriptions,
        },
      }),
      {
        loading: "Updating your preferences",
        success: () => {
          void mutate();
          setSubmitted(false);
          return "Updated your preferences";
        },
        error: () => {
          setSubmitted(false);
          return "Could not update your preferences!";
        },
      },
    );
  };

  return (
    <>
      <Head>
        <title>Manage your subscription preferences</title>
      </Head>
      <div className={"flex h-screen w-full flex-col items-center justify-center bg-neutral-50"}>
        <div className={"w-3/4 rounded border border-neutral-200 bg-white p-12 shadow-sm md:w-2/4 xl:w-2/6"}>
          {error && (
            <div className={"text-center text-sm text-neutral-500"}>
              <p>No subscriber found</p>
            </div>
          )}
          {subscriber && (
            <>
              <h1 className={"text-center text-2xl font-bold leading-tight text-neutral-800"}>Your Subscriptions</h1>
              <div className={"my-8 text-center text-sm text-neutral-500 flex flex-col gap-y-2"}>
                {subscriptions.map((subscription) => (
                  <div key={subscription.id}>
                    <Toggle
                      toggled={subscription.subscribed}
                      onToggle={() => setSubscriptions(subscriptions.map((s) => (s.id === subscription.id ? { ...s, subscribed: !s.subscribed } : s)))}
                      title={subscription.name}
                      description={`You will ${subscription.subscribed ? "receive" : "not receive"} emails from ${subscription.name}`}
                      disabled={submitted}
                    />
                  </div>
                ))}
              </div>
              <div className="relative mt-2 w-full">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={update}
                  className={"mt-5 flex w-full items-center justify-center rounded bg-neutral-800 py-2.5 text-sm font-medium text-white"}
                >
                  {submitted ? (
                    <svg className="-ml-1 mr-3 h-6 w-6 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    "Update Subscriptions"
                  )}
                </motion.button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
