import { Button, DropdownMenu } from "@radix-ui/themes";
import { LuChevronUp } from "react-icons/lu";
import { Core } from "cytoscape";
import {
  MdFilterCenterFocus,
  MdOutlineAccountTree,
  MdOutlineZoomIn,
  MdOutlineZoomOut,
} from "react-icons/md";
import {
  charactersMetric,
  dependenciesMetric,
  linesOfCodeMetric,
  noMetric,
  TargetMetric,
} from "../../helpers/cytoscape/projectOverview";

export default function Controls(props: {
  busy: boolean;
  cy: Core;
  onLayout: () => void;
  metricType?: TargetMetric;
  changeMetricType?: (metricType: TargetMetric) => void;
}) {
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

  function updateUrlQueryParams(
    key: string,
    value: string | number | boolean | null,
  ) {
    const fullHash = window.location.hash; // e.g., "#/audit/file/blahId?oldParam=123"
    const [path, queryString = ""] = fullHash.slice(1).split("?");

    const searchParams = new URLSearchParams(queryString);
    if (value === null) {
      searchParams.delete(key);
    } else {
      searchParams.set(key, String(value));
    }

    const newHash = `#${path}?${searchParams.toString()}`;
    window.history.replaceState(null, "", newHash);
  }

  function changeMetricType(metricType: TargetMetric) {
    if (props.changeMetricType) {
      props.changeMetricType(metricType);
      updateUrlQueryParams("metricType", metricType);
    }
  }

  function showNodeViewControls() {
    if (props.metricType && props.changeMetricType) {
      const metricType = props.metricType;

      return (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button
              size="1"
              variant="ghost"
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
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={() => changeMetricType(noMetric)}>
              No Metric
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => changeMetricType(linesOfCodeMetric)}
            >
              Lines of Code
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => changeMetricType(charactersMetric)}
            >
              File Characters
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onClick={() => changeMetricType(dependenciesMetric)}
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

  return (
    <div className="absolute bottom-6 inset-x-4 z-10 flex justify-around">
      <div className="flex gap-3 items-center">
        <div className="bg-background-light dark:bg-background-dark flex gap-4 py-2 px-3 rounded-lg">
          <Button
            size="1"
            variant="ghost"
            highContrast
            disabled={props.busy}
            onClick={handleFit}
          >
            <MdFilterCenterFocus className="text-2xl h-5 w-5" />
          </Button>
          <Button
            size="1"
            variant="ghost"
            highContrast
            disabled={props.busy}
            onClick={() => props.onLayout()}
          >
            <MdOutlineAccountTree className="text-xl h-5 w-5" />
          </Button>
          <Button
            size="1"
            variant="ghost"
            highContrast
            disabled={props.busy}
            onClick={() => handleZoom(0.9)}
          >
            <MdOutlineZoomOut className="text-2xl h-5 w-5" />
          </Button>
          <Button
            size="1"
            variant="ghost"
            highContrast
            disabled={props.busy}
            onClick={() => handleZoom(1.1)}
          >
            <MdOutlineZoomIn className="text-2xl h-5 w-5" />
          </Button>
          {showNodeViewControls()}
        </div>
      </div>
    </div>
  );
}
