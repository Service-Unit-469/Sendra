import { useLocation } from "react-router-dom";
import Tabs from "../Tabs/Tabs";

/**
 *
 * @param root0
 * @param root0.onMethodChange
 */
export default function AnalyticsTabs() {
  const location = useLocation();

  const links = [
    { to: "/analytics", text: "Overview", active: location.pathname === "/analytics" },
    { to: "/analytics/clicks", text: "Clicks", active: location.pathname === "/analytics/clicks" },
  ];

  return <Tabs links={links} />;
}
