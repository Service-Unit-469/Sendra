import { zodResolver } from "@hookform/resolvers/zod";
import type { UserCredentials, UserGet } from "@sendra/shared";
import { UserSchemas } from "@sendra/shared";
import SendraLogo from "dashboard/src/icons/SendraLogo";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FullscreenLoader, Redirect } from "../../components";
import { useUser } from "../../lib/hooks/users";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();

  const { data: user, error } = useUser();

  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [hidePassword, setHidePassword] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    defaultValues: { email: (router.query.email as string | undefined) ?? "" },
    resolver: zodResolver(UserSchemas.credentials),
  });

  if (!router.isReady) {
    return <FullscreenLoader />;
  }

  if (user && !error) {
    return <Redirect to={"/"} />;
  }

  if (!user && !error) {
    return <FullscreenLoader />;
  }

  const signup = async (data: UserCredentials) => {
    setState("loading");

    try {
      await network.fetch<UserGet, UserCredentials>("/auth/signup", {
        method: "POST",
        body: data,
      });

      setState("success");
    } catch (e) {
      setError("email", { message: (e as Error).message });
      setState("error");
    }
  };

  return (
    <div className="bg-off-white flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8">
      {state === "success" && (
        <div className="flex flex-col items-center justify-center mt-12">
          <CheckCircle className="h-10 w-10 text-green-500" />
          <h2 className="mt-4 text-2xl font-bold text-neutral-800">Account created</h2>
          <p className="mt-2 text-sm text-neutral-600">Please check your email for a verification link</p>
          <Link href={"/auth/login"} className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-600"}>
            Back to login
          </Link>
        </div>
      )}
      {state !== "success" && (
        <>
          <div className="flex flex-col items-center sm:mx-auto sm:w-full sm:max-w-md">
            <SendraLogo height="100px" width="50%" />
            <h2 className="mt-6 text-3xl font-extrabold text-neutral-800">Create a Sendra account</h2>
            <div>
              <Link href={"/auth/login"} className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-600"}>
                Already have an account?
              </Link>
            </div>
          </div>
          <div className="items-center mx-auto w-full max-w-lg mt-12">
            <div className="rounded border border-neutral-200 bg-white px-4 py-8 sm:px-10">
              <form onSubmit={handleSubmit(signup)} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700">
                    Your Email
                    <div className="mt-1">
                      <input
                        type={"email"}
                        className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                        autoComplete={"email"}
                        placeholder={"hello@email.com"}
                        {...register("email")}
                      />
                    </div>
                  </label>
                  <AnimatePresence>
                    {errors.email?.message && (
                      <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                        {errors.email.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-600">
                    A Strong Password
                    <div className="relative mt-1">
                      <input
                        type={hidePassword ? "password" : "text"}
                        placeholder={hidePassword ? "•••••••••••••" : "Password"}
                        autoComplete={"new-password"}
                        className={"block w-full rounded border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                        {...register("password")}
                      />
                      <div className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3">
                        {hidePassword ? <Eye onClick={() => setHidePassword(!hidePassword)} /> : <EyeOff onClick={() => setHidePassword(!hidePassword)} />}
                      </div>
                    </div>
                  </label>
                  <AnimatePresence>
                    {errors.password?.message && (
                      <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                        Password must be at least 6 characters long
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    type="submit"
                    className={"flex w-full items-center justify-center rounded-md bg-neutral-800 py-2.5 text-sm font-medium text-white"}
                  >
                    {state === "loading" ? <LoaderCircle className="animate-spin" size={18} /> : "Create account"}
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
          </div>
        </>
      )}
    </div>
  );
}
