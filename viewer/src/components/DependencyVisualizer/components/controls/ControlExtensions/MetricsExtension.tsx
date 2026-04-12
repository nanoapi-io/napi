import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../../shadcn/Tooltip.tsx";
import { Button } from "../../../../shadcn/Button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../../shadcn/Dropdownmenu.tsx";
import type { Metric } from "../../../../../types/dependencyManifest.ts";
import {
  metricLinesCount,
  metricCodeLineCount,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricDependencyCount,
  metricDependentCount,
  metricCyclomaticComplexity,
} from "../../../../../types/dependencyManifest.ts";

export default function MetricsExtension(props: {
  busy: boolean;
  metricState: {
    metric: Metric | undefined;
    setMetric: (metric: Metric | undefined) => void;
  };
}) {
  const metric = props.metricState.metric;

  function getMetricLabel(metric: Metric | undefined) {
    switch (metric) {
      case metricLinesCount: return "Lines";
      case metricCodeLineCount: return "Code Lines";
      case metricCharacterCount: return "Chars";
      case metricCodeCharacterCount: return "Code Chars";
      case metricDependencyCount: return "Dependencies";
      case metricDependentCount: return "Dependents";
      case metricCyclomaticComplexity: return "Complexity";
      default: return "None";
    }
  }

  return (
    <Tooltip delayDuration={500}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button variant="ghost" disabled={props.busy}>
              {getMetricLabel(metric)}
            </Button>
          </TooltipTrigger>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {([
            { metric: undefined, label: "No Metric" },
            { metric: metricLinesCount, label: "Lines" },
            { metric: metricCodeLineCount, label: "Code Lines" },
            { metric: metricCharacterCount, label: "Total Characters" },
            { metric: metricCodeCharacterCount, label: "Code Characters" },
            { metric: metricDependencyCount, label: "Dependencies" },
            { metric: metricDependentCount, label: "Dependents" },
            { metric: metricCyclomaticComplexity, label: "Complexity" },
          ] as { metric: Metric | undefined; label: string }[]).map((val) => (
            <DropdownMenuItem
              key={val.label}
              onClick={() => props.metricState?.setMetric?.(val.metric)}
            >
              {val.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <TooltipContent>Select a metric to display on the graph</TooltipContent>
    </Tooltip>
  );
}
