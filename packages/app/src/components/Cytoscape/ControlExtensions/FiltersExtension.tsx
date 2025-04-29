import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router";
import { Button, DropdownMenu, Checkbox } from "@radix-ui/themes";
import { LuChevronUp } from "react-icons/lu";
import { Core } from "cytoscape";
import { toast } from "react-toastify";
import { MdFilterAlt } from "react-icons/md";

interface FiltersType {
  showExternal: boolean;
  showInternal: boolean;
  showVariables: boolean;
  showFunctions: boolean;
  showClasses: boolean;
}

export default function FiltersExtension(props: {
  busy: boolean;
  cy: Core;
  onLayout: () => void;
}) {
  const initialized = useRef(false);
  const [filters, setFilters] = useState<FiltersType>({
    showExternal: true,
    showInternal: true,
    showVariables: true,
    showFunctions: true,
    showClasses: true,
  });
  const { file } = useParams();

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

  useEffect(() => {
    if (!props.cy) return;

    const INITIAL_NODE_LIMIT = 50;
    const nodeCount = props.cy.nodes().length;

    // Handle strict mode for dev
    if (!initialized.current) {
      initialized.current = true;
      return;
    }

    if (nodeCount > INITIAL_NODE_LIMIT) {
      toast.info(
        `There are more than ${INITIAL_NODE_LIMIT} elements on screen. We recommend using the filters in the control bar to get a better view of the graph.`,
      );
    }
  }, []);

  // Show and hide external nodes and edges
  useEffect(() => {
    if (!props.cy) return;

    // Grab only the external nodes
    const nodes = props.cy.nodes().filter((node) => {
      return node.data("customData").isExternal;
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
      return (
        !node.data("customData").isExternal &&
        node.data("customData").fileName !== file
      );
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
        node.data("customData").symbolType === "variable" &&
        node.data("customData").fileName === file
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
        node.data("customData").symbolType === "function" &&
        node.data("customData").fileName === file
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
        node.data("customData").symbolType === "class" &&
        node.data("customData").fileName === file
      );
    });

    if (filters.showClasses) {
      nodes.removeClass("hidden");
    } else {
      nodes.addClass("hidden");
    }
  }, [filters.showClasses]);

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
        <DropdownMenu.Label>Supporting files</DropdownMenu.Label>
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
        <DropdownMenu.Label>Main file</DropdownMenu.Label>
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
