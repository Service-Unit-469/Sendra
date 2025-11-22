import { useLocation, useNavigate, useParams } from "react-router-dom";

/**
 * Compatibility hook that mimics Next.js useRouter API
 * This helps with migration from Next.js to React Router
 */
export function useRouter() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  return {
    push: (path: string) => {
      navigate(path);
    },
    replace: (path: string) => {
      navigate(path, { replace: true });
    },
    back: () => {
      navigate(-1);
    },
    pathname: location.pathname,
    query: params as Record<string, string>,
    route: location.pathname,
    asPath: location.pathname + location.search,
    isReady: true, // Always ready in client-side routing
  };
}
