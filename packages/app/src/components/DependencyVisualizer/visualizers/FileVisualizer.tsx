import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import Controls from "../components/controls/Controls.tsx";
import type { VisualizerContext } from "../DependencyVisualizer.tsx";
import { FileDependencyVisualizer } from "../cytoscape/fileDependencyVisualizer/index.ts";
import type {
  FileAuditManifest,
  FileDependencyManifest,
  Metric,
  SymbolAuditManifest,
  SymbolDependencyManifest,
} from "@napi/shared";
import MetricsExtension from "../components/controls/ControlExtensions/MetricsExtension.tsx";
import { useTheme } from "../../../contexts/ThemeProvider.tsx";
import FiltersExtension from "../components/controls/ControlExtensions/FiltersExtension.tsx";
import SymbolContextMenu from "../components/contextMenu/SymbolContextMenu.tsx";
import SymbolDetailsPane from "../components/detailsPanes/SymbolDetailsPane.tsx";

export default function FileVisualizer(
  props: VisualizerContext & {
    fileId: string;
  },
) {
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

  function handleMetricChange(metric: Metric | undefined) {
    if (metric) {
      setSearchParams({ metric: metric });
    } else {
      setSearchParams({});
    }
    setMetric(metric);
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
  >(undefined);

  // On mount useEffect
  useEffect(() => {
    setBusy(true);
    const fileDependencyVisualizer = new FileDependencyVisualizer(
      containerRef.current as HTMLElement,
      props.fileId,
      props.dependencyManifest,
      props.auditManifest,
      {
        theme: theme,
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

    setFileVisualizer(fileDependencyVisualizer);

    setBusy(false);

    // Cleanup on unmount
    return () => {
      fileDependencyVisualizer?.cy.destroy();
      setFileVisualizer(undefined);
    };
  }, [props.dependencyManifest, props.auditManifest, props.fileId]);

  // Hook to update the target metric in the graph
  useEffect(() => {
    if (fileVisualizer) {
      fileVisualizer.setTargetMetric(metric);
    }
  }, [metric]);

  // Hook to update highlight node in the graph
  useEffect(() => {
    if (fileVisualizer) {
      if (props.highlightedCytoscapeRef) {
        fileVisualizer.highlightNode(props.highlightedCytoscapeRef);
      } else {
        fileVisualizer.unhighlightNodes();
      }
    }
  }, [props.highlightedCytoscapeRef]);

  // Hook to update the theme in the graph
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
      {/* This is the container for Cytoscape */}
      {/* It is important to set the width and height to 100% */}
      {/* Otherwise, Cytoscape will not render correctly */}
      <div ref={containerRef} className="absolute w-full h-full z-10" />

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <Controls
          busy={props.busy || busy}
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
          props.onAddSymbolsForExtraction(filePath, symbolIds);
        }}
      />
    </div>
  );
}
