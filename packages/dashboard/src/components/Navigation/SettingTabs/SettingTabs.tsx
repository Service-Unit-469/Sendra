import { useLocation } from "react-router-dom";
import Tabs from "../Tabs/Tabs";

/**
 *
 */
export default function SettingTabs() {
  const location = useLocation();

  const links = [
    { to: "/dashboard/settings/project", text: "Project Settings", active: location.pathname === "/dashboard/settings/project" },
    { to: "/dashboard/settings/api", text: "API Access", active: location.pathname === "/dashboard/settings/api" },
    { to: "/dashboard/settings/identity", text: "Verified Identity", active: location.pathname === "/dashboard/settings/identity" },
    { to: "/dashboard/settings/members", text: "Members", active: location.pathname === "/dashboard/settings/members" },
  ];

  return <Tabs links={links} />;
}
