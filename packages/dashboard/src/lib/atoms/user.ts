import type { UserGet } from "@service-unit-469/sendra-shared";
import { atom } from "jotai";

export type LoginStatus = "logged-in" | "logged-out" | "loading";

export const atomUser = atom<UserGet | null>(null);
export const atomLoginStatus = atom<LoginStatus>("loading");
