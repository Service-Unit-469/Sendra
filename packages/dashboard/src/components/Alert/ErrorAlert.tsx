import { AnimatePresence, motion } from "framer-motion";

export const ErrorAlert = ({ message }: { message?: string }) => (
  <AnimatePresence>
    {message && (
      <motion.p initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="mt-1 text-xs text-red-500">
        {message}
      </motion.p>
    )}
  </AnimatePresence>
);
