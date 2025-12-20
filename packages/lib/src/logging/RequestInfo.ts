import { AsyncLocalStorage } from "node:async_hooks";

export type RequestInfo = {
  correlationId: string;
  requestId: string;
};

const requestInfoStorage = new AsyncLocalStorage<RequestInfo>();

export const setRequestInfo = (requestInfo: RequestInfo, done: () => Promise<unknown | undefined>) => {
  requestInfoStorage.run(requestInfo, done);
};

export const getRequestInfo = () => {
  const requestInfo = requestInfoStorage.getStore();
  if (!requestInfo) {
    return {} as RequestInfo;
  }
  return requestInfo;
};
