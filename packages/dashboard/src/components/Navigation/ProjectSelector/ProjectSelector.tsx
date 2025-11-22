import { AnimatePresence, motion } from "framer-motion";
import { useAtom } from "jotai";
import { Check } from "lucide-react";
import React, { type MutableRefObject, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DropdownIndicator } from "../../../icons/DropdownIndicator";
import { atomActiveProjectId } from "../../../lib/atoms/project";
import { useActiveProject, useProjects } from "../../../lib/hooks/projects";

export interface ProjectSelectorProps {
  open: boolean;
  onToggle: () => void;
}

const ProjectSelector = React.forwardRef<HTMLDivElement, ProjectSelectorProps>(({ open, onToggle }: ProjectSelectorProps, ref) => {
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const activeProject = useActiveProject();
  const [, setActiveProjectId] = useAtom(atomActiveProjectId);

  useEffect(() => {
    const mutableRef = ref as MutableRefObject<HTMLDivElement | null>;

    const handleClickOutside = (event: MouseEvent) => {
      if (mutableRef.current && !mutableRef.current.contains(event.target as Node) && open) {
        onToggle();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref, onToggle, open]);

  const onChange = (project: string) => {
    localStorage.setItem("project", project);
    setActiveProjectId(project);
    navigate("/", { replace: true });
  };

  return (
    <>
      <label htmlFor={"projects"} className="block select-none text-sm font-semibold text-neutral-600">
        Projects
      </label>
      <div ref={ref}>
        <div className="relative mt-1">
          <button
            type="button"
            className={
              "relative w-full cursor-pointer rounded-sm border border-neutral-300 bg-white py-2 pl-3 pr-10 text-left focus:border-neutral-500 focus:outline-hidden focus:ring-1 focus:ring-neutral-500 sm:text-sm"
            }
            aria-haspopup="listbox"
            aria-expanded="true"
            aria-labelledby="listbox-label"
            onClick={onToggle}
          >
            <span className="block flex items-center gap-x-1.5 truncate font-medium">{activeProject?.name ?? "No active project"}</span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <DropdownIndicator open={open} />
            </span>
          </button>

          <AnimatePresence>
            {open && (
              <motion.ul
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.1 }}
                className={"absolute z-50 mt-1 w-full rounded-sm bg-white text-base shadow-md ring-1 ring-neutral-800 ring-opacity-5 focus:outline-hidden sm:text-sm"}
                tabIndex={-1}
                role="listbox"
                aria-labelledby="listbox-label"
                aria-activedescendant="listbox-option-3"
              >
                <div className={"scrollbar-w-2 scrollbar scrollbar-thumb-rounded-full scrollbar-thumb-neutral-400 scrollbar-track-neutral-100 max-h-72 overflow-y-scroll p-1"}>
                  {projects?.map((project) => {
                    return (
                      <li
                        key={`projects-${project.id}`}
                        className="relative flex cursor-default select-none items-center rounded-md py-2.5 pl-2.5 text-neutral-800 transition ease-in-out hover:bg-neutral-100"
                        onClick={() => {
                          onChange(project.id);
                          onToggle();
                        }}
                      >
                        <span className={`${project.id === activeProject?.id ? "font-medium" : "font-normal"} flex items-center truncate`}>{project.name}</span>
                        {project.id === activeProject?.id ? (
                          <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-800">
                            <Check size={18} />
                          </span>
                        ) : null}
                      </li>
                    );
                  })}

                  <hr className={"my-0.5"} />
                  <li
                    className="relative flex cursor-default select-none items-center rounded-md py-2.5 pl-2.5 text-neutral-800 transition ease-in-out hover:bg-neutral-100"
                    onClick={() => navigate("/new")}
                  >
                    <span className="flex items-center truncate font-normal">Create new project</span>
                  </li>
                </div>
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
});

export default ProjectSelector;
