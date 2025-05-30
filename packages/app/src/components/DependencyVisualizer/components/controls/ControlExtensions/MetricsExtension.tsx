import {
  type Metric,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "@napi/shared";
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

// Extension for the controls in the project view
export default function MetricsExtension(props: {
  busy: boolean;
  metricState: {
    metric: Metric | undefined;
    setMetric: (metric: Metric | undefined) => void;
  };
}) {
  const metric = props.metricState.metric;

  function getMetricLabel(metric: Metric | undefined) {
    if (metric === metricLinesCount) {
      return "Lines";
    }
    if (metric === metricCodeLineCount) {
      return "Code Lines";
    }
    if (metric === metricCharacterCount) {
      return "Chars";
    }
    if (metric === metricCodeCharacterCount) {
      return "Code Chars";
    }
    if (metric === metricDependencyCount) {
      return "Dependencies";
    }
    if (metric === metricDependentCount) {
      return "Dependents";
    }
    if (metric === metricCyclomaticComplexity) {
      return "Complexity";
    } else {
      return "None";
    }
  }

  return (
    <Tooltip delayDuration={500}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              disabled={props.busy}
            >
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
      <TooltipContent>
        Select a metric to display on the graph
      </TooltipContent>
    </Tooltip>
  );
}
