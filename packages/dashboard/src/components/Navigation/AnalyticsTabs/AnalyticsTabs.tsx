import { useRouter } from "next/router";
import Tabs from "../Tabs/Tabs";

/**
 *
 * @param root0
 * @param root0.onMethodChange
 */
export default function AnalyticsTabs() {
  const router = useRouter();

  const links = [
    { to: "/analytics", text: "Overview", active: router.route === "/analytics" },
    { to: "/analytics/clicks", text: "Clicks", active: router.route === "/analytics/clicks" },
  ];

  return <Tabs links={links} />;
}
