import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Controls from "../components/controls/Controls.tsx";
import MetricsExtension from "../components/controls/ControlExtensions/MetricsExtension.tsx";
import FiltersExtension from "../components/controls/ControlExtensions/FiltersExtension.tsx";
import SymbolContextMenu from "../components/contextMenu/SymbolContextMenu.tsx";
import SymbolDetailsPane from "../components/detailsPanes/SymbolDetailsPane.tsx";
import { FileDependencyVisualizer } from "../../../cytoscape/fileDependencyVisualizer/index.ts";
import type { DependencyManifest, Metric } from "../../../types/dependencyManifest.ts";
import type { AuditManifest } from "../../../types/auditManifest.ts";
import { useTheme } from "../../../contexts/ThemeProvider.tsx";

interface FileVisualizerProps {
  manifestId: string;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  highlightedCytoscapeRef:
    | { filePath: string; symbolId: string | undefined }
    | undefined;
  fileId: string;
}

export default function FileVisualizer(props: FileVisualizerProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<boolean>(true);
  const [fileVisualizer, setFileVisualizer] = useState<
    FileDependencyVisualizer | undefined
  >(undefined);

  const metricFromUrl = (searchParams.get("metric") || undefined) as
    | Metric
    | undefined;

  const [metric, setMetric] = useState<Metric | undefined>(metricFromUrl);

  function handleMetricChange(newMetric: Metric | undefined) {
    if (newMetric) {
      searchParams.set("metric", newMetric);
      setSearchParams(searchParams);
    } else {
      searchParams.delete("metric");
      setSearchParams(searchParams);
    }
    setMetric(newMetric);
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
    const visualizer = new FileDependencyVisualizer(
      containerRef.current as HTMLElement,
      props.fileId,
      props.dependencyManifest,
      props.auditManifest,
      {
        theme,
        defaultMetric: metric,
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

    setFileVisualizer(visualizer);
    setBusy(false);

    return () => {
      visualizer?.cy.destroy();
      setFileVisualizer(undefined);
    };
  }, [props.dependencyManifest, props.auditManifest, props.fileId]);

  useEffect(() => {
    if (fileVisualizer) {
      fileVisualizer.setTargetMetric(metric);
    }
  }, [metric]);

  useEffect(() => {
    if (fileVisualizer) {
      if (props.highlightedCytoscapeRef) {
        fileVisualizer.highlightNode(props.highlightedCytoscapeRef);
      } else {
        fileVisualizer.unhighlightNodes();
      }
    }
  }, [props.highlightedCytoscapeRef]);

  useEffect(() => {
    if (fileVisualizer) {
      fileVisualizer.updateTheme(theme);
    }
  }, [theme]);

  function handleFilterChange(
    showExternal: boolean,
    showVariables: boolean,
    showFunctions: boolean,
    showClasses: boolean,
    showStructs: boolean,
    showEnums: boolean,
    showInterfaces: boolean,
    showRecords: boolean,
    showDelegates: boolean,
  ) {
    if (fileVisualizer) {
      fileVisualizer.filterNodes(
        showExternal,
        showVariables,
        showFunctions,
        showClasses,
        showStructs,
        showEnums,
        showInterfaces,
        showRecords,
        showDelegates,
      );
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute w-full h-full z-10" />

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <Controls
          busy={busy}
          cy={fileVisualizer?.cy}
          onLayout={() => fileVisualizer?.layoutGraph(fileVisualizer.cy)}
        >
          <FiltersExtension
            busy={false}
            currentFileName={props.fileId}
            onFilterChange={handleFilterChange}
          />
          <MetricsExtension
            busy={false}
            metricState={{
              metric,
              setMetric: handleMetricChange,
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
