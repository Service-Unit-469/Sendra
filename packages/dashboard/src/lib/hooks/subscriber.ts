import type { Subscriber } from "@sendra/shared";
import useSWR from "swr";

export function useSubscriber(email: string) {
  return useSWR<Subscriber>(`/subscriber?email=${email}`);
}
