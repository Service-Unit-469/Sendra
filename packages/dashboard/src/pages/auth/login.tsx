import { zodResolver } from "@hookform/resolvers/zod";
import { type UserCredentials, UserSchemas } from "@sendra/shared";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FullscreenLoader, Redirect } from "../../components";
import SendraLogo from "../../icons/SendraLogo";
import { API_URI, TOKEN_KEY } from "../../lib/constants";
import { useUser } from "../../lib/hooks/users";

/**
 *
 */
export default function Index() {
  const router = useRouter();

  const { data: user, error, mutate } = useUser();

  const [submitted, setSubmitted] = useState(false);
  const [hidePassword, setHidePassword] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm({
    resolver: zodResolver(UserSchemas.credentials),
  });

  if (user && !error) {
    return <Redirect to={"/"} />;
  }

  if (!user && !error) {
    return <FullscreenLoader />;
  }

  const login = async (data: UserCredentials) => {
    setSubmitted(true);
    try {
      const response = await fetch(`${API_URI}/auth/login`, {
        method: "POST",
        body: JSON.stringify(data),
        mode: "cors",
        redirect: "manual",
      });

      if (response.status === 403) {
        const body = await response.json();
        if (body.resetUrl) {
          return router.push(body.resetUrl);
        }
        setError("email", { message: body.detail ?? "login failed" });
        setSubmitted(false);
        return;
      }
      if (!response.ok) {
        const body = await response.json();
        setError("email", { message: body.detail ?? "login failed" });
        setSubmitted(false);
        return;
      }
      const body = await response.json();
      sessionStorage.setItem(TOKEN_KEY, body.token);
      await mutate(body);
    } catch {
      setError("email", { message: "login failed" });
      setSubmitted(false);
      return;
    }

    setSubmitted(false);
  };

  return (
    <div className="bg-off-white flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center sm:mx-auto sm:w-full sm:max-w-md">
        <SendraLogo height="90px" width="50%" />
        <h2 className="mt-4 text-center text-3xl font-bold text-neutral-800">Sign in to your account</h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded border border-neutral-200 bg-white px-4 py-8 sm:px-10">
          <form onSubmit={handleSubmit(login)} className="space-y-6">
            <div>
              <label htmlFor={"email"} className="block text-sm font-medium text-neutral-700">
                Email
              </label>
              <div className="mt-1">
                <input
                  type={"email"}
                  className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                  autoComplete={"email"}
                  placeholder={"hello@email.com"}
                  {...register("email")}
                />
              </div>
              <AnimatePresence>
                {errors.email?.message && (
                  <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div>
              <label htmlFor={"password"} className="block text-sm font-semibold text-neutral-600">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  type={hidePassword ? "password" : "text"}
                  placeholder={hidePassword ? "•••••••••••••" : "Password"}
                  autoComplete={"current-password"}
                  className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                  {...register("password")}
                />
                <div className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3">
                  {hidePassword ? <Eye onClick={() => setHidePassword(!hidePassword)} /> : <EyeOff onClick={() => setHidePassword(!hidePassword)} />}
                </div>
              </div>
              <AnimatePresence>
                {errors.password?.message && (
                  <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                    Password must be at least 6 characters long
                  </motion.p>
                )}
              </AnimatePresence>
              <div className={"w-full text-center"}>
                <Link
                  href={`/auth/forgot-password?email=${encodeURIComponent(watch("email") ?? "")}`}
                  passHref
                  className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-500"}
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.9 }}
                type="submit"
                className={"flex w-full items-center justify-center rounded-md bg-neutral-800 py-2.5 text-sm font-medium text-white"}
              >
                {submitted ? (
                  <svg className="-ml-1 mr-3 h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  "Sign in"
                )}
              </motion.button>
              <AnimatePresence>
                {errors.email?.message && (
                  <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                    {errors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </form>
        </div>
        <div className={"w-full text-center"}>
          <Link href={"/auth/signup"} passHref className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-500"}>
            Want to create an account instead?
          </Link>
        </div>
      </div>
    </div>
  );
}
