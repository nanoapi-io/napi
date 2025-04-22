import { useContext, useEffect, useRef, useState } from "react";
import cytoscape, { Core } from "cytoscape";
import Controls from "../../../components/Cytoscape/Controls.js";
import { useOutletContext, useParams, useNavigate } from "react-router";
import fcose from "cytoscape-fcose";
import { ThemeContext } from "../../../contexts/ThemeContext.js";
import {
  getCyElements,
  layout,
  getCyStyle,
  NodeElementDefinition,
  getNodeLabel,
} from "../../../helpers/cytoscape/views/auditFile.js";
import { CytoscapeSkeleton } from "../../../components/Cytoscape/Skeleton.js";
import { AuditContext } from "../base.js";

export default function AuditFilePage() {
  const navigate = useNavigate();
  const params = useParams<{ file: string }>();
  const context = useOutletContext<AuditContext>();
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cyInstance, setCyInstance] = useState<Core | undefined>(undefined);

  // Initialize and cleanup Cytoscape
  useEffect(() => {
    if (context.busy) return;

    if (cyInstance) {
      cyInstance.destroy();
      setCyInstance(undefined);
    }

    const cy = initializeCytoscape();
    setCyInstance(cy);

    return () => {
      cy.destroy();
      setCyInstance(undefined);
    };
  }, [context.busy, params.file]);

  // Update style when theme changes
  useEffect(() => {
    cyInstance?.style(getCyStyle(themeContext.theme));
  }, [themeContext.changeTheme]);

  function initializeCytoscape() {
    cytoscape.use(fcose);
    const cy = cytoscape();
    cy.mount(containerRef.current as Element);

    // Apply style
    cy.style(getCyStyle(themeContext.theme));

    // Add elements
    const elements = getCyElements(
      context.dependencyManifest,
      context.auditManifest,
      params.file as string,
    );
    cy.add(elements);

    // Apply layout
    cy.layout(layout).run();

    // Add event listeners
    addEventListeners(cy);

    return cy;
  }

  function addEventListeners(cy: Core) {
    // Toggle node expansion on tap
    cy.on("tap", "node", (evt) => {
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
    });

    // Navigate to file/instance on double tap
    cy.on("dbltap", "node", (evt) => {
      const node = evt.target;
      const data = node.data() as NodeElementDefinition["data"];

      if (data.isExternal) return;

      const urlEncodedFileName = encodeURIComponent(data.customData.fileName);
      let url = `/audit/${urlEncodedFileName}`;

      if (data.type === "instance" && data.customData.instance) {
        const urlEncodedInstance = encodeURIComponent(
          data.customData.instance.name,
        );
        url += `/${urlEncodedInstance}`;
      }

      navigate(url);
    });

    return cy;
  }

  function handleLayout() {
    cyInstance?.makeLayout(layout).run();
  }

  return (
    <div className="relative w-full h-full">
      {context.busy || !cyInstance ? (
        <CytoscapeSkeleton />
      ) : (
        <Controls busy={false} cy={cyInstance} onLayout={handleLayout} />
      )}
      <div ref={containerRef} className="relative w-full h-full z-1" />
    </div>
  );
}
