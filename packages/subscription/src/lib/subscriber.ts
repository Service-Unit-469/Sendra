import { type Subscriber, SubscriberSchema } from "@sendra/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

export function useSubscriber() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [subscriber, setSubscriber] = useState<Subscriber>();
  const email = useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get("email") ?? "";
  }, []);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams({ email });
      const res = await fetch(`${import.meta.env.VITE_API_URI}/subscriber?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load subscriber, invalid status ${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      setSubscriber(SubscriberSchema.parse(data));
    })()
      .catch((err) => setError(err))
      .finally(() => {
        setIsLoading(false);
      });
  }, [email]);

  const updateSubscriber = useCallback(
    async (
      subscriptions: {
        id: string;
        name: string;
        subscribed: boolean;
      }[],
    ) => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URI}/subscriber`, {
          method: "POST",
          body: JSON.stringify({
            email,
            subscriptions,
          }),
        });
        if (!res.ok) {
          throw new Error(`Failed to update subscriber, invalid status ${res.status}: ${res.statusText}`);
        }
        setSubscriber({
          email,
          subscriptions,
        });
      } catch (err) {
        setError(err as Error);
      }
    },
    [email],
  );

  return useMemo(() => ({ isLoading, error, subscriber, updateSubscriber }), [isLoading, error, subscriber, updateSubscriber]);
}
