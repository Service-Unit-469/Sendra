import { Link } from "react-router-dom";

export type ItemCardActionButton = {
  icon: React.ReactNode;
  label: string;
  to: string;
};

export type ItemCardProps = {
  actionButtons: ItemCardActionButton[];
  id: string;
  name: string;
  children: React.ReactNode;
};

export const ItemCardBody = ({ children, icon }: { children: React.ReactNode; icon: React.ReactNode }) => (
  <>
    <span className="inline-flex rounded-sm bg-neutral-100 p-3 text-neutral-800 ring-4 ring-white">{icon}</span>
    <div className="flex-1 truncate">{children}</div>
  </>
);

export const ItemCard = ({ actionButtons, id, name, children }: ItemCardProps) => {
  return (
    <div className="col-span-1 divide-y divide-neutral-200 rounded-sm border border-neutral-200 bg-white" key={id} title={name} role="listitem">
      <div className="flex w-full items-center justify-between space-x-6 p-6">{children}</div>
      <div>
        {actionButtons.map((button) => (
          <div className="-mt-px flex divide-x divide-neutral-200" key={button.label}>
            <div className="flex w-0 flex-1">
              <Link
                to={button.to}
                className="relative -mr-px inline-flex w-0 flex-1 items-center justify-center rounded-bl border border-transparent py-4 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50 hover:text-neutral-700"
              >
                {button.icon}
                <span className="ml-3">{button.label}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
