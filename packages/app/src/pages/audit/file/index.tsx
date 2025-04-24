import { useContext, useEffect, useRef, useState } from "react";
import {
  useOutletContext,
  useParams,
  useNavigate,
  useSearchParams,
} from "react-router";
import Controls from "../../../components/Cytoscape/Controls.js";
import { ThemeContext } from "../../../contexts/ThemeContext.js";
import { AuditContext } from "../base.js";
import { CytoscapeSkeleton } from "../../../components/Cytoscape/Skeleton.js";
import { FileDependencyVisualizer } from "../../../helpers/cytoscape/fileDependencyVisualizer/index.js";
import { NapiNodeData } from "../../../helpers/cytoscape/fileDependencyVisualizer/types.js";
import { Metric } from "@napi/shared";
import FileActionMenu from "../../../components/FileActionMenu.js";
import SymbolDetailsPane from "../../../components/SymbolDetailsPane.js";
import FiltersExtension from "../../../components/Cytoscape/ControlExtensions/FiltersExtension.js";
import MetricsExtension from "../../../components/Cytoscape/ControlExtensions/MetricsExtension.js";

export default function AuditFilePage() {
  const navigate = useNavigate();
  const params = useParams<{ file: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const context = useOutletContext<AuditContext>();
  const themeContext = useContext(ThemeContext);

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
    if (
      !params.file ||
      context.busy ||
      !context.dependencyManifest ||
      !context.auditManifest
    )
      return;

    setBusy(true);
    const fileDependencyVisualizer = new FileDependencyVisualizer(
      containerRef.current as HTMLElement,
      params.file,
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
          // Navigate to the file, we don't have instance data in this visualizer
          const urlEncodedFileName = encodeURIComponent(
            data.customData.fileName,
          );
          navigate(`/audit/${urlEncodedFileName}`);
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
  }, [context.dependencyManifest, context.auditManifest, params.file]);

  // Hook to update the target metric in the graph
  useEffect(() => {
    if (fileVisualizer) {
      fileVisualizer.setTargetMetric(metric);
    }
  }, [metric]);

  // Hook to update highlight node in the graph
  useEffect(() => {
    if (fileVisualizer) {
      if (context.highlightedNodeId) {
        fileVisualizer.highlightNode(context.highlightedNodeId);
      } else {
        fileVisualizer.unhighlightNodes();
      }
    }
  }, [context.highlightedNodeId]);

  // Hook to update the theme in the graph
  useEffect(() => {
    if (fileVisualizer) {
      fileVisualizer.updateTheme(themeContext.theme);
    }
  }, [themeContext.theme]);

  return (
    <div className="relative w-full h-full">
      {/* This is the container for Cytoscape */}
      {/* It is important to set the width and height to 100% */}
      {/* Otherwise, Cytoscape will not render correctly */}
      <div ref={containerRef} className="absolute w-full h-full z-10" />

      {(context.busy || busy || !fileVisualizer) && <CytoscapeSkeleton />}

      {fileVisualizer && (
        <Controls
          busy={context.busy || busy}
          cy={fileVisualizer.cy}
          onLayout={() => fileVisualizer.layoutGraph(fileVisualizer.cy)}
        >
          <FiltersExtension
            busy={false}
            cy={fileVisualizer.cy}
            onLayout={() => fileVisualizer.layoutGraph(fileVisualizer.cy)}
          />
          <MetricsExtension
            busy={false}
            metricState={{
              metric,
              setMetric: handleMetricChange,
            }}
          />
        </Controls>
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
        <SymbolDetailsPane
          fileDependencyManifest={context.dependencyManifest[detailsPaneNodeId]}
          fileAuditManifest={context.auditManifest[detailsPaneNodeId]}
          symbolId={detailsPaneNodeId}
          open={detailsPaneOpen}
          setOpen={setDetailsPaneOpen}
        />
      )}
    </div>
  );
}
