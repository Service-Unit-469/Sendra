import { api } from "./api";

export const getApiUrl = (): string | typeof api.url => {
  let apiUrl: string | typeof api.url = api.url;
  if (process.env.APP_URL && !process.env.APP_URL.includes("localhost")) {
    console.log("APP_URL", process.env.APP_URL);
    apiUrl = `${process.env.APP_URL}/api/v1`;
  }
  return apiUrl;
};
