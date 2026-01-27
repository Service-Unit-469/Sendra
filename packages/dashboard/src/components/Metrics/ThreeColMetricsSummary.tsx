import type React from "react";

export type ThreeColMetricsSummaryProps = {
  metrics: [
    {
      label: string;
      value: number;
    },
    {
      label: string;
      value: number;
    },
    {
      label: string;
      value: number;
    },
  ];
};

const ThreeColMetricsSummary: React.FC<ThreeColMetricsSummaryProps> = ({ metrics }) => (
  <div className="grid grid-cols-3 gap-6">
    {metrics.map((metric) => (
      <div key={metric.label}>
        <p className="font-medium text-neutral-600">{metric.label}</p>
        <p className="text-2xl font-semibold text-neutral-800">{Number.isInteger(metric.value) ? metric.value : metric.value.toFixed(2)}</p>
      </div>
    ))}
  </div>
);

export default ThreeColMetricsSummary;
