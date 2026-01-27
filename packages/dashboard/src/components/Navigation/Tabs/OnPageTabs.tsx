import type React from "react";

export type TabsProps = {
  tabs: {
    onClick: () => void;
    text: string;
    active: boolean;
  }[];
};

export const OnPageTabs: React.FC<TabsProps> = ({ tabs }) => {
  return (
    <div>
      <div className="sm:hidden">
        <label htmlFor="tabs" className="sr-only">
          Select a tab
        </label>
        <select
          id="tabs"
          name="tabs"
          className="focus:ring-mirage-500 focus:border-mirage-500 block w-full rounded-sm border-neutral-300 py-2 pl-3 pr-10 text-base focus:outline-hidden sm:text-sm"
          onChange={(e) => tabs.find((tab) => tab.text === e.target.value)?.onClick()}
        >
          {tabs.map((tab) => (
            <option key={tab.text} value={tab.text} selected={tab.active}>
              {tab.text}
            </option>
          ))}
        </select>
      </div>
      <div className="hidden sm:block">
        <div className="border-b border-neutral-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.text}
                onClick={tab.onClick}
                className={`${
                  tab.active ? "border-mirage-500 text-mirage-600" : "text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
                } whitespace-nowrap border-b-2 border-transparent px-1 py-4 text-sm font-medium transition`}
              >
                {tab.text}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
};
