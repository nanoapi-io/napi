import { useContext, useEffect, useRef, useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useParams,
  useSearchParams,
} from "react-router";
import Controls from "../../../components/Cytoscape/Controls.tsx";
import { ThemeContext } from "../../../contexts/ThemeContext.tsx";
import type { AuditContext } from "../base.tsx";
import { CytoscapeSkeleton } from "../../../components/Cytoscape/Skeleton.tsx";
import { FileDependencyVisualizer } from "../../../helpers/cytoscape/fileDependencyVisualizer/index.ts";
import type { NapiNodeData } from "../../../helpers/cytoscape/fileDependencyVisualizer/types.ts";
import type { Metric } from "@napi/shared";
import SymbolContextMenu from "../../../components/Cytoscape/contextMenu/SymbolContextMenu.tsx";
import SymbolDetailsPane from "../../../components/SymbolDetailsPane.tsx";
import FiltersExtension from "../../../components/Cytoscape/ControlExtensions/FiltersExtension.tsx";
import MetricsExtension from "../../../components/Cytoscape/ControlExtensions/MetricsExtension.tsx";

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

  // On mount useEffect
  useEffect(() => {
    if (
      !params.file ||
      context.busy ||
      !context.dependencyManifest ||
      !context.auditManifest
    ) {
      return;
    }

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
          data: NapiNodeData;
        }) => {
          if (value.data.customData.fileName !== params.file) {
            // ignore clicks on nodes from other files
            return;
          }
          setContextMenuPosition(value.position);
          setContextMenuOpen(true);
          setContextMenuSymbolId(value.data.customData.symbolName);
        },
        onAfterNodeDblClick: (data: NapiNodeData) => {
          navigate(
            `/audit/${
              encodeURIComponent(
                data.customData.fileName,
              )
            }/${encodeURIComponent(data.customData.symbolName)}`,
          );
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

      {contextMenuSymbolId && (
        <SymbolContextMenu
          position={contextMenuPosition}
          fileDependencyManifest={context
            .dependencyManifest[params.file as string]}
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
          fileDependencyManifest={context
            .dependencyManifest[params.file as string]}
          fileAuditManifest={context.auditManifest[params.file as string]}
          symbolId={detailsPaneSymbolId}
          open={detailsPaneOpen}
          setOpen={setDetailsPaneOpen}
        />
      )}
    </div>
  );
}
