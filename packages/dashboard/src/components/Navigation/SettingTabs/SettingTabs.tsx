import { useRouter } from "next/router";
import { Tabs } from "../Tabs";

/**
 *
 */
export default function SettingTabs() {
  const router = useRouter();

  const links = [
    { to: "/settings/project", text: "Project Settings", active: router.route === "/settings/project" },
    { to: "/settings/api", text: "API Access", active: router.route === "/settings/api" },
    { to: "/settings/identity", text: "Verified Identity", active: router.route === "/settings/identity" },
    { to: "/settings/sms", text: "SMS Settings", active: router.route === "/settings/sms" },
    { to: "/settings/members", text: "Members", active: router.route === "/settings/members" },
  ];

  return <Tabs links={links} />;
}
