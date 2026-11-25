import { zodResolver } from "@hookform/resolvers/zod";
import type { UserCredentials, UserGet } from "@service-unit-469/sendra-shared";
import { UserSchemas } from "@service-unit-469/sendra-shared";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { LoadingButton } from "../../components/Buttons/LoadingButton";
import { PasswordInput } from "../../components/Input/Input/PasswordInput";
import { StyledInput } from "../../components/Input/Input/StyledInput";
import { StyledLabel } from "../../components/Label/StyledLabel";
import FullscreenLoader from "../../components/Utility/FullscreenLoader/FullscreenLoader";
import Redirect from "../../components/Utility/Redirect/Redirect";
import SendraLogo from "../../icons/SendraLogo";
import { useFetchUser } from "../../lib/hooks/users";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const { data: user, error } = useFetchUser();

  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [searchParams] = useSearchParams();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    defaultValues: { email: searchParams.get("email") ?? "" },
    resolver: zodResolver(UserSchemas.credentials),
  });

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
          <Link to={"/auth/login"} className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-600"}>
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
              <Link to={"/auth/login"} className={"text-sm text-neutral-500 underline transition ease-in-out hover:text-neutral-600"}>
                Already have an account?
              </Link>
            </div>
          </div>
          <div className="items-center mx-auto w-full max-w-lg mt-12">
            <div className="rounded-sm border border-neutral-200 bg-white px-4 py-8 sm:px-10">
              <form onSubmit={handleSubmit(signup)} className="space-y-6">
                <div>
                  <StyledLabel>
                    Your Email
                    <div className="mt-1">
                      <StyledInput type="email" autoComplete="email" placeholder="hello@email.com" {...register("email")} />
                    </div>
                  </StyledLabel>
                  <AnimatePresence>
                    {errors.email?.message && (
                      <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                        {errors.email.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <PasswordInput label="A Strong Password" error={errors.password} {...register("password")} />
                </div>

                <div>
                  <LoadingButton label="Create account" state={state} />
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
