import { useState, useEffect } from "react";
import {
  Button,
  DropdownMenu,
  TextField,
  IconButton,
  Checkbox,
} from "@radix-ui/themes";
import { LuChevronUp, LuX } from "react-icons/lu";
import { Core } from "cytoscape";
import { toast } from "react-toastify";
import {
  MdFilterCenterFocus,
  MdOutlineAccountTree,
  MdOutlineZoomIn,
  MdOutlineZoomOut,
  MdFilterAlt,
  MdSearch,
} from "react-icons/md";
import {
  charactersMetric,
  dependenciesMetric,
  linesOfCodeMetric,
  noMetric,
  TargetMetric,
} from "../../helpers/cytoscape/projectDependencyVisualizer/types.js";
import { NodeElementDefinition } from "../../helpers/cytoscape/views/auditFile.js";

const INITIAL_ELEMENT_LIMIT = 50;

interface FiltersType {
  search: string;
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
  metricType?: TargetMetric;
  setMetricType?: (metricType: TargetMetric) => void;
}) {
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [filters, setFilters] = useState<FiltersType>({
    search: "",
    showExternal: true,
    showInternal: true,
    showVariables: true,
    showFunctions: true,
    showClasses: true,
  });
  const [searchedNodeIds, setSearchedNodeIds] = useState<string[]>([]);

  function checkFiltersSet() {
    if (!filters) return false;

    if (filters.search.length > 0) {
      return true;
    }

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
    if (!props.cy || props.metricType) return;

    const elements = props.cy.elements();

    if (elements.length > INITIAL_ELEMENT_LIMIT) {
      toast.info(
        "We've auto-collapsed the graph to improve performance. You can expand nodes via filter and search to see more details.",
      );
      setFilters({
        search: "",
        showExternal: false,
        showInternal: false,
        showVariables: true,
        showFunctions: true,
        showClasses: true,
      });
    }
  }, [props.cy]);

  // Debounce the search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(filters.search);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [filters.search]);

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
  }, [filters.showExternal, props.cy]);

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
  }, [filters.showInternal, props.cy]);

  // Show and hide variables
  useEffect(() => {
    if (!props.cy) return;

    // Grab only the variable nodes
    const nodes = props.cy.nodes().filter((node) => {
      return node.data("customData").instance?.type === "variable";
    });
    if (filters.showVariables) {
      nodes.removeClass("hidden");
    } else {
      nodes.addClass("hidden");
    }
  }, [filters.showVariables, props.cy]);

  // Show and hide functions
  useEffect(() => {
    if (!props.cy) return;

    // Grab only the function nodes
    const nodes = props.cy.nodes().filter((node) => {
      return node.data("customData").instance?.type === "function";
    });
    if (filters.showFunctions) {
      nodes.removeClass("hidden");
    } else {
      nodes.addClass("hidden");
    }
  }, [filters.showFunctions, props.cy]);

  // Show and hide classes
  useEffect(() => {
    if (!props.cy) return;

    // Grab only the class nodes
    const nodes = props.cy.nodes().filter((node) => {
      return node.data("customData").instance?.type === "class";
    });

    if (filters.showClasses) {
      nodes.removeClass("hidden");
    } else {
      nodes.addClass("hidden");
    }
  }, [filters.showClasses, props.cy]);

  // Filter based off of search results
  useEffect(() => {
    if (!props.cy) return;

    // Grab all of the nodes
    const nodes = props.cy.nodes();

    // If there is no search term, and there was one before,
    // then we want to show all of the nodes we recently hid
    if (filters.search.length === 0 && searchedNodeIds.length > 0) {
      nodes.forEach((node) => {
        if (searchedNodeIds.includes(node.id())) {
          node.removeClass("hidden");
        }
      });
      setSearchedNodeIds([]);
      return;
    } else if (filters.search.length > 0 && searchedNodeIds.length > 0) {
      // If there is a search term, and there was one before,
      // then we want to show all of the nodes we recently hid
      // that now match the current term again
      nodes.forEach((node) => {
        if (searchedNodeIds.includes(node.id())) {
          const data = node.data() as NodeElementDefinition["data"];
          const label = data.label.toLowerCase();
          const searchTerm = filters.search.toLowerCase();

          if (label.includes(searchTerm)) {
            node.removeClass("hidden");
            setSearchedNodeIds((prev) => prev.filter((id) => id !== node.id()));
          }
        }
      });
      return;
    }

    if (!debouncedSearch) {
      return;
    }

    // Filter based off of the search term
    nodes.forEach((node) => {
      console.log("node", node);
      const data = node.data() as NodeElementDefinition["data"];
      const label = data.label.toLowerCase();
      const searchTerm = filters.search.toLowerCase();

      if (!label.includes(searchTerm)) {
        node.addClass("hidden");
        setSearchedNodeIds((prev) => [...prev, node.id()]);
      }
    });
  }, [debouncedSearch, props.cy]);

  function showNodeViewControls() {
    if (props.metricType && props.setMetricType) {
      const metricType = props.metricType;

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
              {metricType === "linesOfCode"
                ? "LoC"
                : metricType === "characters"
                  ? "Chars"
                  : metricType === "dependencies"
                    ? "Deps"
                    : "None"}
              <LuChevronUp />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content color="violet" variant="soft">
            <DropdownMenu.Item onClick={() => props.setMetricType?.(noMetric)}>
              No Metric
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => props.setMetricType?.(linesOfCodeMetric)}
            >
              Lines of Code
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => props.setMetricType?.(charactersMetric)}
            >
              File Characters
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => props.setMetricType?.(dependenciesMetric)}
            >
              Dependencies
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      );
    } else {
      return <></>;
    }
  }

  function showFileViewControls() {
    if (props.metricType) {
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
            className={`${checkFiltersSet() ? "bg-primary-light/20 dark:bg-primary-dark/20" : ""}`}
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
          <TextField.Root
            value={filters.search}
            onChange={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFilters({ ...filters, search: e.target.value });
            }}
          >
            <TextField.Slot>
              <MdSearch />
            </TextField.Slot>
            {filters.search && filters.search.length > 2 && (
              <TextField.Slot>
                <IconButton
                  variant="ghost"
                  size="1"
                  className="text-text-light dark:text-text-dark"
                  onClick={() => setFilters({ ...filters, search: "" })}
                >
                  <LuX />
                </IconButton>
              </TextField.Slot>
            )}
          </TextField.Root>
          <DropdownMenu.Separator />
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
                search: "",
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
