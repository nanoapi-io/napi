import { useContext, useEffect, useRef, useState } from "react";
import { useOutletContext, useSearchParams, useNavigate } from "react-router";
import Controls from "../../components/Cytoscape/Controls.js";
import { CytoscapeSkeleton } from "../../components/Cytoscape/Skeleton.js";
import FileActionMenu from "../../components/FileActionMenu.js";
import { ThemeContext } from "../../contexts/ThemeContext.js";
import { AuditContext } from "./base.js";
import FileDetailsPane from "../../components/FileDetailsPane.js";
import { ProjectDependencyVisualizer } from "../../helpers/cytoscape/projectDependencyVisualizer/index.js";
import { NapiNodeData } from "../../helpers/cytoscape/projectDependencyVisualizer/types.js";
import { Metric } from "@napi/shared";

export default function AuditPage() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();
  const context = useOutletContext<AuditContext>();

  const themeContext = useContext(ThemeContext);

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

  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [actionMenuNodeId, setActionMenuNodeId] = useState<string | undefined>(
    undefined,
  );
  const [detailsPaneNodeId, setDetailsPaneNodeId] = useState<
    string | undefined
  >(undefined);

  const [detailsPaneOpen, setDetailsPaneOpen] = useState(false);

  // On mount useEffect
  useEffect(() => {
    setBusy(true);
    const projectDependencyVisualizer = new ProjectDependencyVisualizer(
      containerRef.current as HTMLElement,
      context.dependencyManifest,
      context.auditManifest,
      {
        theme: themeContext.theme,
        defaultMetric: metric,
        onAfterNodeRightClick: (value: {
          position: { x: number; y: number };
          id: string;
        }) => {
          setContextMenuPosition(value.position);
          setActionMenuOpen(true);
          setActionMenuNodeId(value.id);
        },
        onAfterNodeDblClick: (data: NapiNodeData) => {
          const urlEncodedFileName = encodeURIComponent(
            data.customData.fileName,
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
      if (context.highlightedNodeId) {
        projectVisualizer.highlightNode(context.highlightedNodeId);
      } else {
        projectVisualizer.unhighlightNodes();
      }
    }
  }, [context.highlightedNodeId]);

  // Hook to update the theme in the graph
  useEffect(() => {
    if (projectVisualizer) {
      projectVisualizer.updateTheme(themeContext.theme);
    }
  }, [themeContext.theme]);

  return (
    <div className="relative w-full h-full">
      {/* This is the container for Cytoscape */}
      {/* It is important to set the width and height to 100% */}
      {/* Otherwise, Cytoscape will not render correctly */}
      <div ref={containerRef} className="absolute w-full h-full z-10" />

      {(context.busy || busy || !projectVisualizer) && <CytoscapeSkeleton />}

      {projectVisualizer && (
        <Controls
          busy={context.busy || busy}
          cy={projectVisualizer.cy}
          onLayout={() => projectVisualizer.layoutGraph(projectVisualizer.cy)}
          metricState={{
            metric,
            setMetric: handleMetricChange,
          }}
        />
      )}

      {actionMenuNodeId && (
        <>
          <FileActionMenu
            position={contextMenuPosition}
            fileDependencyManifest={
              context.dependencyManifest[actionMenuNodeId]
            }
            open={actionMenuOpen}
            onOpenChange={setActionMenuOpen}
            showInSidebar={context.actions.showInSidebar}
            setDetailsPaneOpen={(open) => {
              setDetailsPaneOpen(open);
              if (open) {
                setDetailsPaneNodeId(actionMenuNodeId);
              }
            }}
          />
        </>
      )}

      {detailsPaneNodeId && (
        <FileDetailsPane
          fileDependencyManifest={context.dependencyManifest[detailsPaneNodeId]}
          fileAuditManifest={context.auditManifest[detailsPaneNodeId]}
          open={detailsPaneOpen}
          setOpen={setDetailsPaneOpen}
        />
      )}
    </div>
  );
}
