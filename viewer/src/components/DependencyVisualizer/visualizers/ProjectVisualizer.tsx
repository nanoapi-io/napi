import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Controls from "../components/controls/Controls.tsx";
import MetricsExtension from "../components/controls/ControlExtensions/MetricsExtension.tsx";
import FileContextMenu from "../components/contextMenu/FileContextMenu.tsx";
import FileDetailsPane from "../components/detailsPanes/FileDetailsPane.tsx";
import { ProjectDependencyVisualizer } from "../../../cytoscape/projectDependencyVisualizer/index.ts";
import type { DependencyManifest, Metric } from "../../../types/dependencyManifest.ts";
import type { AuditManifest } from "../../../types/auditManifest.ts";
import { useTheme } from "../../../contexts/ThemeProvider.tsx";

interface ProjectVisualizerProps {
  manifestId: string;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  highlightedCytoscapeRef:
    | { filePath: string; symbolId: string | undefined }
    | undefined;
}

export default function ProjectVisualizer(props: ProjectVisualizerProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [busy, setBusy] = useState<boolean>(true);
  const [projectVisualizer, setProjectVisualizer] = useState<
    ProjectDependencyVisualizer | undefined
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
      }
    | undefined
  >(undefined);

  const [detailsPane, setDetailsPane] = useState<
    | {
        manifestId: string;
        fileDependencyManifest: DependencyManifest[string];
        fileAuditManifest: AuditManifest[string];
      }
    | undefined
  >(undefined);

  useEffect(() => {
    setBusy(true);
    const visualizer = new ProjectDependencyVisualizer(
      containerRef.current as HTMLElement,
      props.dependencyManifest,
      props.auditManifest,
      {
        theme,
        defaultMetric: metric,
        onAfterNodeRightClick: (value: {
          position: { x: number; y: number };
          filePath: string;
        }) => {
          setContextMenu({
            position: value.position,
            fileDependencyManifest: props.dependencyManifest[value.filePath],
          });
        },
        onAfterNodeDblClick: (filePath: string) => {
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.set("fileId", filePath);
          newSearchParams.delete("instanceId");
          navigate(`?${newSearchParams.toString()}`);
        },
      },
    );

    setProjectVisualizer(visualizer);
    setBusy(false);

    return () => {
      visualizer?.cy.destroy();
      setProjectVisualizer(undefined);
    };
  }, [props.dependencyManifest, props.auditManifest]);

  useEffect(() => {
    if (projectVisualizer) {
      projectVisualizer.setTargetMetric(metric);
    }
  }, [metric]);

  useEffect(() => {
    if (projectVisualizer) {
      if (props.highlightedCytoscapeRef) {
        projectVisualizer.highlightNode(props.highlightedCytoscapeRef);
      } else {
        projectVisualizer.unhighlightNodes();
      }
    }
  }, [props.highlightedCytoscapeRef]);

  useEffect(() => {
    if (projectVisualizer) {
      projectVisualizer.updateTheme(theme);
    }
  }, [theme]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute w-full h-full z-10" />

      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <Controls
          busy={busy}
          cy={projectVisualizer?.cy}
          onLayout={() => projectVisualizer?.layoutGraph(projectVisualizer.cy)}
        >
          <MetricsExtension
            busy={busy}
            metricState={{
              metric,
              setMetric: handleMetricChange,
            }}
          />
        </Controls>
      </div>

      <FileDetailsPane
        context={detailsPane}
        onClose={() => setDetailsPane(undefined)}
      />

      <FileContextMenu
        context={contextMenu}
        onClose={() => setContextMenu(undefined)}
        onOpenDetails={(filePath) => {
          setDetailsPane({
            manifestId: props.manifestId,
            fileDependencyManifest: props.dependencyManifest[filePath],
            fileAuditManifest: props.auditManifest[filePath],
          });
        }}
      />
    </div>
  );
}
