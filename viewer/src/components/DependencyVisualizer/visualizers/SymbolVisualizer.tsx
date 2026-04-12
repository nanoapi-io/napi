import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Controls from "../components/controls/Controls.tsx";
import GraphDepthExtension from "../components/controls/ControlExtensions/GraphDepthExtension.tsx";
import SymbolContextMenu from "../components/contextMenu/SymbolContextMenu.tsx";
import SymbolDetailsPane from "../components/detailsPanes/SymbolDetailsPane.tsx";
import { SymbolDependencyVisualizer } from "../../../cytoscape/symbolDependencyVisualizer/index.ts";
import type { DependencyManifest } from "../../../types/dependencyManifest.ts";
import type { AuditManifest } from "../../../types/auditManifest.ts";
import { useTheme } from "../../../contexts/ThemeProvider.tsx";

interface SymbolVisualizerProps {
  manifestId: string;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  highlightedCytoscapeRef:
    | { filePath: string; symbolId: string | undefined }
    | undefined;
  fileId: string;
  instanceId: string;
}

export default function SymbolVisualizer(props: SymbolVisualizerProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

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
    searchParams.set("dependencyDepth", depth.toString());
    setSearchParams(searchParams);
    setDependencyDepth(depth);
  }

  function handleDependentDepthChange(depth: number) {
    searchParams.set("dependentDepth", depth.toString());
    setSearchParams(searchParams);
    setDependentDepth(depth);
  }

  const [contextMenu, setContextMenu] = useState<
    | {
        position: { x: number; y: number };
        fileDependencyManifest: DependencyManifest[string];
        symbolDependencyManifest: DependencyManifest[string]["symbols"][string];
      }
    | undefined
  >(undefined);

  const [detailsPane, setDetailsPane] = useState<
    | {
        manifestId: string;
        fileDependencyManifest: DependencyManifest[string];
        symbolDependencyManifest: DependencyManifest[string]["symbols"][string];
        fileAuditManifest: AuditManifest[string];
        symbolAuditManifest: AuditManifest[string]["symbols"][string];
      }
    | undefined
  >(undefined);

  useEffect(() => {
    setBusy(true);

    if (!props.fileId || !props.instanceId) {
      return;
    }

    const visualizer = new SymbolDependencyVisualizer(
      containerRef.current as HTMLElement,
      props.fileId,
      props.instanceId,
      dependencyDepth,
      dependentDepth,
      props.dependencyManifest,
      props.auditManifest,
      {
        theme,
        onAfterNodeRightClick: (value: {
          position: { x: number; y: number };
          filePath: string;
          symbolId: string;
        }) => {
          const fileDependencyManifest =
            props.dependencyManifest[value.filePath];
          const symbolDependencyManifest =
            fileDependencyManifest.symbols[value.symbolId];
          setContextMenu({
            position: value.position,
            fileDependencyManifest,
            symbolDependencyManifest,
          });
        },
        onAfterNodeDblClick: (filePath: string, symbolId: string) => {
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.set("fileId", filePath);
          newSearchParams.set("instanceId", symbolId);
          navigate(`?${newSearchParams.toString()}`);
        },
      },
    );

    setSymbolVisualizer(visualizer);
    setBusy(false);

    return () => {
      visualizer?.cy.destroy();
      setSymbolVisualizer(undefined);
    };
  }, [
    props.dependencyManifest,
    props.auditManifest,
    props.fileId,
    props.instanceId,
    dependencyDepth,
    dependentDepth,
  ]);

  useEffect(() => {
    if (symbolVisualizer) {
      if (props.highlightedCytoscapeRef) {
        symbolVisualizer.highlightNode(props.highlightedCytoscapeRef);
      } else {
        symbolVisualizer.unhighlightNodes();
      }
    }
  }, [props.highlightedCytoscapeRef]);

  useEffect(() => {
    if (symbolVisualizer) {
      symbolVisualizer.updateTheme(theme);
    }
  }, [theme]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute w-full h-full z-10" />

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <Controls
          busy={busy}
          cy={symbolVisualizer?.cy}
          onLayout={() => symbolVisualizer?.layoutGraph(symbolVisualizer.cy)}
        >
          <GraphDepthExtension
            busy={busy}
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
          const fileDependencyManifest = props.dependencyManifest[filePath];
          const symbolDependencyManifest =
            fileDependencyManifest.symbols[symbolId];
          const fileAuditManifest = props.auditManifest[filePath];
          const symbolAuditManifest = fileAuditManifest.symbols[symbolId];
          setDetailsPane({
            manifestId: props.manifestId,
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
      />
    </div>
  );
}
