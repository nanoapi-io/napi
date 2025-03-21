import { useContext, useEffect, useRef, useState } from "react";
import cytoscape, { Core, EventObjectNode } from "cytoscape";
import Controls from "../../../components/Cytoscape/Controls";
import { useOutletContext, useParams, useNavigate } from "react-router";
import coseBilkent from "cytoscape-cose-bilkent";
import { ThemeContext } from "../../../contexts/ThemeContext";
import { resizeNodeFromLabel } from "../../../helpers/cytoscape/sizeAndPosition";
import {
  getCyElements,
  getCyLayout,
  getCyStyle,
  NodeElementDefinition,
  getNodeLabel,
} from "../../../helpers/cytoscape/views/auditFile";
import { CytoscapeSkeleton } from "../../../components/Cytoscape/Skeleton";
import { AuditContext } from "../../audit";

export default function AuditFilePage() {
  const navigate = useNavigate();
  const params = useParams<{ file: string }>();
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
    if (!params.file) {
      return;
    }

    cytoscape.use(coseBilkent);
    const cy = cytoscape();

    cy.mount(containerRef.current as Element);

    const style = getCyStyle(themeContext.theme);
    cy.style(style);

    const elements = getCyElements(context.auditResponse, params.file);
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
  }, [params.file, context.auditResponse]);

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
        isExternal: data.isExternal,
        type: data.type,
        fileName: data.customData.fileName,
        instance: data.customData.instance,
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

      if (!data.isExternal) {
        const urlEncodedFileName = encodeURIComponent(data.customData.fileName);
        let url = `/audit/${urlEncodedFileName}`;

        if (data.type === "instance" && data.customData.instance) {
          const urlEncodedInstance = encodeURIComponent(
            data.customData.instance.name,
          );
          url += `/${urlEncodedInstance}`;
        }

        navigate(url);
      }
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
