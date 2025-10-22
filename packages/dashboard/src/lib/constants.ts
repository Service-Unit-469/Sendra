let apiUrl = process.env.NEXT_PUBLIC_API_URI ?? "http://localhost:4000";
if (apiUrl.endsWith("/")) {
  apiUrl = apiUrl.slice(0, -1);
}

export const API_URI = apiUrl;
export const AWS_REGION = process.env.NEXT_PUBLIC_AWS_REGION;

export const TOKEN_KEY = "sendra.token";

export const NO_AUTH_ROUTES = ["/auth/signup", "/auth/login", "/auth/reset", "/subscription", "/auth/verify", "/auth/forgot-password"];
