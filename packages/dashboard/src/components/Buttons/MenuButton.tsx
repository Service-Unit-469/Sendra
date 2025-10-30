export const MenuButton = ({ children, ...props }: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) => (
  <button className="flex w-full items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition hover:bg-neutral-100" role="menuitem" tabIndex={-1} {...props}>
    {children}
  </button>
);
