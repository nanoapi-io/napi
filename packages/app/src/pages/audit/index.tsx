import { useContext, useEffect, useRef, useState } from "react";
import Controls from "../../components/Cytoscape/Controls";
import { useNavigate, useOutletContext } from "react-router";
import { CytoscapeSkeleton } from "../../components/Cytoscape/Skeleton";
import { Core, EventObjectNode } from "cytoscape";
import { resizeNodeFromLabel } from "../../helpers/cytoscape/sizeAndPosition";
import cytoscape from "cytoscape";
import coseBilkent from "cytoscape-cose-bilkent";
import {
  getCyElements,
  getCyLayout,
  getCyStyle,
  getNodeLabel,
  NodeElementDefinition,
} from "../../helpers/cytoscape/views/audit";
import { ThemeContext } from "../../contexts/ThemeContext";
import { AuditContext } from "../audit";

export default function AuditPage() {
  const navigate = useNavigate();
  const context = useOutletContext<AuditContext>();

  const themeContext = useContext(ThemeContext);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cyInstance, setCyInstance] = useState<Core | undefined>(undefined);

  useEffect(() => {
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

    cytoscape.use(coseBilkent);
    const cy = cytoscape();

    cy.mount(containerRef.current as Element);

    const style = getCyStyle(themeContext.theme);
    cy.style(style);

    const elements = getCyElements(context.auditResponse);
    cy.add(elements);
    cy.nodes().forEach((node) => {
      resizeNodeFromLabel(node, node.data("label"));
    });

    const layout = getCyLayout(false);
    cy.layout(layout).run();

    createCyListeners(cy);

    setCyInstance(cy);

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
    cy.on("tap", "node", (evt: EventObjectNode) => {
      const node = evt.target;

      const data = node.data() as NodeElementDefinition["data"];

      const isExpanded = !data.isExpanded;

      const label = getNodeLabel({
        isExpanded,
        fileName: data.customData.fileName,
        errorMessages: data.customData.errorMessages,
        warningMessages: data.customData.warningMessages,
      });

      node.data({ label, isExpanded });
      resizeNodeFromLabel(node, label);
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
      const layout = getCyLayout();
      cyInstance.makeLayout(layout).run();
    }
  }

  return (
    <div className="relative w-full h-full">
      {(context.busy || !cyInstance) && <CytoscapeSkeleton />}

      {cyInstance && (
        <Controls busy={false} cy={cyInstance} onLayout={onLayout} />
      )}

      <div ref={containerRef} className="relative w-full h-full z-1" />
    </div>
  );
}
