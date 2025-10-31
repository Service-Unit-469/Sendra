export const DangerButton = ({ children, ...props }: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>) => (
  <button {...props} className="flex items-center gap-x-2 rounded-sm bg-red-600 px-8 py-2 text-center text-sm font-medium text-white transition ease-in-out hover:bg-red-700">
    {children}
  </button>
);
