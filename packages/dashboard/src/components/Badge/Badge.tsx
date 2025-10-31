export interface BadgeProps {
  type: "info" | "danger" | "warning" | "success" | "purple";
}

const styles = {
  info: "bg-blue-100 text-blue-800",
  danger: "bg-red-100 text-red-800",
  warning: "bg-yellow-100 text-yellow-800",
  success: "bg-green-100 text-green-800",
  purple: "bg-purple-100 text-purple-800",
};

/**
 * @param root0
 * @param root0.type
 * @param root0.children
 */
export default function Badge({ type = "info", children }: React.ComponentProps<"span"> & BadgeProps) {
  const classNames = ["inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-medium"];
  classNames.push(styles[type]);

  return <span className={classNames.join(" ")}>{children}</span>;
}
