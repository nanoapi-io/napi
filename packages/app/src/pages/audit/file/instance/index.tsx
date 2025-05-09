import { useContext, useEffect, useRef, useState } from "react";
import cytoscape, { Core } from "cytoscape";
import Controls from "../../../../components/Cytoscape/Controls.js";
import GraphDepthExtension from "../../../../components/Cytoscape/ControlExtensions/GraphDepthExtension.js";
import SymbolContextMenu from "../../../../components/Cytoscape/contextMenu/SymbolContextMenu.js";
import { useOutletContext, useParams, useNavigate } from "react-router";
import fcose from "cytoscape-fcose";
import { ThemeContext } from "../../../../contexts/ThemeContext.js";
import {
  layout,
  getCyStyle,
  NodeElementDefinition,
  getNodeLabel,
} from "../../../../helpers/cytoscape/views/auditFile.js";
import { getInstanceCyElements } from "../../../../helpers/cytoscape/views/auditInstance.js";
import { CytoscapeSkeleton } from "../../../../components/Cytoscape/Skeleton.js";
import { AuditContext } from "../../base.js";
import SymbolDetailsPane from "../../../../components/SymbolDetailsPane.js";

const DEFAULT_DEPENDENCY_DEPTH = 1;
const DEFAULT_DEPENDENT_DEPTH = 1;

export default function AuditInstancePage() {
  const navigate = useNavigate();
  const params = useParams<{ file: string; instance: string }>();
  const context = useOutletContext<AuditContext>();
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cyInstance, setCyInstance] = useState<Core | undefined>(undefined);

  const [dependencyDepth, setDependencyDepth] = useState(1);
  const [dependentDepth, setDependentDepth] = useState(1);
  const [depLoading, setDepLoading] = useState(false);

  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [contextMenuSymbolId, setContextMenuSymbolId] = useState<
    string | undefined
  >(undefined);

  const [detailsPaneSymbolId, setDetailsPaneSymbolId] = useState<
    string | undefined
  >(undefined);

  const [detailsPaneOpen, setDetailsPaneOpen] = useState(false);

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

  // Update elements when dependency depth or dependent depth changes
  useEffect(() => {
    if (cyInstance) {
      // Update loading state
      setDepLoading(true);

      // This function lets us wait for the next animation frame before updating the elements
      // This allows us to show the button loading state before blocking
      // the main thread with the cytoscape operations
      setTimeout(() => {
        // Remove existing elements
        cyInstance.elements().remove();

        // Add new elements
        const elements = getInstanceCyElements(
          context.dependencyManifest,
          context.auditManifest,
          params.file as string,
          params.instance as string,
          dependencyDepth,
          dependentDepth,
        );
        cyInstance.add(elements);

        cyInstance.one("layoutstop", () => {
          setDepLoading(false);
        });

        cyInstance.layout(layout).run();
      }, 50);
    }
  }, [dependencyDepth, dependentDepth]);

  function initializeCytoscape() {
    cytoscape.use(fcose);
    const cy = cytoscape();
    cy.mount(containerRef.current as Element);

    // Apply style
    cy.style(getCyStyle(themeContext.theme));

    // Add elements
    const elements = getInstanceCyElements(
      context.dependencyManifest,
      context.auditManifest,
      params.file as string,
      params.instance as string,
      DEFAULT_DEPENDENCY_DEPTH,
      DEFAULT_DEPENDENT_DEPTH,
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

    // Show context menu on right click
    cy.on("cxttap", "node", (evt) => {
      const node = evt.target;
      const data = node.data() as NodeElementDefinition["data"];

      if (data.customData.fileName !== params.file) {
        // ignore clicks on nodes from other files
        return;
      }

      setContextMenuPosition(node.renderedPosition());
      setContextMenuOpen(true);
      setContextMenuSymbolId(data.customData.instance.name);
    });

    return cy;
  }

  function handleLayout() {
    cyInstance?.makeLayout(layout).run();
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="relative w-full h-full z-10" />

      {context.busy || !cyInstance ? (
        <CytoscapeSkeleton />
      ) : (
        <Controls busy={false} cy={cyInstance} onLayout={handleLayout}>
          {/* TODO: Fix data shape for instane-level view and then uncomment */}
          {/* <FiltersExtension
            cy={cyInstance}
            busy={context.busy}
            onLayout={handleLayout}
            /> */}
          <GraphDepthExtension
            cy={cyInstance}
            busy={depLoading}
            dependencyState={{
              depth: dependencyDepth,
              setDepth: setDependencyDepth,
            }}
            dependentState={{
              depth: dependentDepth,
              setDepth: setDependentDepth,
            }}
          />
        </Controls>
      )}

      {contextMenuSymbolId && (
        <SymbolContextMenu
          position={contextMenuPosition}
          fileDependencyManifest={context.dependencyManifest[params.file]}
          symbolId={contextMenuSymbolId}
          open={contextMenuOpen}
          onOpenChange={setContextMenuOpen}
          setDetailsPaneOpen={(open) => {
            setDetailsPaneOpen(open);
            if (open) {
              setDetailsPaneSymbolId(contextMenuSymbolId);
            }
          }}
          setExtractionNodes={context.actions.updateExtractionNodes}
        />
      )}

      {detailsPaneSymbolId && (
        <SymbolDetailsPane
          fileDependencyManifest={context.dependencyManifest[params.file]}
          fileAuditManifest={context.auditManifest[params.file]}
          symbolId={detailsPaneSymbolId}
          open={detailsPaneOpen}
          setOpen={setDetailsPaneOpen}
        />
      )}
    </div>
  );
}
