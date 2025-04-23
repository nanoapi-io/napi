import { useState, useEffect, useRef } from "react";
import { Button, DropdownMenu, Checkbox } from "@radix-ui/themes";
import { LuChevronUp } from "react-icons/lu";
import { Core } from "cytoscape";
import { toast } from "react-toastify";
import {
  MdFilterCenterFocus,
  MdOutlineAccountTree,
  MdOutlineZoomIn,
  MdOutlineZoomOut,
  MdFilterAlt,
} from "react-icons/md";
import {
  Metric,
  metricCharacterCount,
  metricCodeCharacterCount,
  metricCodeLineCount,
  metricCyclomaticComplexity,
  metricDependencyCount,
  metricDependentCount,
  metricLinesCount,
} from "@napi/shared";

const INITIAL_ELEMENT_LIMIT = 75;

interface FiltersType {
  showExternal: boolean;
  showInternal: boolean;
  showVariables: boolean;
  showFunctions: boolean;
  showClasses: boolean;
}

export default function Controls(props: {
  busy: boolean;
  cy: Core;
  onLayout: () => void;
  metric?: Metric;
  setMetric?: (metricType: Metric | undefined) => void;
}) {
  const initialized = useRef(false);
  const [filters, setFilters] = useState<FiltersType>({
    showExternal: true,
    showInternal: true,
    showVariables: true,
    showFunctions: true,
    showClasses: true,
  });

  function checkFiltersSet() {
    if (!filters) return false;

    // For boolean filters, assuming they take the form "show X"
    // then we need to return false if they are set to their default value
    if (!filters.showExternal) {
      return true;
    }

    if (!filters.showInternal) {
      return true;
    }

    if (!filters.showVariables) {
      return true;
    }

    if (!filters.showFunctions) {
      return true;
    }

    if (!filters.showClasses) {
      return true;
    }

    return false;
  }

  function handleFit() {
    const elements = props.cy.elements();
    const padding = 10;
    props.cy.center(elements).fit(elements, padding);
  }

  function handleZoom(zoom: number) {
    const level = props.cy.zoom() * zoom;
    const x = props.cy.width() / 2;
    const y = props.cy.height() / 2;
    const renderedPosition = { x, y };

    props.cy.zoom({
      level,
      renderedPosition,
    });
  }

  // Check the number of elements on the file view
  // if there are more than 50, add some filters
  useEffect(() => {
    if (!props.cy || props.metric) return;

    const elements = props.cy.elements();

    // Handle strict mode for dev
    if (!initialized.current) {
      initialized.current = true;
      return;
    }

    if (elements.length > INITIAL_ELEMENT_LIMIT) {
      toast.info(
        "There are more than 75 elements on screen. We recommend using the filters in the control bar to get a better view of the graph.",
      );
    }
  }, []);

  // Show and hide external nodes and edges
  useEffect(() => {
    if (!props.cy) return;

    // Grab only the external nodes
    const nodes = props.cy.nodes().filter((node) => {
      return node.data("isExternal");
    });

    if (filters.showExternal) {
      nodes.removeClass("hidden");
    } else {
      nodes.addClass("hidden");
    }
  }, [filters.showExternal]);

  // Show and hide internal nodes and edges
  useEffect(() => {
    if (!props.cy) return;

    // Grab only the internal nodes
    const nodes = props.cy.nodes().filter((node) => {
      return !node.data("isExternal") && !node.data("isCurrentFile");
    });
    if (filters.showInternal) {
      nodes.removeClass("hidden");
    } else {
      nodes.addClass("hidden");
    }
  }, [filters.showInternal]);

  // Show and hide variables
  useEffect(() => {
    if (!props.cy) return;

    // Grab only the variable nodes
    const nodes = props.cy.nodes().filter((node) => {
      return (
        node.data("customData").instance?.type === "variable" &&
        node.data("isCurrentFile")
      );
    });
    if (filters.showVariables) {
      nodes.removeClass("hidden");
    } else {
      nodes.addClass("hidden");
    }
  }, [filters.showVariables]);

  // Show and hide functions
  useEffect(() => {
    if (!props.cy) return;

    // Grab only the function nodes
    const nodes = props.cy.nodes().filter((node) => {
      return (
        node.data("customData").instance?.type === "function" &&
        node.data("isCurrentFile")
      );
    });
    if (filters.showFunctions) {
      nodes.removeClass("hidden");
    } else {
      nodes.addClass("hidden");
    }
  }, [filters.showFunctions]);

  // Show and hide classes
  useEffect(() => {
    if (!props.cy) return;

    // Grab only the class nodes
    const nodes = props.cy.nodes().filter((node) => {
      return (
        node.data("customData").instance?.type === "class" &&
        node.data("isCurrentFile")
      );
    });

    if (filters.showClasses) {
      nodes.removeClass("hidden");
    } else {
      nodes.addClass("hidden");
    }
  }, [filters.showClasses]);

  function showNodeViewControls() {
    if (props.metric && props.setMetric) {
      const metric = props.metric;

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
        }
      }

      return (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
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
          </DropdownMenu.Trigger>
          <DropdownMenu.Content color="violet" variant="soft">
            <DropdownMenu.Item
              onClick={() => props.setMetric?.(undefined)}
              className="cursor-not-allowed"
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
                onClick={() => props.setMetric?.(metric)}
              >
                {label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      );
    } else {
      return <></>;
    }
  }

  function showFileViewControls() {
    if (props.metric) {
      return <></>;
    }

    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <Button
            size="1"
            variant="ghost"
            color="violet"
            highContrast
            className={`${checkFiltersSet() && "bg-primary-light/20 dark:bg-primary-dark/20"}`}
            disabled={props.busy}
            onClick={() => props.onLayout()}
          >
            <MdFilterAlt
              className={`text-xl h-5 w-5 ${
                checkFiltersSet()
                  ? "text-primary-light dark:text-primary-dark"
                  : "text-gray-light dark:text-gray-dark"
              }`}
            />
            <LuChevronUp />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content color="violet" variant="soft">
          {/* Add filter options here */}
          <DropdownMenu.Item
            // This keeps the search typing from changing focus
            textValue=""
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              setFilters({ ...filters, showExternal: !filters.showExternal });
            }}
            className="flex justify-between"
          >
            <span>Show external</span>
            <Checkbox
              color="violet"
              checked={filters.showExternal}
              onCheckedChange={(checked) =>
                setFilters({ ...filters, showExternal: Boolean(checked) })
              }
            />
          </DropdownMenu.Item>
          <DropdownMenu.Item
            // This keeps the search typing from changing focus
            textValue=""
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              setFilters({ ...filters, showInternal: !filters.showInternal });
            }}
            className="flex justify-between"
          >
            <span>Show internal</span>
            <Checkbox
              checked={filters.showInternal}
              onCheckedChange={(checked) =>
                setFilters({ ...filters, showInternal: Boolean(checked) })
              }
            />
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            // This keeps the search typing from changing focus
            textValue=""
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              setFilters({ ...filters, showVariables: !filters.showVariables });
            }}
            className="flex justify-between"
          >
            <span>Show variables</span>
            <Checkbox
              checked={filters.showVariables}
              onCheckedChange={(checked) =>
                setFilters({ ...filters, showVariables: Boolean(checked) })
              }
            />
          </DropdownMenu.Item>
          <DropdownMenu.Item
            // This keeps the search typing from changing focus
            textValue=""
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              setFilters({ ...filters, showFunctions: !filters.showFunctions });
            }}
            className="flex justify-between"
          >
            <span>Show functions</span>
            <Checkbox
              checked={filters.showFunctions}
              onCheckedChange={(checked) =>
                setFilters({ ...filters, showFunctions: Boolean(checked) })
              }
            />
          </DropdownMenu.Item>
          <DropdownMenu.Item
            // This keeps the search typing from changing focus
            textValue=""
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              setFilters({ ...filters, showClasses: !filters.showClasses });
            }}
            className="flex justify-between"
          >
            <span>Show classes</span>
            <Checkbox
              checked={filters.showClasses}
              onCheckedChange={(checked) =>
                setFilters({ ...filters, showClasses: Boolean(checked) })
              }
            />
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <Button
            variant="ghost"
            color="violet"
            disabled={!checkFiltersSet()}
            onClick={() => {
              setFilters({
                showExternal: true,
                showInternal: true,
                showVariables: true,
                showFunctions: true,
                showClasses: true,
              });
            }}
            className="mx-3"
          >
            Clear filters
          </Button>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    );
  }

  return (
    <div className="absolute bottom-6 inset-x-4 z-10 flex justify-around">
      <div className="flex gap-3 items-center">
        <div className="bg-background-light dark:bg-background-dark flex gap-4 py-2 px-3 rounded-lg">
          <Button
            size="1"
            variant="ghost"
            color="violet"
            highContrast
            disabled={props.busy}
            onClick={handleFit}
          >
            <MdFilterCenterFocus className="text-2xl h-5 w-5" />
          </Button>
          <Button
            size="1"
            variant="ghost"
            color="violet"
            highContrast
            disabled={props.busy}
            onClick={() => props.onLayout()}
          >
            <MdOutlineAccountTree className="text-xl h-5 w-5" />
          </Button>
          <Button
            size="1"
            variant="ghost"
            color="violet"
            highContrast
            disabled={props.busy}
            onClick={() => handleZoom(0.9)}
          >
            <MdOutlineZoomOut className="text-2xl h-5 w-5" />
          </Button>
          <Button
            size="1"
            variant="ghost"
            color="violet"
            highContrast
            disabled={props.busy}
            onClick={() => handleZoom(1.1)}
          >
            <MdOutlineZoomIn className="text-2xl h-5 w-5" />
          </Button>
          {showNodeViewControls()}
          {showFileViewControls()}
        </div>
      </div>
    </div>
  );
}
