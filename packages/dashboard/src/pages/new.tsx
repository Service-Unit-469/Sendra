import { zodResolver } from "@hookform/resolvers/zod";
import type { ProjectCreate, PublicProject } from "@sendra/shared";
import { ProjectSchemas } from "@sendra/shared";
import { motion } from "framer-motion";
import { useAtom } from "jotai";
import { LoaderCircle, Rocket } from "lucide-react";
import { useState } from "react";
import { useForm, useFormState } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { StyledInput } from "../components/Input/Input/StyledInput";
import { ErrorMessage } from "../components/Label/ErrorMessage";
import { LightLabel } from "../components/Label/LightLabel";
import FullscreenLoader from "../components/Utility/FullscreenLoader/FullscreenLoader";
import Redirect from "../components/Utility/Redirect/Redirect";
import SendraLogo from "../icons/SendraLogo";
import { atomActiveProjectId } from "../lib/atoms/project";
import { TOKEN_KEY } from "../lib/constants";
import { useProjects } from "../lib/hooks/projects";
import { useLoginStatus } from "../lib/hooks/users";
import { network } from "../lib/network";

/**
 * Page to create a new project.
 */
export default function NewProject() {
  const navigate = useNavigate();

  const [, setActiveProjectId] = useAtom(atomActiveProjectId);

  const loginStatus = useLoginStatus();
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

  if (loginStatus === "logged-out") {
    return <Redirect to="auth/login" />;
  }

  if (!projects) {
    return <FullscreenLoader />;
  }

  const create = async (data: ProjectCreate) => {
    setSubmitted(true);

    try {
      const result = await network.fetch<{ project: PublicProject; token: string }, ProjectCreate>("/projects", {
        method: "POST",
        body: {
          ...data,
          url: data.url.startsWith("http") ? data.url : `https://${data.url}`,
        },
      });

      await mutate([...projects, result.project]);
      localStorage.setItem(TOKEN_KEY, result.token);
      localStorage.setItem("project", result.project.id);
      setActiveProjectId(result.project.id);
      navigate("/");
      return;
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
                  <LightLabel>
                    Project name
                    <StyledInput autoComplete="off" type="text" placeholder="My project" {...register("name")} />
                  </LightLabel>
                  <ErrorMessage error={errors.name} />
                </div>

                <div className="mt-4 flex flex-col">
                  <LightLabel>
                    Project URL
                    <div className="mt-1 flex rounded-md">
                      <input
                        type="url"
                        className="block w-full rounded-r border-neutral-300 transition ease-in-out focus:border-neutral-800 focus:ring-neutral-800 sm:text-sm"
                        placeholder="https://www.example.com"
                        {...register("url")}
                      />
                    </div>
                  </LightLabel>
                  <ErrorMessage error={errors.url} />
                </div>
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
                  <Link to="/" className={"mt-2 block text-center text-sm text-neutral-400 underline transition ease-in-out hover:text-neutral-600"}>
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
