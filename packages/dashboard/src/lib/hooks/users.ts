import type { UserGet } from "@sendra/shared";
import { useAtom } from "jotai";
import { useEffect } from "react";
import useSWR from "swr";
import { atomLoginStatus, atomUser } from "../atoms/user";

/**
 * Fetch the current user.
 * @returns The user data result from the API.
 */
export const useFetchUser = () => {
  const [, setUser] = useAtom(atomUser);
  const [, setLoginStatus] = useAtom(atomLoginStatus);
  const res = useSWR<UserGet>("/@me", {
    shouldRetryOnError: false,
  });
  useEffect(() => {
    setLoginStatus(res.isLoading ? "loading" : res.data ? "logged-in" : "logged-out");
    setUser(res.data ?? null);
  }, [res, setUser, setLoginStatus]);
  return res;
};

/**
 * @returns The login status of the user
 */
export const useLoginStatus = () => {
  const [loginStatus] = useAtom(atomLoginStatus);
  return loginStatus;
};

/**
 * @returns The current user. Throws an error if the user is not authenticated.
 */
export function useUser() {
  const [user] = useAtom(atomUser);
  if (!user) {
    throw new Error("User not authenticated");
  }
  return user;
}
