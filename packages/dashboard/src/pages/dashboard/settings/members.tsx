import { zodResolver } from "@hookform/resolvers/zod";
import type { Membership, MembershipInvite, PublicProject } from "@sendra/shared";
import { MembershipSchemas } from "@sendra/shared";
import { motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type z from "zod";
import Card from "../../../components/Card/Card";
import Dropdown from "../../../components/Input/Dropdown/Dropdown";
import Input from "../../../components/Input/Input/Input";
import SettingTabs from "../../../components/Navigation/SettingTabs/SettingTabs";
import Modal from "../../../components/Overlay/Modal/Modal";
import Table from "../../../components/Table/Table";
import FullscreenLoader from "../../../components/Utility/FullscreenLoader/FullscreenLoader";
import { useCurrentProject, useCurrentProjectMemberships, useProjects } from "../../../lib/hooks/projects";
import { useUser } from "../../../lib/hooks/users";
import { network } from "../../../lib/network";

/**
 *
 */
export default function MembersPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const navigate = useNavigate();

  const project = useCurrentProject();
  const user = useUser();
  const { data: projects, mutate: projectMutate } = useProjects();
  const { data: memberships, mutate: membershipMutate } = useCurrentProjectMemberships();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(MembershipSchemas.invite.omit({ projectId: true })),
  });

  if (!projects || !user || !memberships || !memberships.members) {
    return <FullscreenLoader />;
  }

  const inviteAccount = (data: Omit<MembershipInvite, "projectId">) => {
    toast.promise(
      network.fetch<
        {
          success: true;
          members: Membership[];
        },
        MembershipInvite
      >("/memberships/invite", {
        method: "POST",
        body: {
          projectId: project.id,
          email: data.email,
          role: data.role,
        },
      }),
      {
        loading: "Adding new member",
        success: async (result) => {
          await membershipMutate({ members: result.members });
          setShowInviteModal(false);

          return "Added new member";
        },
        error: (error) => {
          const errorMessage = error?.message || "We could not find that user, please ask them to sign up first.";
          return errorMessage;
        },
      },
    );
  };

  const kickAccount = (email: string) => {
    void network
      .fetch<{ success: true; members: Membership[] }, z.infer<typeof MembershipSchemas.kick>>("/memberships/kick", {
        method: "POST",
        body: {
          projectId: project.id,
          email,
        },
      })
      .then(async (res) => {
        await membershipMutate({ members: res.members });
      });
  };

  const leaveProject = () => {
    void network
      .fetch<
        {
          success: true;
          memberships: PublicProject[];
        },
        { projectId: string }
      >("/memberships/leave", {
        method: "POST",
        body: {
          projectId: project.id,
        },
      })
      .then(async (res) => {
        await projectMutate(res.memberships);
        localStorage.removeItem("project");
        navigate("/dashboard");
        window.location.reload();
      });
  };

  return (
    <>
      <Modal
        isOpen={showLeaveModal}
        onToggle={() => setShowLeaveModal(!showLeaveModal)}
        onAction={leaveProject}
        type={"danger"}
        title={"Are you sure?"}
        description={
          memberships.members?.length === 1
            ? "You are the last person in this project, if you leave it we will automatically delete it!"
            : "Leaving a project is permanent, you will lose access to the data and will need to be reinvited again."
        }
      />
      <Modal
        isOpen={showInviteModal}
        onToggle={() => setShowInviteModal(!showInviteModal)}
        onAction={handleSubmit(inviteAccount)}
        type={"info"}
        title={"Invite a new member"}
        description="Enter the email of the account you want to invite to this project. The person you want to invite needs to have an account on Sendra."
      >
        <Input register={register("email")} error={errors.email} label={"Email"} placeholder={"hello@example.com"} />
        <Dropdown
          onChange={(t) => setValue("role", t as "ADMIN" | "MEMBER")}
          values={[
            { name: "Admin", value: "ADMIN" },
            { name: "Member", value: "MEMBER" },
          ]}
          selectedValue={watch("role") ?? "MEMBER"}
        />
      </Modal>

      <SettingTabs />
      <Card title="Project members">
        <Table
          values={memberships.members?.map((membership) => {
            return {
              Account: membership.email,
              Role: membership.role.charAt(0).toUpperCase() + membership.role.slice(1).toLowerCase(),

              Manage:
                membership.user === user.id ? (
                  <button className={"mb-2 text-sm text-neutral-400 underline transition ease-in-out hover:text-neutral-700"} onClick={() => setShowLeaveModal(true)}>
                    Leave
                  </button>
                ) : memberships.members?.find((membership) => membership.user === user.id)?.role === "ADMIN" ? (
                  <button className={"mb-2 text-sm text-neutral-400 underline transition ease-in-out hover:text-neutral-700"} onClick={() => kickAccount(membership.email)}>
                    Kick
                  </button>
                ) : (
                  ""
                ),
            };
          })}
        />
        <div className={"mt-9 flex items-center"}>
          <div className={"w-2/3"}>
            <p className={"text-sm font-semibold text-neutral-800"}>Invite team</p>
            <p className={"text-sm text-neutral-400"}>By adding someone to your project you give them access to all data present in your project including emails and your API key.</p>
          </div>

          <motion.button
            onClick={() => setShowInviteModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className={"ml-auto mt-4 self-end rounded-sm bg-neutral-800 px-8 py-2.5 text-sm font-medium text-white"}
          >
            Invite user
          </motion.button>
        </div>
      </Card>
    </>
  );
}
