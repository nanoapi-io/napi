import { Button, DropdownMenu } from "@radix-ui/themes";
import { LuChevronUp } from "react-icons/lu";
import { Core } from "cytoscape";
import {
  MdFilterCenterFocus,
  MdOutlineAccountTree,
  MdOutlineZoomIn,
  MdOutlineZoomOut,
} from "react-icons/md";

export default function Controls(props: {
  busy: boolean;
  cy: Core;
  onLayout: () => void;
  nodeView?: string;
  changeNodeView?: (viewType: string) => void;
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

  function showNodeViewControls() {
    if (props.nodeView && props.changeNodeView) {
      const nodeView = props.nodeView;
      const changeNodeView = props.changeNodeView;

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
              {nodeView === "linesOfCode"
                ? "LoC"
                : nodeView === "characters"
                  ? "Chars"
                  : nodeView === "dependencies"
                    ? "Deps"
                    : "default"}
              <LuChevronUp />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <DropdownMenu.Item onClick={() => changeNodeView("default")}>
              Default
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => changeNodeView("linesOfCode")}>
              Lines of Code
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => changeNodeView("characters")}>
              File Characters
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={() => changeNodeView("dependencies")}>
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
