import { useContext, useEffect, useRef, useState } from "react";
import Controls from "../../components/Cytoscape/Controls";
import { useNavigate, useOutletContext } from "react-router";
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

export default function AuditPage() {
  const navigate = useNavigate();
  const context = useOutletContext<AuditContext>();

  const themeContext = useContext(ThemeContext);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<boolean>(true);
  const [cyInstance, setCyInstance] = useState<Core | undefined>(undefined);

  useEffect(() => {
    setBusy(true);
    // If we already have an instance, reinstantiate it
    // This prevents some bugs with data not being updated
    // when new file is selected
    if (cyInstance) {
      cyInstance.destroy();
      setCyInstance(undefined);
    }

    if (Object.values(context.auditResponse.dependencyManifesto).length === 0) {
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

      if (isAlreadySelected) {
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
        />
      )}

      <div ref={containerRef} className="relative w-full h-full z-1" />
    </div>
  );
}
