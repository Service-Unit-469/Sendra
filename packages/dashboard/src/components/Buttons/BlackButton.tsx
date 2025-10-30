import { type HTMLMotionProps, motion } from "framer-motion";

export const BlackButton = ({ children, ...props }: HTMLMotionProps<"button">) => {
  return (
    <motion.button
      {...props}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.9 }}
      className="flex items-center justify-center gap-x-1 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"
    >
      {children}
    </motion.button>
  );
};
