import { useContext, useEffect, useRef, useState } from "react";
import Controls from "../../components/Cytoscape/Controls";
import { useNavigate, useOutletContext, useSearchParams } from "react-router";
import { CytoscapeSkeleton } from "../../components/Cytoscape/Skeleton";
import { Core, EventObjectNode } from "cytoscape";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import layoutUtilities from "cytoscape-layout-utilities";
import {
  getCyElements,
  layout,
  getCyStyle,
  NodeElementDefinition,
} from "../../helpers/cytoscape/views/audit";
import { ThemeContext } from "../../contexts/ThemeContext";
import { AuditContext } from "../audit";
import { AuditMessage, AuditResponse } from "../../service/auditApi/types";
import tailwindConfig from "../../../tailwind.config";

type NodeViewType = "default" | "linesOfCode" | "characters" | "dependencies";

// Converts a hex color to RGB array
function hexToRgb(hex: string) {
  hex = hex.replace("#", "");
  return [
    parseInt(hex.substring(0, 2), 16),
    parseInt(hex.substring(2, 4), 16),
    parseInt(hex.substring(4, 6), 16),
  ];
}

// Interpolates between two colors
function interpolateColor(color1: number[], color2: number[], factor: number) {
  const result = color1.slice();
  for (let i = 0; i < 3; i++) {
    result[i] = Math.round(color1[i] + factor * (color2[i] - color1[i]));
  }
  return result;
}

// Converts RGB array to hex color string
function rgbToHex(rgb: number[]) {
  return "#" + rgb.map((x) => x.toString(16).padStart(2, "0")).join("");
}

// Severity-color mapping based on your specification
const severityColors: Record<number, string> = {
  0: "#ADFF2F", // green-yellow
  1: "#FFDD00", // yellow
  2: "#FF8C00", // orange
  3: "#DC1414", // red
};

function getSeverity(ratio: number): number {
  if (ratio <= 1.1) return 0;
  if (ratio <= 1.5) return 1;
  if (ratio <= 2.0) return 2;
  return 3;
}

function getInterpolatedSeverityColor(
  valueStr: string,
  targetStr: string,
): string {
  const value = parseFloat(valueStr);
  const target = parseFloat(targetStr);
  const ratio = value / target;
  const severity = getSeverity(ratio);

  let lowerBound: number, upperBound: number;
  switch (severity) {
    case 0:
      [lowerBound, upperBound] = [1, 1.1];
      break;
    case 1:
      [lowerBound, upperBound] = [1.1, 1.5];
      break;
    case 2:
      [lowerBound, upperBound] = [1.5, 2.0];
      break;
    default:
      return severityColors[3]; // severity 3 (red) no interpolation needed
  }

  const factor = (ratio - lowerBound) / (upperBound - lowerBound);
  const startColor = hexToRgb(severityColors[severity]);
  const endColor = hexToRgb(severityColors[severity + 1]);
  const interpolatedRgb = interpolateColor(startColor, endColor, factor);

  return rgbToHex(interpolatedRgb);
}

