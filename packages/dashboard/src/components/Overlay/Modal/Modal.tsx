import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type React from "react";
import { BlackButton } from "../../Buttons/BlackButton";
import { SecondaryButton } from "../../Buttons/SecondaryButton";

export type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  onToggle?: () => void;
  onAction?: () => void;
  children?: React.ReactNode;
  action?: string;
  type: "info" | "danger";
  icon?: React.ReactNode;
  hideActionButtons?: boolean;
};

export default function Modal({ title, description, isOpen, onToggle, onAction = () => {}, children, action, type, icon, hideActionButtons = false }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-20 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ ease: "easeInOut", duration: 0.15 }}
              className="fixed inset-0 z-20 bg-neutral-500 bg-opacity-75 transition ease-in-out"
              aria-hidden="true"
              onClick={onToggle}
            />

            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">
              &#8203;
            </span>

            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ ease: "easeInOut", duration: 0.15 }}
              className="relative z-40 inline-block transform overflow-hidden rounded-lg border border-black border-opacity-5 bg-white px-8 py-10 text-left align-bottom shadow-2xl sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle"
            >
              {onToggle && (
                <div className="absolute right-0 top-0 hidden p-8 sm:block">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      onToggle();
                    }}
                    type="button"
                    className="rounded-md bg-white text-neutral-400 transition hover:text-neutral-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    <span className="sr-only">Close</span>

                    <X />
                  </button>
                </div>
              )}
              <div className="sm:flex sm:items-start">
                {type === "info" ? (
                  <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-neutral-100 p-3 text-neutral-800 sm:mx-0 sm:h-12 sm:w-12">
                    <svg
                      className="h-6 w-6"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      {icon ?? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
                    </svg>
                  </div>
                ) : (
                  <div className="mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-red-50 sm:mx-0 sm:h-10 sm:w-10">
                    <svg
                      className="h-6 w-6 text-red-900"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      {icon ?? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      )}
                    </svg>
                  </div>
                )}

                <div className="mt-3 flex-1 sm:ml-4 sm:mt-0 sm:text-left">
                  <div className={"mb-3"}>
                    <p className={"text-lg font-semibold text-neutral-800"}>{title}</p>
                    <p className={"text-sm text-neutral-500"}>{description}</p>
                  </div>
                  {children}
                </div>
              </div>

              {!hideActionButtons && (
                <div className={`${children ? "mt-5" : ""} sm:flex sm:flex-row-reverse`}>
                  <BlackButton type="button" className={`${type === "info" ? "" : "bg-red-600 hover:bg-red-700 focus:ring-red-500"} inline-flex sm:ml-3`} onClick={onAction}>
                    {action ? action : "Confirm"}
                  </BlackButton>
                  <SecondaryButton type="button" onClick={onToggle}>
                    Cancel
                  </SecondaryButton>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
