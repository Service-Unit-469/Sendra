import { v4 as randomUUID } from "uuid";
import { API_URI, TOKEN_KEY } from "./constants";

const getCorrelationId = () => {
  let correlationId = sessionStorage.getItem("correlationId");
  if (!correlationId) {
    correlationId = randomUUID();
    sessionStorage.setItem("correlationId", correlationId as string);
  }
  return correlationId;
};

export class network {
  /**
   * Fetcher function that includes body parsing support
   * @param method Request method
   * @param path Request endpoint or path
   * @param body Request body
   */
  public static async fetch<T, B>(
    path: string,
    init?: Omit<RequestInit, "body"> & {
      body?: B;
    },
  ): Promise<T> {
    const url = path.startsWith("http") ? path : API_URI + path;

    const token = localStorage.getItem(TOKEN_KEY);

    const body = init?.body ? JSON.stringify(init?.body) : undefined;

    const headers: Record<string, string> = init?.headers
      ? {
          ...(init.headers as Record<string, string>),
          "x-correlation-id": getCorrelationId(),
          "x-request-id": randomUUID(),
        }
      : {
          "x-correlation-id": getCorrelationId(),
          "x-request-id": randomUUID(),
        };
    const requestInit = {
      ...init,
      body,
      headers,
    };
    headers.Authorization = `Bearer ${token}`;
    const response = await fetch(url, requestInit);

    if (requestInit.method === "DELETE") {
      return undefined as unknown as T;
    }

    const res = await response.json();

    if (response.status >= 400) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      throw new Error(res?.message ?? res?.detail ?? "Something went wrong!");
    }

    return res;
  }
}
