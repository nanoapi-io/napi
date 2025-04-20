import { useContext, useEffect, useRef, useState } from "react";
import { useOutletContext, useSearchParams, useNavigate } from "react-router";
import Controls from "../../components/Cytoscape/Controls";
import { CytoscapeSkeleton } from "../../components/Cytoscape/Skeleton";
import FileActionMenu from "../../components/FileActionMenu";
import { ThemeContext } from "../../contexts/ThemeContext";
import { AuditContext } from "./base";
import FileDetailsPane from "../../components/FileDetailsPane";
import { ProjectDependencyVisualizer } from "../../helpers/cytoscape/projectDependencyVisualizer";
import {
  NapiNodeData,
  TargetMetric,
} from "../../helpers/cytoscape/projectDependencyVisualizer/types";

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

  const metricTypeFromUrl = (searchParams.get("metricType") ||
    "noMetric") as TargetMetric;

  const [metricType, setMetricType] = useState<TargetMetric>(metricTypeFromUrl);

  function handleMetricTypeChange(metricType: TargetMetric) {
    setSearchParams({ metricType: metricType });
    setMetricType(metricType);
  }

  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(
    undefined,
  );

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
        defaultMetric: metricType,
        onAfterNodeRightClick: (value: {
          position: { x: number; y: number };
          id: string;
        }) => {
          setContextMenuPosition(value.position);
          setContextMenuOpen(true);
          setSelectedNodeId(value.id);
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
      projectVisualizer.setTargetMetric(metricType);
    }
  }, [metricType]);

  useEffect(() => {
    if (projectVisualizer) {
      projectVisualizer.updateTheme(themeContext.theme);
    }
  }, [themeContext.theme]);

  return (
    <div className="relative w-full h-full">
      {(context.busy || busy || !projectVisualizer) && <CytoscapeSkeleton />}

      {projectVisualizer && (
        <Controls
          busy={context.busy || busy}
          cy={projectVisualizer.cy}
          onLayout={() => projectVisualizer.layoutGraph(projectVisualizer.cy)}
          metricType={metricType}
          setMetricType={handleMetricTypeChange}
        />
      )}

      {selectedNodeId && (
        <>
          <FileActionMenu
            position={contextMenuPosition}
            fileDependencyManifest={context.dependencyManifest[selectedNodeId]}
            open={contextMenuOpen}
            onOpenChange={setContextMenuOpen}
            showInSidebar={context.actions.showInSidebar}
            setDetailsPaneOpen={setDetailsPaneOpen}
          />

          <FileDetailsPane
            fileDependencyManifest={context.dependencyManifest[selectedNodeId]}
            fileAuditManifest={context.auditManifest[selectedNodeId]}
            open={detailsPaneOpen}
            setOpen={setDetailsPaneOpen}
          />
        </>
      )}

      {/* This is the container for Cytoscape */}
      {/* It is important to set the width and height to 100% */}
      {/* Otherwise, Cytoscape will not render correctly */}
      <div ref={containerRef} className="relative w-full h-full z-1" />
    </div>
  );
}
