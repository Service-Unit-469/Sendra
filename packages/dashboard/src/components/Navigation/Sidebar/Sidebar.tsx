import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, FileImage, Home, LayoutTemplate, LineChart, LogOut, Send, Settings, TerminalSquare, User, Users2, Workflow, X } from "lucide-react";
import React, { type ReactElement, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SendraLogo from "../../../icons/SendraLogo";
import ProjectSelector from "../ProjectSelector/ProjectSelector";

type SidebarLinkType = {
  to: string;
  text: string;
  icon: ReactElement;
};

export interface SidebarProps {
  mobileOpen: boolean;
  wideLayout?: boolean;
  onSidebarVisibilityChange: () => void;
}

const links: SidebarLinkType[] = [
  {
    to: "/",
    text: "Dashboard",
    icon: <Home />,
  },
  {
    to: "/contacts",
    text: "Contacts",
    icon: <User />,
  },
  {
    to: "/analytics",
    text: "Analytics",
    icon: <LineChart />,
  },
  {
    to: "/settings/project",
    text: "Project Settings",
    icon: <Settings />,
  },
  {
    to: "/events",
    text: "Events",
    icon: <TerminalSquare />,
  },
  {
    to: "/templates",
    text: "Templates",
    icon: <LayoutTemplate />,
  },
  {
    to: "/assets",
    text: "Assets",
    icon: <FileImage />,
  },
  {
    to: "/actions",
    text: "Actions",
    icon: <Workflow />,
  },
  {
    to: "/campaigns",
    text: "Campaigns",
    icon: <Send />,
  },
  {
    to: "/groups",
    text: "Contact Groups",
    icon: <Users2 />,
  },
];

/**
 * A link in the sidebar
 */
function SidebarLink({ to, text, icon }: SidebarLinkType) {
  const location = useLocation();

  const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  return (
    <Link
      key={to}
      to={to}
      className={`${
        active ? "cursor-default bg-neutral-100 text-neutral-700" : "cursor-pointer text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
      } flex items-center gap-x-3 rounded p-2 text-sm font-medium transition ease-in-out`}
    >
      <div className="flex h-5 w-5 items-center justify-center">{icon}</div>
      {text}
    </Link>
  );
}

/**
 * @param root0
 * @param root0.mobileOpen
 * @param root0.onSidebarVisibilityChange
 */
export default function Sidebar({ mobileOpen, onSidebarVisibilityChange, wideLayout }: SidebarProps) {
  const projectSelectorRef = React.createRef<HTMLDivElement>();
  const [projectSelectorOpen, setProjectSelectorOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(!wideLayout), [wideLayout]);

  return (
    <>
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ ease: "easeOut", duration: 0.15 }}
            className="fixed inset-0 z-40 flex w-full md:hidden"
            role="dialog"
            aria-modal="true"
          >
            <motion.div animate={{ opacity: [0, 1] }} transition={{ ease: "easeOut", duration: 0.15 }} className="fixed inset-0 bg-neutral-600 bg-opacity-75" aria-hidden={!mobileOpen} />

            <div className="relative flex h-full w-full max-w-xs flex-1 flex-col bg-white">
              <div className="absolute right-0 top-0 -mr-12 pt-2">
                <button
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-white"
                  onClick={() => onSidebarVisibilityChange()}
                >
                  <span className="sr-only">Close sidebar</span>
                  <X />
                </button>
              </div>

              <div className="h-0 flex-1 overflow-y-auto pb-4 pt-5">
                <div className="flex shrink-0 items-center px-4">
                  <Link to="/">
                    <SendraLogo width="100%" height="90px" />
                  </Link>
                </div>

                <div className={"mt-5 px-2"}>
                  <ProjectSelector open={projectSelectorOpen} onToggle={() => setProjectSelectorOpen(!projectSelectorOpen)} ref={projectSelectorRef} />
                </div>

                <nav className="mt-5 space-y-1 px-2">
                  {links.map((link) => {
                    return <SidebarLink key={`mobile-top-${link.to}`} to={link.to} text={link.text} icon={link.icon} />;
                  })}
                </nav>
              </div>
            </div>

            <div className="w-14 shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden md:flex md:shrink-0">
        <div className={`flex ${expanded ? "w-72" : "w-8"} flex-col`}>
          {!expanded && (
            <div className="flex flex-direction-column">
              <button
                className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-white"
                onClick={() => setExpanded(!expanded)}
              >
                <ChevronRight />
              </button>
            </div>
          )}
          {expanded && (
            <>
              {wideLayout && (
                <div className="flex flex-direction-column bg-white ">
                  <button
                    className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-hidden focus:ring-2 focus:ring-inset focus:ring-white"
                    onClick={() => setExpanded(!expanded)}
                  >
                    <ChevronLeft />
                  </button>
                </div>
              )}
              <div className="flex h-0 flex-1 flex-col border-r border-neutral-100 bg-white px-6">
                <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
                  <div className="flex shrink-0 items-center justify-center px-4">
                    <Link to={""}>
                      <SendraLogo width="100%" height="90px" />
                    </Link>
                  </div>

                  <div className={"px-2"}>
                    <ProjectSelector open={projectSelectorOpen} onToggle={() => setProjectSelectorOpen(!projectSelectorOpen)} ref={projectSelectorRef} />
                  </div>

                  <nav className="mt-5 flex-1 space-y-1 px-2">
                    {links.map((link, _index) => {
                      if (link.to === "/events") {
                        return (
                          <div className={"pt-3"}>
                            <p className={"pb-1 text-sm font-semibold text-neutral-500"}>Automations</p>
                            <SidebarLink key={`desktop-top-${link.to}`} to={link.to} text={link.text} icon={link.icon} />
                          </div>
                        );
                      }

                      if (link.to === "/campaigns") {
                        return (
                          <div className={"pt-3"}>
                            <p className={"pb-1 text-sm font-semibold text-neutral-500"}>Campaigns</p>
                            <SidebarLink key={`desktop-top-${link.to}`} to={link.to} text={link.text} icon={link.icon} />
                          </div>
                        );
                      }

                      return <SidebarLink key={`desktop-top-${link.to}`} to={link.to} text={link.text} icon={link.icon} />;
                    })}
                  </nav>
                </div>

                <div className="flex-0 mb-4 w-full space-y-1 bg-white px-2">
                  <Link
                    to="/auth/logout"
                    className="flex cursor-pointer items-center gap-x-3 rounded-sm p-2 text-sm font-medium text-neutral-400 transition ease-in-out hover:bg-neutral-50 hover:text-neutral-700"
                  >
                    <div className="flex h-5 w-5 items-center justify-center">
                      <LogOut />
                    </div>
                    Sign out
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
