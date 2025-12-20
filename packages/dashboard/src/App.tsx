import "../styles/index.css";

import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import utc from "dayjs/plugin/utc";
import { Provider as JotaiProvider } from "jotai";
import NProgress from "nprogress";
import "nprogress/nprogress.css";
import { Suspense, useEffect } from "react";
import { HashRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { SWRConfig } from "swr";
import FullscreenLoader from "./components/Utility/FullscreenLoader/FullscreenLoader";
import { NO_AUTH_ROUTES } from "./lib/constants";
import { useFetchUser } from "./lib/hooks/users";
import { network } from "./lib/network";
import { Dashboard, ForgotPassword, Login, Logout, NewProject, ResetPassword, Signup, Verify } from "./routes";

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(advancedFormat);
dayjs.extend(duration);

/**
 * Component to handle route change progress and auth checks
 */
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: user, error } = useFetchUser();

  // Handle route change progress
  useEffect(() => {
    NProgress.start();
    const timer = setTimeout(() => {
      NProgress.done();
    }, 100);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, []);

  // Handle auth redirects
  useEffect(() => {
    if (error && !NO_AUTH_ROUTES.includes(location.pathname)) {
      navigate("/auth/login", { replace: true });
    }
  }, [error, location.pathname, navigate]);

  if (error && !NO_AUTH_ROUTES.includes(location.pathname)) {
    return null; // Navigation handled in useEffect
  }

  if (!user && !NO_AUTH_ROUTES.includes(location.pathname)) {
    return <FullscreenLoader />;
  }

  return (
    <>
      <Toaster position="bottom-right" />
      <Suspense fallback={<FullscreenLoader />}>
        <Routes>
          <Route path="/new" element={<NewProject />} />

          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/logout" element={<Logout />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />
          <Route path="/auth/reset" element={<ResetPassword />} />
          <Route path="/auth/verify" element={<Verify />} />

          <Route path="/*" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </>
  );
}

/**
 * Main app root component that houses all providers
 */
export default function App() {
  return (
    <SWRConfig
      value={{
        fetcher: network.fetch,
        errorRetryCount: 3,
        focusThrottleInterval: 60_000, // 1 minute
      }}
    >
      <JotaiProvider>
        <HashRouter>
          <AppContent />
        </HashRouter>
      </JotaiProvider>
    </SWRConfig>
  );
}
