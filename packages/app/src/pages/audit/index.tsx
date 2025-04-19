import { useContext, useEffect, useRef, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router";
import Controls from "../../components/Cytoscape/Controls";
import { CytoscapeSkeleton } from "../../components/Cytoscape/Skeleton";
import ActionMenu from "../../components/Cytoscape/ActionMenu";
import { ThemeContext } from "../../contexts/ThemeContext";
import { AuditContext } from "./base";
import { DetailsPane } from "../../components/Cytoscape/DetailsPane";
import {
  NapiNodeData,
  NapiProjectEngine,
  TargetMetric,
} from "../../helpers/cytoscape/projectOverview";

export default function AuditPage() {
  const [searchParams] = useSearchParams();
  const context = useOutletContext<AuditContext>();

  const themeContext = useContext(ThemeContext);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<boolean>(true);
  const [napiProjectEngine, setNapiProjectEngine] = useState<
    NapiProjectEngine | undefined
  >(undefined);

  const metricTypeFromUrl = (searchParams.get("metricType") ||
    "noMetric") as TargetMetric;

  const [metricType, setMetricType] = useState<TargetMetric>(metricTypeFromUrl);

  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [selectedNodeData, setSelectedNodeData] = useState<NapiNodeData | null>(
    null,
  );

  const [detailsPaneOpen, setDetailsPaneOpen] = useState(false);

  // On mount useEffect
  useEffect(() => {
    setBusy(true);

    const napiProjectEngine = new NapiProjectEngine(
      containerRef.current as HTMLElement,
      context.dependencyManifest,
      context.auditManifest,
      {
        theme: () => themeContext.theme,
        defaultMetric: metricType,
        onAfterNodeRightClick: handleAfterNodeRightClick,
      },
    );

    setNapiProjectEngine(napiProjectEngine);

    setBusy(false);

    // Cleanup on unmount
    return () => {
      napiProjectEngine?.cy.destroy();
      setNapiProjectEngine(undefined);
    };
  }, [context.dependencyManifest, context.auditManifest]);

  // Hook to update the target metric in the graph
  useEffect(() => {
    if (napiProjectEngine) {
      napiProjectEngine.setTargetMetric(metricType);
    }
  }, [metricType]);

  function handleAfterNodeRightClick(options: {
    position: { x: number; y: number };
    data: NapiNodeData;
  }) {
    setContextMenuPosition(options.position);
    setContextMenuOpen(true);
    setSelectedNodeData(options.data);
  }

  // function createCyListeners(cy: Core) {
  //   // On tap to the background, remove the context menu
  //   cy.on("onetap", () => {
  //     if (contextMenuOpen) {
  //       setContextMenuOpen(false);
  //       setSelectedNodeData(null);
  //     }
  //   });

  //   // On tap to a node, display details of the node if relevant
  //   cy.on("onetap", "node", (evt: EventObjectNode) => {
  //     if (contextMenuOpen) {
  //       setContextMenuOpen(false);
  //       setSelectedNodeData(null);
  //     }

  //     handleNodeSelection(cy, evt.target);
  //   });

  //   // On double tap we redirect to file or instance view
  //   cy.on("dbltap", "node", (evt: EventObjectNode) => {
  //     const node = evt.target;
  //     const data = node.data() as NodeData;
  //     const urlEncodedFileName = encodeURIComponent(data.customData.fileName);
  //     navigate(`/audit/${urlEncodedFileName}`);
  //   });

  //   // On right click, display the context menu
  //   cy.on("cxttap", "node", (evt: EventObjectNode) => {
  //     const node = evt.target;
  //     const { x, y } = node.renderedPosition();
  //     const data = node.data() as NodeData;

  //     setContextMenuPosition({ x, y });
  //     setContextMenuOpen(true);
  //     setSelectedNodeData(data);
  //   });

  //   return cy;
  // }

  // // Handle node selection and highlighting
  // function handleNodeSelection(cy: Core, node: cytoscape.NodeSingular) {
  //   const allElements = cy.elements();
  //   const connectedNodes = node.closedNeighborhood().nodes().difference(node);
  //   const dependencyEdges = node
  //     .connectedEdges()
  //     .filter(
  //       (edge: cytoscape.EdgeSingular) => edge.source().id() === node.id(),
  //     );
  //   const dependentEdges = node
  //     .connectedEdges()
  //     .filter(
  //       (edge: cytoscape.EdgeSingular) => edge.target().id() === node.id(),
  //     );
  //   const backgroundElements = cy
  //     .elements()
  //     .difference(node.closedNeighborhood());

  //   const isAlreadySelected = node.hasClass("selected");

  //   // remove all, clean state
  //   allElements.removeClass([
  //     "background",
  //     "selected",
  //     "connected",
  //     "dependency",
  //     "dependent",
  //     "highlighted",
  //   ]);
  //   // Also unset the highlighted node
  //   context.actions.setHighlightedNodeId(null);

  //   const focusElements = [node, ...connectedNodes];

  //   if (isAlreadySelected) {
  //     if (viewType !== "default") {
  //       cy.nodes().forEach((node) => {
  //         node.style({
  //           "border-color":
  //             tailwindConfig.theme.extend.colors.border[themeContext.theme],
  //           "background-color": node.data("x-audit-color"),
  //         });
  //       });
  //     } else {
  //       cy.nodes().forEach((node) => {
  //         node.removeStyle();
  //       });
  //     }
  //     return;
  //   }

  //   // add background class to background elements
  //   backgroundElements.addClass("background");
  //   // add connected class to connected nodes
  //   connectedNodes.addClass("connected");
  //   // add dependency class to dependency edges
  //   dependencyEdges.addClass("dependency");
  //   // add dependent class to dependent edges
  //   dependentEdges.addClass("dependent");
  //   // add selected class to selected node
  //   node.addClass("selected");

  //   if (viewType !== "default") {
  //     // change background color to border color if one of the views
  //     // is selected
  //     focusElements.forEach((element) => {
  //       element.style({
  //         "border-color": element.data("x-audit-color"),
  //         "background-color":
  //           tailwindConfig.theme.extend.colors.background[themeContext.theme],
  //       });
  //     });
  //   } else {
  //     // change colors back to default
  //     focusElements.forEach((element) => {
  //       element.removeStyle();
  //     });
  //   }

  //   // layout the closed neighborhood
  //   node.closedNeighborhood().layout(layout).run();
  // }

  return (
    <div className="relative w-full h-full">
      {(context.busy || busy || !napiProjectEngine) && <CytoscapeSkeleton />}

      {napiProjectEngine && (
        <Controls
          busy={context.busy || busy}
          cy={napiProjectEngine.cy}
          onLayout={() => napiProjectEngine.layoutGraph(napiProjectEngine.cy)}
          metricType={metricType}
          changeMetricType={setMetricType}
        />
      )}

      <ActionMenu
        x={contextMenuPosition.x}
        y={contextMenuPosition.y}
        nodeData={selectedNodeData}
        open={contextMenuOpen}
        onOpenChange={setContextMenuOpen}
        showInSidebar={context.actions.showInSidebar}
        setDetailsPaneOpen={setDetailsPaneOpen}
      />

      <DetailsPane
        nodeData={selectedNodeData}
        open={detailsPaneOpen}
        setOpen={setDetailsPaneOpen}
      />

      {/* This is the container for Cytoscape */}
      {/* It is important to set the width and height to 100% */}
      {/* Otherwise, Cytoscape will not render correctly */}
      <div ref={containerRef} className="relative w-full h-full z-1" />
    </div>
  );
}
