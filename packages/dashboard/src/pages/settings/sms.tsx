import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { SmsSchemas } from "shared/dist";
import { toast } from "sonner";
import type z from "zod";
import { Card, FullscreenLoader, Input, SettingTabs, Toggle } from "../../components";
import { Dashboard } from "../../layouts";
import { useActiveProject, useActiveProjectSmsConfig } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

/**
 *
 */
export default function Index() {
  const { data: smsConfig, mutate: smsConfigMutate } = useActiveProjectSmsConfig();
  const activeProject = useActiveProject();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(SmsSchemas.updateConfig),
    defaultValues: {
      enabled: false,
    },
  });

  // useEffect(() => {
  //   reset(smsConfig ?? { enabled: false });
  // }, [smsConfig, reset]);

  const updateSmsConfig = (data: z.infer<typeof SmsSchemas.updateConfig>) => {
    toast.promise(
      network.fetch(`/projects/${activeProject?.id}/sms-config`, {
        method: "PUT",
        body: data,
      }),
      {
        loading: "Updating SMS configuration",
        success: () => {
          void smsConfigMutate();
          return "SMS configuration updated";
        },
        error: "Could not update SMS configuration",
      },
    );
    
  };

  if (!smsConfig || !activeProject) {
    return <FullscreenLoader />;
  }

  return (
    <>
      <Dashboard>
        <SettingTabs />
        <Card
          title="SMS Settings"
          description={`Manage your SMS settings for ${activeProject.name}.`}
        >
          <form onSubmit={handleSubmit(updateSmsConfig)} className="space-y-6 flex flex-col gap-2">
            <Toggle
              title={watch("enabled") ? "SMS Enabled" : "SMS Disabled"}
              description="Enable SMS for your project"
              toggled={watch("enabled")}
              onToggle={() => setValue("enabled", !watch("enabled"))}
            />
            {watch("enabled") && (
              <>
                <Input register={register("poolArn")} label="Pool ARN" placeholder="arn:aws:sms-voice:us-east-1:123456789012:pool/123456789012" error={errors.poolArn} />
                <Input register={register("configurationSetArn")} label="Configuration Set ARN" placeholder="arn:aws:sms-voice:us-east-1:123456789012:configuration-set/123456789012" error={errors.configurationSetArn} />
                <Input register={register("phoneKey")} label="Phone Key" placeholder="phone" error={errors.phoneKey} />
              </>
            )}
            <motion.button
              type="submit"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.9 }}
              className={"ml-auto mt-6 flex items-center gap-x-2 rounded bg-neutral-800 px-6 py-2 text-center text-sm font-medium text-white"}
            >
              <Save strokeWidth={1.5} size={18} />
              Save
            </motion.button>
          </form>

        </Card>
      </Dashboard>
    </>
  );
}