export default function AuditPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = useOutletContext<AuditContext>();

  const themeContext = useContext(ThemeContext);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<boolean>(true);
  const [cyInstance, setCyInstance] = useState<Core | undefined>(undefined);

  const viewTypeFromUrl = searchParams.get("viewType") as NodeViewType;
  const [viewType, setViewType] = useState<NodeViewType>(viewTypeFromUrl || "default");
  const viewTypeRef = useRef<NodeViewType>(viewType);
  viewTypeRef.current = viewType;

  useEffect(() => {
    setBusy(true);
    // If we already have an instance, reinstantiate it
    // This prevents some bugs with data not being updated
    // when new file is selected
    if (cyInstance) {
      cyInstance.destroy();
      setCyInstance(undefined);
    }

    if (Object.values(context.auditResponse.dependencyManifest).length === 0) {
      return;
    }

    cytoscape.use(fcose);
    cytoscape.use(layoutUtilities);
    const cy = cytoscape();

    cy.mount(containerRef.current as Element);

    const style = getCyStyle(themeContext.theme);
    cy.style(style);

    const elements = getCyElements(context.auditResponse);
    cy.add(elements);

    cy.layout(layout).run();

    createCyListeners(cy);

    setCyInstance(cy);

    setBusy(false);

    // Cleanup on unmount
    return () => {
      cy.destroy();
      setCyInstance(undefined);
    };
  }, [context.auditResponse]);

  useEffect(() => {
    cyInstance?.style(getCyStyle(themeContext.theme));
  }, [themeContext.changeTheme]);

  // Highlight the node when the user selects it in the sidebar
  useEffect(() => {
    if (!cyInstance) return;

    const cy = cyInstance;
    const nodeToHighlight = cy.getElementById(
      context.highlightedNodeId as string,
    );

    cy.batch(() => {
      // Clear previously applied classes quickly
      cy.elements(".highlighted").removeClass(["highlighted"]);

      if (!nodeToHighlight.empty()) {
        // Apply classes for highlighting (no layout!)
        nodeToHighlight.addClass("highlighted");
      }
    });
  }, [context.highlightedNodeId, cyInstance]);

  // Change the node view type, which will place colors on nodes based on
  // the selected view type
  useEffect(() => {
    if (!cyInstance) return;

    context.actions
      .getAuditManifest()
      .then((auditResponse: AuditResponse) => {
        const cy = cyInstance;
        cy.batch(() => {
          // Clear previously applied classes quickly
          cy.elements().removeClass([
            "highlighted",
            "background",
            "selected",
            "connected",
            "dependency",
            "dependent",
            "linesOfCode",
            "characters",
            "dependencies",
          ]);
          context.actions.setHighlightedNodeId(null);

          // If the view type is default, we don't need to do anything else
          if (viewType === "default") {
            // Clear the audit colors and reset the background color
            cy.nodes().forEach((node) => {
              node.data("x-audit-color", "");
              node.style({
                "background-color":
                  tailwindConfig.theme.extend.colors.primary[
                    themeContext.theme
                  ],
              });
            });
            return;
          }

          // Otherwise, apply classes for highlighting (no layout!)
          cy.nodes().addClass(viewType);

          // Apply colors for that type
          cy.nodes().forEach((node) => {
            const data = node.data() as NodeElementDefinition["data"];
            const nodeAuditManifest = auditResponse.auditManifest[data.id];
            if (!nodeAuditManifest) {
              node.data("x-audit-color", "green");
              node.style({
                "background-color": "green",
              });
              return;
            }

            let value: string;
            let target: string;
            let auditError: AuditMessage | undefined;
            switch (viewType) {
              case "linesOfCode":
                auditError = nodeAuditManifest.lookup.targetMaxLineInFile[0];
                if (!auditError) {
                  node.data("x-audit-color", "green");
                  node.style({
                    "background-color": "green",
                  });
                  return;
                }

                value = nodeAuditManifest.lookup.targetMaxLineInFile[0].value;
                target = nodeAuditManifest.lookup.targetMaxLineInFile[0].target;
                break;
              case "characters":
                auditError = nodeAuditManifest.lookup.targetMaxCharInFile[0];
                if (!auditError) {
                  node.data("x-audit-color", "green");
                  node.style({
                    "background-color": "green",
                  });
                  return;
                }

                value = nodeAuditManifest.lookup.targetMaxCharInFile[0].value;
                target = nodeAuditManifest.lookup.targetMaxCharInFile[0].target;
                break;
              case "dependencies":
                auditError = nodeAuditManifest.lookup.targetMaxDepPerFile[0];
                if (!auditError) {
                  node.data("x-audit-color", "green");
                  node.style({
                    "background-color": "green",
                  });
                  return;
                }

                value = nodeAuditManifest.lookup.targetMaxDepPerFile[0].value;
                target = nodeAuditManifest.lookup.targetMaxDepPerFile[0].target;
                break;
              default:
                console.error("Unknown view type: ", viewType);
                return;
            }

            const color = getInterpolatedSeverityColor(value, target);
            console.log("Color: ", color);
            node.data("x-audit-color", color);
            node.style({
              "background-color": color,
            });
          });
        });
      })
      .catch((error) => {
        console.error("Error getting audit manifest:", error);
      });
  }, [viewType, cyInstance]);

  function createCyListeners(cy: Core) {
    // On tap to a node, display details of the node if relevant
    cy.on("onetap", "node", (evt: EventObjectNode) => {
      const node = evt.target;

      const allElements = cy.elements();
      const connectedNodes = node.closedNeighborhood().nodes().difference(node);
      const dependencyEdges = node
        .connectedEdges()
        .filter((edge) => edge.source().id() === node.id());
      const dependentEdges = node
        .connectedEdges()
        .filter((edge) => edge.target().id() === node.id());
      const backgroundElements = cy
        .elements()
        .difference(node.closedNeighborhood());

      const isAlreadySelected = node.hasClass("selected");

      // remove all, clean state
      allElements.removeClass([
        "background",
        "selected",
        "connected",
        "dependency",
        "dependent",
      ]);

      const focusElements = [node, ...connectedNodes];

      if (isAlreadySelected) {
        if (viewTypeRef.current !== "default") {
          cy.nodes().forEach((node) => {
            node.style({
              "border-color":
                tailwindConfig.theme.extend.colors.border[themeContext.theme],
              "background-color": node.data("x-audit-color"),
            });
          });
        } else {
          cy.nodes().forEach((node) => {
            node.removeStyle();
          });
        }
        return;
      }

      // add background class to background elements
      backgroundElements.addClass("background");
      // add connected class to connected nodes
      connectedNodes.addClass("connected");
      // add dependency class to dependency edges
      dependencyEdges.addClass("dependency");
      // add dependent class to dependent edges
      dependentEdges.addClass("dependent");
      // add selected class to selected node
      node.addClass("selected");

      if (viewTypeRef.current !== "default") {
        // change background color to border color if one of the views
        // is selected
        focusElements.forEach((element) => {
          element.style({
            "border-color": element.data("x-audit-color"),
            "background-color":
              tailwindConfig.theme.extend.colors.background[themeContext.theme],
          });
        });
      } else {
        // change colors back to default
        focusElements.forEach((element) => {
          element.removeStyle();
        });
      }

      // layout the closed neighborhood
      node.closedNeighborhood().layout(layout).run();
    });

    // On double tap we redirect to file or instance view
    cy.on("dbltap", "node", (evt: EventObjectNode) => {
      const node = evt.target;

      const data = node.data() as NodeElementDefinition["data"];

      const urlEncodedFileName = encodeURIComponent(data.customData.fileName);
      const url = `/audit/${urlEncodedFileName}`;

      navigate(url);
    });

    return cy;
  }

  function onLayout() {
    if (cyInstance) {
      cyInstance.makeLayout(layout).run();
    }
  }

  return (
    <div className="relative w-full h-full">
      {(context.busy || busy || !cyInstance) && <CytoscapeSkeleton />}

      {cyInstance && (
        <Controls
          busy={context.busy || busy}
          cy={cyInstance}
          onLayout={onLayout}
          // TODO
          nodeView={viewType}
          changeNodeView={setViewType as (viewType: string) => void}
        />
      )}

      <div ref={containerRef} className="relative w-full h-full z-1" />
    </div>
  );
}
