import { zodResolver } from "@hookform/resolvers/zod";
import type { ProjectCreate, PublicProject } from "@sendra/shared";
import { ProjectSchemas } from "@sendra/shared";
import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import { LoaderCircle, Rocket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { useForm, useFormState } from "react-hook-form";
import FullscreenLoader from "../components/Utility/FullscreenLoader/FullscreenLoader";
import Redirect from "../components/Utility/Redirect/Redirect";
import SendraLogo from "../icons/SendraLogo";
import { atomActiveProject } from "../lib/atoms/project";
import { useProjects } from "../lib/hooks/projects";
import { useUser } from "../lib/hooks/users";
import { network } from "../lib/network";

/**
 *
 */
export default function Index() {
  const router = useRouter();

  const [, setActiveProjectId] = useAtom(atomActiveProject);

  const { data: user, error } = useUser();
  const { data: projects, mutate } = useProjects();

  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    control,
  } = useForm({
    resolver: zodResolver(ProjectSchemas.create),
  });

  const { isValid } = useFormState({
    control,
  });

  if (error) {
    return <Redirect to={"auth/login"} />;
  }

  if (!user || !projects) {
    return <FullscreenLoader />;
  }

  const create = async (data: ProjectCreate) => {
    setSubmitted(true);

    try {
      const result = await network.fetch<PublicProject, ProjectCreate>("/projects", {
        method: "POST",
        body: {
          ...data,
          url: data.url.startsWith("http") ? data.url : `https://${data.url}`,
        },
      });

      await mutate([...projects, result]);
      localStorage.setItem("project", result.id);
      setActiveProjectId(result.id);
      return router.push("/");
    } catch (e) {
      setError("name", { message: (e as Error).message });
      setSubmitted(false);
      return;
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:border-r-2 sm:border-neutral-100 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <h2 className="mt-6 text-3xl font-extrabold text-neutral-800">Create a new project</h2>
            <p className={"text-sm text-neutral-500"}>Get ready to take your emails to the next level.</p>
          </div>

          <div className="mt-8">
            <div className="mt-6">
              <form onSubmit={handleSubmit(create)} className="relative mt-2 w-full">
                <div className="mt-4 flex flex-col">
                  <label htmlFor="name" className="text-xs font-light">
                    Project name
                  </label>
                  <input
                    autoComplete={"off"}
                    type="text"
                    className={"block w-full rounded-sm border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                    placeholder="My project"
                    {...register("name")}
                  />
                  <AnimatePresence>
                    {errors.name?.message && (
                      <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                        {errors.name.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-4 flex flex-col">
                  <label htmlFor="url" className="text-xs font-light">
                    Project URL
                  </label>
                  <div className="mt-1 flex rounded-md">
                    <input
                      type="url"
                      className={"block w-full rounded-r border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"}
                      placeholder="https://www.example.com"
                      {...register("url")}
                    />
                  </div>

                  <AnimatePresence>
                    {errors.url?.message && (
                      <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                        {errors.url.message}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <AnimatePresence>
                  {errors.name?.message && (
                    <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
                      {errors.name.message}
                    </motion.p>
                  )}
                </AnimatePresence>
                <motion.button
                  whileHover={isValid ? { scale: 1.05 } : {}}
                  whileTap={isValid ? { scale: 0.9 } : {}}
                  type="submit"
                  disabled={!isValid || submitted}
                  className={` ${isValid ? "bg-neutral-800 text-white" : "bg-neutral-200 text-white"} mt-5 flex w-full items-center justify-center rounded-sm py-2.5 text-sm font-medium transition`}
                >
                  {submitted ? (
                    <LoaderCircle className="animate-spin" size={18} />
                  ) : (
                    <span className={"flex items-center justify-center gap-x-2"}>
                      <Rocket size={18} />
                      Launch
                    </span>
                  )}
                </motion.button>
              </form>

              {projects.length > 0 ? (
                <div className={"w-full"}>
                  <Link href={"/"} className={"mt-2 block text-center text-sm text-neutral-400 underline transition ease-in-out hover:text-neutral-600"}>
                    Back to the dashboard
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 items-center justify-center bg-linear-to-br from-blue-50 to-white lg:flex">
        <div className={"w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-9"}>
          <SendraLogo />
        </div>
      </div>
    </div>
  );
}
