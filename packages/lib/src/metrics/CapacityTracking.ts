import { AsyncLocalStorage } from "node:async_hooks";

export type RequestCapacityUsed = {
  used: number;
};

const requestCapacityStorage = new AsyncLocalStorage<RequestCapacityUsed>();

export const setRequestCapacityUsed = (requestCapacity: RequestCapacityUsed, done: () => Promise<unknown | undefined>) => {
  requestCapacityStorage.run(requestCapacity, done);
};

export const getRequestCapacityUsed = () => {
  const requestCapacityUsed = requestCapacityStorage.getStore();
  if (!requestCapacityUsed) {
    return {} as RequestCapacityUsed;
  }
  return requestCapacityUsed;
};

export const incrementRequestCapacityUsed = (used: number) => {
  const requestCapacityUsed = requestCapacityStorage.getStore();
  if (!requestCapacityUsed) {
    return;
  }
  requestCapacityUsed.used = requestCapacityUsed.used + used;
};
