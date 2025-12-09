import { type HTMLMotionProps, motion } from "framer-motion";

export const BlackButton = ({ children, ...props }: HTMLMotionProps<"button">) => {
  return (
    <motion.button
      {...props}
      whileHover={props.disabled ? undefined : { scale: 1.05 }}
      whileTap={props.disabled ? undefined : { scale: 0.9 }}
      className={`flex items-center justify-center gap-x-1 rounded-sm bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white ${props.disabled ? "opacity-50 cursor-not-allowed" : ""} ${props.className}`}
    >
      {children}
    </motion.button>
  );
};
