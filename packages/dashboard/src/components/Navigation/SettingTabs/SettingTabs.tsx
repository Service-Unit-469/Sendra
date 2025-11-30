import { useLocation } from "react-router-dom";
import Tabs from "../Tabs/Tabs";

/**
 *
 */
export default function SettingTabs() {
  const location = useLocation();

  const links = [
    { to: "/settings/project", text: "Project Settings", active: location.pathname === "/settings/project" },
    { to: "/settings/contact-schema", text: "Contact Schema", active: location.pathname === "/settings/contact-schema" },
    { to: "/settings/api", text: "API Access", active: location.pathname === "/settings/api" },
    { to: "/settings/identity", text: "Verified Identity", active: location.pathname === "/settings/identity" },
    { to: "/settings/members", text: "Members", active: location.pathname === "/settings/members" },
  ];

  return <Tabs links={links} />;
}
