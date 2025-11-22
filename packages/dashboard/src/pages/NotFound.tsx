import { Link, useLocation } from "react-router-dom";

/**
 * Simple not found page
 */
export default function NotFound() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-md text-center">
        <div>
          <h2 className="mt-6 text-3xl font-extrabold text-neutral-800">Not Found</h2>
          <p className={"text-sm text-neutral-500"}>The page you are looking for does not exist.</p>
          <p className={"text-sm text-neutral-500"}>{pathname}</p>
          <Link to={"/"} className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-600"}>
            Go back to the home page
          </Link>
        </div>
      </div>
    </div>
  );
}
