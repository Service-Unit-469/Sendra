import { zodResolver } from "@hookform/resolvers/zod";
import type { UserGet, UserRequestReset } from "@sendra/shared";
import { UserSchemas } from "@sendra/shared";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { FullscreenLoader, Redirect } from "../../components";
import SendraLogo from "../../icons/SendraLogo";
import { useUser } from "../../lib/hooks/users";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();

  const { data: user, error } = useUser();

  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
  } = useForm({
    defaultValues: { email: "" },
    resolver: zodResolver(UserSchemas.requestReset),
  });

  useEffect(() => {
    if (router.query.email) {
      setValue("email", router.query.email as string);
    }
  }, [router.query, setValue]);

  if (!router.isReady || (!user && !error)) {
    return <FullscreenLoader />;
  }

  if (user && !error) {
    return <Redirect to={"/"} />;
  }

  const requestReset = async (data: UserRequestReset) => {
    setState("loading");

    try {
      await network.fetch<UserGet, UserRequestReset>("/auth/request-reset", {
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
          <h2 className="mt-4 text-2xl font-bold text-neutral-800">Password reset requested</h2>
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
            <h2 className="mt-6 text-3xl font-extrabold text-neutral-800">Forgot your password?</h2>
            <div>
              <Link href={"/auth/login"} className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-600"}>
                back to login
              </Link>
            </div>
          </div>
          <div className="items-center mx-auto w-full max-w-lg mt-12">
            <div className="rounded border border-neutral-200 bg-white px-4 py-8 sm:px-10">
              <form onSubmit={handleSubmit(requestReset)} className="space-y-6">
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
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.9 }}
                    type="submit"
                    className={"flex w-full items-center justify-center rounded-md bg-neutral-800 py-2.5 text-sm font-medium text-white"}
                  >
                    {state === "loading" ? <LoaderCircle className="animate-spin" size={18} /> : "Request password reset"}
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
