const apiUrlEnv = import.meta.env.VITE_API_URI ?? "http://localhost:4000";
let apiUrl = apiUrlEnv;
if (apiUrl.endsWith("/")) {
  apiUrl = apiUrl.slice(0, -1);
}

export const API_URI = apiUrl;
export const AWS_REGION = import.meta.env.VITE_AWS_REGION;

export const TOKEN_KEY = "sendra.token";

export const NO_AUTH_ROUTES = ["/auth/signup", "/auth/login", "/auth/reset", "/subscription", "/auth/verify", "/auth/forgot-password"];
