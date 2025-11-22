import type { PublicProject } from "@sendra/shared";
import { atom } from "jotai";

export const atomActiveProjectId = atom<string | null>(typeof window !== "undefined" ? (window.localStorage.getItem("project") ?? null) : null);
export const atomCurrentProject = atom<PublicProject | null>(null);
