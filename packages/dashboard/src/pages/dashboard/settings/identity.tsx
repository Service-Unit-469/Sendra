import { zodResolver } from "@hookform/resolvers/zod";
import { IdentitySchemas, type ProjectIdentity } from "@sendra/shared";
import { motion } from "framer-motion";
import { Copy, Plus, Unlink } from "lucide-react";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type z from "zod";
import Alert from "../../../components/Alert/Alert";
import Badge from "../../../components/Badge/Badge";
import Card from "../../../components/Card/Card";
import Dropdown from "../../../components/Input/Dropdown/Dropdown";
import Input from "../../../components/Input/Input/Input";
import SettingTabs from "../../../components/Navigation/SettingTabs/SettingTabs";
import Table from "../../../components/Table/Table";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { AWS_REGION } from "../../../lib/constants";
import { useCurrentProject, useCurrentProjectIdentity, useProjects } from "../../../lib/hooks/projects";
import { network } from "../../../lib/network";

/**
 *
 */
export default function Index() {
  const project = useCurrentProject();
  const { mutate: projectsMutate } = useProjects();

  const { data: projectIdentity, mutate: identityMutate } = useCurrentProjectIdentity();

  const {
    register: registerVerify,
    handleSubmit: handleSubmitVerify,
    watch: watchVerify,
    formState: { errors: errorsVerify },
    setValue: setValueVerify,
    reset: resetVerify,
  } = useForm({
    resolver: zodResolver(IdentitySchemas.verify),
  });

  const identity = useMemo(() => {
    const resolvedIdentity = projectIdentity?.identity ?? ({ identity: "", identityType: "email", mailFromDomain: undefined, verified: false } as ProjectIdentity);
    resetVerify(resolvedIdentity);
    return resolvedIdentity;
  }, [projectIdentity?.identity, resetVerify]);

  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    formState: { errors: errorsUpdate },
    reset,
  } = useForm({
    resolver: zodResolver(IdentitySchemas.update),
  });

  useEffect(() => {
    reset({
      from: project.from ?? "",
      email: project.email ?? "",
    });
  }, [reset, project]);

  if (!projectIdentity) {
    return <FullscreenLoader />;
  }

  const verify = async (data: Omit<ProjectIdentity, "verified">) => {
    toast.promise(
      network.fetch<
        {
          dkimTokens?: string[];
        },
        z.infer<typeof IdentitySchemas.verify>
      >(`/projects/${project.id}/identity`, {
        method: "POST",
        body: data,
      }),
      {
        loading: "Verifying identity",
        success: () => {
          void identityMutate();
          void projectsMutate();

          return "Identity updated successfully";
        },
        error: "Could not verify identity",
      },
    );
  };

  const update = async (data: z.infer<typeof IdentitySchemas.update>) => {
    toast.promise(
      network.fetch<
        {
          success: true;
        },
        z.infer<typeof IdentitySchemas.update>
      >(`/projects/${project.id}/identity`, {
        method: "PUT",
        body: data,
      }),
      {
        loading: "Updating your sender information",
        success: () => {
          void projectsMutate();

          return "Updated your sender information";
        },
        error: "Could not update sender information",
      },
    );
  };

  const unlink = async () => {
    toast.promise(
      network.fetch(`/projects/${project.id}/identity`, {
        method: "DELETE",
      }),
      {
        loading: "Unlinking your identity",
        success: () => {
          void projectsMutate();

          return "Unlinked your identity";
        },
        error: "Could not unlink identity",
      },
    );
  };

  const domain = identity?.identity?.split("@")[1] ?? "";
  const subdomain = domain.split(".").length > 2 ? domain.split(".")[0] : "";

  return (
    <>
      <SettingTabs />
      <Card
        title="Identity"
        description="By sending emails from your own domain you build up domain authority and trust."
        actions={
          project.email && (
            <button onClick={unlink} className={"flex items-center gap-x-2 rounded-sm bg-red-600 px-8 py-2 text-center text-sm font-medium text-white transition ease-in-out hover:bg-red-700"}>
              <Unlink strokeWidth={1.5} size={18} />
              Unlink domain
            </button>
          )
        }
      >
        {identity.identityType === "domain" && !identity.verified && (
          <>
            <Alert type={"warning"} title={"Waiting for DNS verification"}>
              Please add the following records to {domain} to verify {identity.identity}, this may take up to 15 minutes to register. <br />
              In the meantime you can already start sending emails, we will automatically switch to your domain once it is verified.
            </Alert>

            <div className="mt-6">
              <Table
                values={[
                  {
                    Type: <Badge type={"info"}>TXT</Badge>,
                    Key: (
                      <button
                        className={"flex cursor-pointer items-center gap-3"}
                        onClick={() => {
                          void navigator.clipboard.writeText("sendra");
                          toast.success("Copied key to clipboard");
                        }}
                      >
                        <p className={"font-mono text-sm"}>sendra</p>
                        <Copy size={14} />
                      </button>
                    ),
                    Value: (
                      <button
                        className={"flex cursor-pointer items-center gap-3"}
                        onClick={() => {
                          void navigator.clipboard.writeText("v=spf1 include:amazonses.com ~all");
                          toast.success("Copied value to clipboard");
                        }}
                      >
                        <p className={"font-mono text-sm"}>v=spf1 include:amazonses.com ~all</p> <Copy size={14} />
                      </button>
                    ),
                  },
                  {
                    type: <Badge type={"info"}>MX</Badge>,
                    Key: (
                      <button
                        className={"flex cursor-pointer items-center gap-3"}
                        onClick={() => {
                          void navigator.clipboard.writeText("sendra");
                          toast.success("Copied key to clipboard");
                        }}
                      >
                        <p className={"font-mono text-sm"}>sendra</p>
                        <Copy size={14} />
                      </button>
                    ),
                    Value: (
                      <button
                        className={"flex cursor-pointer items-center gap-3"}
                        onClick={() => {
                          void navigator.clipboard.writeText(`10 feedback-smtp.${AWS_REGION}.amazonses.com`);
                          toast.success("Copied value to clipboard");
                        }}
                      >
                        <p className={"font-mono text-sm"}>10 feedback-smtp.{AWS_REGION}.amazonses.com</p>
                        <Copy size={14} />
                      </button>
                    ),
                  },
                  ...(projectIdentity?.dkimTokens ?? []).map((token) => {
                    return {
                      Type: <Badge type={"info"}>CNAME</Badge>,
                      Key: (
                        <button
                          className={"flex cursor-pointer items-center gap-3"}
                          onClick={() => {
                            void navigator.clipboard.writeText(`${token}._domainkey${subdomain ? `.${subdomain}` : ""}`);
                            toast.success("Copied key to clipboard");
                          }}
                        >
                          <p className={"font-mono text-sm"}>
                            {token}._domainkey{subdomain ? `.${subdomain}` : ""}
                          </p>
                          <Copy size={14} />
                        </button>
                      ),
                      Value: (
                        <button
                          className={"flex cursor-pointer items-center gap-3"}
                          onClick={() => {
                            void navigator.clipboard.writeText(`${token}.dkim.amazonses.com`);
                            toast.success("Copied value to clipboard");
                          }}
                        >
                          <p className={"font-mono text-sm"}>{token}.dkim.amazonses.com</p>
                          <Copy size={14} />
                        </button>
                      ),
                    };
                  }),
                ]}
              />
            </div>
          </>
        )}
        {identity.verified && (
          <Alert type={"success"} title={"Identity verified"}>
            You have confirmed {identity.identity} as your identity. You can now start sending emails.
          </Alert>
        )}
        {!identity.verified && (
          <form onSubmit={handleSubmitVerify(verify)} className="space-y-6">
            <label htmlFor="identityType" className="block text-sm font-medium text-neutral-700">
              Identity Type
            </label>
            <Dropdown
              selectedValue={watchVerify("identityType") ?? ""}
              values={[
                { name: "Email", value: "email" },
                { name: "Domain", value: "domain" },
              ]}
              onChange={(t) => setValueVerify("identityType", t as "email" | "domain")}
            />
            <Input register={registerVerify("identity")} error={errorsVerify.identity} placeholder={"hello@example.com or example.com"} label="Identity" />
            <Input register={registerVerify("mailFromDomain")} error={errorsVerify.mailFromDomain} placeholder={"hello@example.com"} label="Mail From Domain" />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              className={"ml-auto flex items-center gap-x-0.5 rounded-sm bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}
            >
              <Plus size={18} />
              Verify identity
            </motion.button>
          </form>
        )}
      </Card>

      <Card title="Sender" description="The name and email that will be used when sending emails from Sendra. Your project name will be used by default">
        <form onSubmit={handleSubmitUpdate(update)} className="space-y-6">
          <Input register={registerUpdate("from")} placeholder={project.name} label={"Name"} error={errorsUpdate.from} />
          <Input register={registerUpdate("email")} placeholder={project.email ?? (identity.identityType === "email" ? identity.identity : undefined)} label={"Email"} error={errorsUpdate.email} />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className={"ml-auto flex items-center gap-x-0.5 rounded-sm bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"}
          >
            Save
          </motion.button>
        </form>
      </Card>
    </>
  );
}
