import { useEffect, useRef, useState } from "react";
import Controls from "../../../../components/controls/Controls.tsx";
import GraphDepthExtension from "../../../../components/controls/ControlExtensions/GraphDepthExtension.tsx";
import SymbolContextMenu from "../../../../components/contextMenu/SymbolContextMenu.tsx";
import {
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router";
import type { AuditContext } from "../../base.tsx";
import SymbolDetailsPane from "../../../../components/detailsPanes/SymbolDetailsPane.tsx";
import { useTheme } from "../../../../contexts/ThemeProvider.tsx";
import type {
  FileAuditManifest,
  FileDependencyManifest,
  SymbolAuditManifest,
  SymbolDependencyManifest,
} from "@napi/shared";
import { SymbolDependencyVisualizer } from "../../../../helpers/cytoscape/symbolDependencyVisualizer/index.ts";

export default function AuditInstancePage() {
  const navigate = useNavigate();

  const { theme } = useTheme();

  const params = useParams<{ file: string; instance: string }>();

  const [searchParams, setSearchParams] = useSearchParams();

  const context = useOutletContext<AuditContext>();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<boolean>(true);
  const [symbolVisualizer, setSymbolVisualizer] = useState<
    SymbolDependencyVisualizer | undefined
  >(undefined);

  const dependencyDepthFromUrl =
    (searchParams.get("dependencyDepth") || undefined) as number | undefined;
  const dependentDepthFromUrl =
    (searchParams.get("dependentDepth") || undefined) as number | undefined;

  const [dependencyDepth, setDependencyDepth] = useState<number>(
    dependencyDepthFromUrl || 3,
  );
  const [dependentDepth, setDependentDepth] = useState<number>(
    dependentDepthFromUrl || 0,
  );

  function handleDependencyDepthChange(depth: number) {
    setSearchParams({ dependencyDepth: depth.toString() });
    setDependencyDepth(depth);
    // TODO do something with the symbolVisualizer
  }

  function handleDependentDepthChange(depth: number) {
    setSearchParams({ dependentDepth: depth.toString() });
    setDependentDepth(depth);
    // TODO do something with the symbolVisualizer
  }

  const [contextMenu, setContextMenu] = useState<
    {
      position: { x: number; y: number };
      fileDependencyManifest: FileDependencyManifest;
      symbolDependencyManifest: SymbolDependencyManifest;
    } | undefined
  >(undefined);

  const [detailsPane, setDetailsPane] = useState<
    {
      fileDependencyManifest: FileDependencyManifest;
      symbolDependencyManifest: SymbolDependencyManifest;
      fileAuditManifest: FileAuditManifest;
      symbolAuditManifest: SymbolAuditManifest;
    } | undefined
  >(undefined); // Hook to update highlight node in the graph

  // On mount useEffect
  useEffect(() => {
    setBusy(true);

    if (!params.file || !params.instance) {
      return;
    }

    const symbolVisualizer = new SymbolDependencyVisualizer(
      containerRef.current as HTMLElement,
      params.file,
      params.instance,
      dependencyDepth,
      dependentDepth,
      context.dependencyManifest,
      context.auditManifest,
      {
        theme: theme,
        onAfterNodeRightClick: (value: {
          position: { x: number; y: number };
          filePath: string;
          symbolId: string;
        }) => {
          const fileDependencyManifest =
            context.dependencyManifest[value.filePath];
          const symbolDependencyManifest =
            fileDependencyManifest.symbols[value.symbolId];
          setContextMenu({
            position: value.position,
            fileDependencyManifest,
            symbolDependencyManifest,
          });
        },
        onAfterNodeDblClick: (filePath: string, symbolId: string) => {
          const urlEncodedFileName = encodeURIComponent(
            filePath,
          );
          const urlEncodedSymbolId = encodeURIComponent(
            symbolId,
          );
          const urlEncodedSymbolName =
            `/audit/${urlEncodedFileName}/${urlEncodedSymbolId}`;

          navigate(urlEncodedSymbolName);
        },
      },
    );

    setSymbolVisualizer(symbolVisualizer);

    setBusy(false);

    // Cleanup on unmount
    return () => {
      symbolVisualizer?.cy.destroy();
      setSymbolVisualizer(undefined);
    };
  }, [
    context.dependencyManifest,
    context.auditManifest,
    params.file,
    params.instance,
    dependencyDepth,
    dependentDepth,
  ]);

  useEffect(() => {
    if (symbolVisualizer) {
      if (context.highlightedCytoscapeRef) {
        symbolVisualizer.highlightNode(context.highlightedCytoscapeRef);
      } else {
        symbolVisualizer.unhighlightNodes();
      }
    }
  }, [context.highlightedCytoscapeRef]);

  return (
    <div className="relative w-full h-full">
      {/* This is the container for Cytoscape */}
      {/* It is important to set the width and height to 100% */}
      {/* Otherwise, Cytoscape will not render correctly */}
      <div ref={containerRef} className="absolute w-full h-full z-10" />

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <Controls
          busy={context.busy || busy}
          cy={symbolVisualizer?.cy}
          onLayout={() => symbolVisualizer?.layoutGraph(symbolVisualizer.cy)}
        >
          <GraphDepthExtension
            busy={context.busy || busy}
            dependencyState={{
              depth: dependencyDepth,
              setDepth: handleDependencyDepthChange,
            }}
            dependentState={{
              depth: dependentDepth,
              setDepth: handleDependentDepthChange,
            }}
          />
        </Controls>
      </div>

      <SymbolContextMenu
        context={contextMenu}
        onClose={() => setContextMenu(undefined)}
        onOpenDetails={(filePath, symbolId) => {
          const fileDependencyManifest = context.dependencyManifest[filePath];
          const symbolDependencyManifest =
            fileDependencyManifest.symbols[symbolId];
          const fileAuditManifest = context.auditManifest[filePath];
          const symbolAuditManifest = fileAuditManifest.symbols[symbolId];
          setDetailsPane({
            fileDependencyManifest,
            symbolDependencyManifest,
            fileAuditManifest,
            symbolAuditManifest,
          });
        }}
      />

      <SymbolDetailsPane
        context={detailsPane}
        onClose={() => setDetailsPane(undefined)}
        onAddSymbolsForExtraction={(filePath, symbolIds) => {
          context.onAddSymbolsForExtraction(filePath, symbolIds);
        }}
      />
    </div>
  );
}
