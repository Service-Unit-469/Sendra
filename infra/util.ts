import { router } from "./route";

export const getApiUrl = (): string | typeof router.url => {
  let apiUrl: string | typeof router.url = router.url;
  if (process.env.APP_URL && !process.env.APP_URL.includes("localhost")) {
    apiUrl = `${process.env.APP_URL}/api/v1`;
  }
  return apiUrl;
};
