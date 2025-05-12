import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router";
import Controls from "../../components/controls/Controls.tsx";
import MetricsExtension from "../../components/controls/ControlExtensions/MetricsExtension.tsx";
import FileContextMenu from "../../components/contextMenu/FileContextMenu.tsx";
import type { AuditContext } from "./base.tsx";
import FileDetailsPane from "../../components/detailsPanes/FileDetailsPane.tsx";
import { ProjectDependencyVisualizer } from "../../helpers/cytoscape/projectDependencyVisualizer/index.ts";
import type {
  FileAuditManifest,
  FileDependencyManifest,
  Metric,
} from "@napi/shared";
import { useTheme } from "../../contexts/ThemeProvider.tsx";

export default function AuditPage() {
  const navigate = useNavigate();

  const { theme } = useTheme();

  const [searchParams, setSearchParams] = useSearchParams();

  const context = useOutletContext<AuditContext>();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<boolean>(true);
  const [projectVisualizer, setProjectVisualizer] = useState<
    ProjectDependencyVisualizer | undefined
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
    } | undefined
  >(undefined);

  const [detailsPane, setDetailsPane] = useState<
    {
      fileDependencyManifest: FileDependencyManifest;
      fileAuditManifest: FileAuditManifest;
    } | undefined
  >(undefined);

  // On mount useEffect
  useEffect(() => {
    setBusy(true);
    const projectDependencyVisualizer = new ProjectDependencyVisualizer(
      containerRef.current as HTMLElement,
      context.dependencyManifest,
      context.auditManifest,
      {
        theme,
        defaultMetric: metric,
        onAfterNodeRightClick: (value: {
          position: { x: number; y: number };
          filePath: string;
        }) => {
          setContextMenu({
            position: value.position,
            fileDependencyManifest: context.dependencyManifest[value.filePath],
          });
        },
        onAfterNodeDblClick: (filePath: string) => {
          const urlEncodedFileName = encodeURIComponent(
            filePath,
          );
          navigate(`/audit/${urlEncodedFileName}`);
        },
      },
    );

    setProjectVisualizer(projectDependencyVisualizer);

    setBusy(false);

    // Cleanup on unmount
    return () => {
      projectDependencyVisualizer?.cy.destroy();
      setProjectVisualizer(undefined);
    };
  }, [context.dependencyManifest, context.auditManifest]);

  // Hook to update the target metric in the graph
  useEffect(() => {
    if (projectVisualizer) {
      projectVisualizer.setTargetMetric(metric);
    }
  }, [metric]);

  // Hook to update highlight node in the graph
  useEffect(() => {
    if (projectVisualizer) {
      if (context.highlightedCytoscapeRef) {
        projectVisualizer.highlightNode(context.highlightedCytoscapeRef);
      } else {
        projectVisualizer.unhighlightNodes();
      }
    }
  }, [context.highlightedCytoscapeRef]);

  // Hook to update the theme in the graph
  useEffect(() => {
    if (projectVisualizer) {
      projectVisualizer.updateTheme(theme);
    }
  }, [theme]);

  return (
    <div className="relative w-full h-full">
      {/* This is the container for Cytoscape */}
      {/* It is important to set the width and height to 100% */}
      {/* Otherwise, Cytoscape will not render correctly */}
      <div ref={containerRef} className="absolute w-full h-full z-10" />

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <Controls
          busy={context.busy || busy}
          cy={projectVisualizer?.cy}
          onLayout={() => projectVisualizer?.layoutGraph(projectVisualizer.cy)}
        >
          <MetricsExtension
            busy={context.busy || busy}
            metricState={{
              metric,
              setMetric: handleMetricChange,
            }}
          />
        </Controls>
      </div>

      <FileContextMenu
        context={contextMenu}
        onClose={() => setContextMenu(undefined)}
        onOpenDetails={(filePath) => {
          setDetailsPane({
            fileDependencyManifest: context.dependencyManifest[filePath],
            fileAuditManifest: context.auditManifest[filePath],
          });
        }}
      />

      <FileDetailsPane
        context={detailsPane}
        onClose={() => setDetailsPane(undefined)}
        onAddSymbolsForExtraction={(filePath, symbolIds) => {
          context.onAddSymbolsForExtraction(filePath, symbolIds);
        }}
      />
    </div>
  );
}
