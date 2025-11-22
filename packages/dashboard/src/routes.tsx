import { lazy } from "react";

// Lazy load all route components for code splitting
export const Dashboard = lazy(() => import("./pages/dashboard/index"));
export const NewProject = lazy(() => import("./pages/new"));

// Auth
export const Login = lazy(() => import("./pages/auth/login"));
export const Signup = lazy(() => import("./pages/auth/signup"));
export const Logout = lazy(() => import("./pages/auth/logout"));
export const ForgotPassword = lazy(() => import("./pages/auth/forgot-password"));
export const ResetPassword = lazy(() => import("./pages/auth/reset"));
export const Verify = lazy(() => import("./pages/auth/verify"));

// Subscription
export const Subscription = lazy(() => import("./pages/subscription/index"));
