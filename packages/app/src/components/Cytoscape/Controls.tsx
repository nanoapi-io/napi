import type { ReactNode } from "react";
import { Button } from "../shadcn/Button.tsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/Tooltip.tsx";
import type { Core } from "cytoscape";
import { Focus, Network, ZoomIn, ZoomOut } from "lucide-react";

export default function Controls(props: {
  busy: boolean;
  cy: Core;
  onLayout: () => void;
  showFilters?: boolean;
  children?: ReactNode;
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

  return (
    <div className="absolute bottom-6 inset-x-4 z-10 flex justify-around">
      <div className="flex gap-3 items-center">
        <div className="flex space-x-1 p-1 rounded-lg border bg-background">
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                disabled={props.busy}
                onClick={handleFit}
              >
                <Focus />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Fit to screen
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                disabled={props.busy}
                onClick={() => props.onLayout()}
              >
                <Network />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Reset layout
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                disabled={props.busy}
                onClick={() => handleZoom(0.9)}
              >
                <ZoomOut />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Zoom out
            </TooltipContent>
          </Tooltip>
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                disabled={props.busy}
                onClick={() => handleZoom(1.1)}
              >
                <ZoomIn />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Zoom in
            </TooltipContent>
          </Tooltip>
          {/* Used to pass extensions into the controls */}
          {props.children}
        </div>
      </div>
    </div>
  );
}
