import { Button, DropdownMenu, Tooltip } from "@radix-ui/themes";
import { LuChevronUp } from "react-icons/lu";
import {
  Metric,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "@nanoapi.io/shared";

// Extension for the controls in the project view
export default function MetricsExtension(props: {
  busy: boolean;
  metricState: {
    metric: Metric;
    setMetric: (metric: string) => void;
  };
}) {
  const metric = props.metricState.metric;

  function getMetricLabel(metric: Metric) {
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
      return "No Metric";
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        <Tooltip
          content="Select metric to highlight failing nodes for that metric"
          side="top"
        >
          <Button
            size="1"
            variant="ghost"
            color="violet"
            highContrast
            disabled={props.busy}
            className="py-1.5"
          >
            {getMetricLabel(metric)}
            <LuChevronUp />
          </Button>
        </Tooltip>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content color="violet" variant="soft">
        <DropdownMenu.Item
          onClick={() => props.metricState?.setMetric?.(undefined)}
          disabled={props.busy}
        >
          No Metric
        </DropdownMenu.Item>
        {(
          [
            { metric: metricLinesCount, label: "Total Lines" },
            { metric: metricCodeLineCount, label: "Code Lines" },
            { metric: metricCharacterCount, label: "Total Characters" },
            { metric: metricCodeCharacterCount, label: "Code Characters" },
            { metric: metricDependencyCount, label: "Dependencies Count" },
            { metric: metricDependentCount, label: "Dependents Count" },
            {
              metric: metricCyclomaticComplexity,
              label: "Cyclomatic Complexity",
            },
          ] as { metric: Metric; label: string }[]
        ).map(({ metric, label }) => (
          <DropdownMenu.Item
            key={metric}
            onClick={() => props.metricState?.setMetric?.(metric)}
          >
            {label}
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
