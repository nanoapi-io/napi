import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { DependencyManifest } from "../../types/dependencyManifest.ts";
import type { AuditManifest } from "../../types/auditManifest.ts";
import { SidebarProvider, SidebarTrigger } from "../shadcn/Sidebar.tsx";
import {
  FileExplorerSidebar,
  type ExplorerNodeData,
} from "./components/FileExplorerSidebar.tsx";
import BreadcrumbNav from "./components/BreadcrumbNav.tsx";
import ProjectVisualizer from "./visualizers/ProjectVisualizer.tsx";
import FileVisualizer from "./visualizers/FileVisualizer.tsx";
import SymbolVisualizer from "./visualizers/SymbolVisualizer.tsx";

export default function DependencyVisualizer(props: {
  manifestId: string;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
}) {
  const [searchParams] = useSearchParams();
  const [highlightedCytoscapeRef, setHighlightedCytoscapeRef] = useState<
    { filePath: string; symbolId: string | undefined } | undefined
  >(undefined);

  function handleHighlight(node: ExplorerNodeData) {
    if (!node.fileId) return;
    const newRef = {
      filePath: node.fileId,
      symbolId: node.symbolId,
    };
    if (
      highlightedCytoscapeRef?.filePath === newRef.filePath &&
      highlightedCytoscapeRef?.symbolId === newRef.symbolId
    ) {
      setHighlightedCytoscapeRef(undefined);
    } else {
      setHighlightedCytoscapeRef(newRef);
    }
  }

  function toDetails(node: ExplorerNodeData) {
    if (node.symbolId && node.fileId) {
      const p = new URLSearchParams(searchParams);
      p.set("fileId", node.fileId);
      p.set("instanceId", node.symbolId);
      return `?${p.toString()}`;
    } else if (node.fileId) {
      const p = new URLSearchParams(searchParams);
      p.set("fileId", node.fileId);
      p.delete("instanceId");
      return `?${p.toString()}`;
    } else {
      const p = new URLSearchParams(searchParams);
      p.delete("fileId");
      p.delete("instanceId");
      return `?${p.toString()}`;
    }
  }

  const fileId = searchParams.get("fileId");
  const instanceId = searchParams.get("instanceId");

  return (
    <SidebarProvider
      defaultOpen={false}
      style={{ "--sidebar-width": "30rem" } as React.CSSProperties}
      className="grow flex min-h-0"
    >
      <FileExplorerSidebar
        dependencyManifest={props.dependencyManifest}
        auditManifest={props.auditManifest}
        onHighlightInCytoscape={handleHighlight}
        toDetails={toDetails}
      />
      <div className="w-full flex flex-col overflow-hidden">
        <div className="flex items-center py-2 justify-between">
          <div className="flex items-center gap-2 ml-2">
            <SidebarTrigger />
            <BreadcrumbNav
              toProjectLink={() => {
                const p = new URLSearchParams(searchParams);
                p.delete("fileId");
                p.delete("instanceId");
                return `?${p.toString()}`;
              }}
              fileId={fileId}
              toFileIdLink={(fId) => {
                const p = new URLSearchParams(searchParams);
                p.set("fileId", fId);
                p.delete("instanceId");
                return `?${p.toString()}`;
              }}
              instanceId={instanceId}
              toInstanceIdLink={(fId, iId) => {
                const p = new URLSearchParams(searchParams);
                p.set("fileId", fId);
                p.set("instanceId", iId);
                return `?${p.toString()}`;
              }}
            />
          </div>
        </div>
        <div className="grow w-full border-t">
          {fileId && instanceId ? (
            <SymbolVisualizer
              key={`${fileId}-${instanceId}`}
              fileId={fileId}
              instanceId={instanceId}
              manifestId={props.manifestId}
              dependencyManifest={props.dependencyManifest}
              auditManifest={props.auditManifest}
              highlightedCytoscapeRef={highlightedCytoscapeRef}
            />
          ) : fileId ? (
            <FileVisualizer
              key={fileId}
              fileId={fileId}
              manifestId={props.manifestId}
              dependencyManifest={props.dependencyManifest}
              auditManifest={props.auditManifest}
              highlightedCytoscapeRef={highlightedCytoscapeRef}
            />
          ) : (
            <ProjectVisualizer
              manifestId={props.manifestId}
              dependencyManifest={props.dependencyManifest}
              auditManifest={props.auditManifest}
              highlightedCytoscapeRef={highlightedCytoscapeRef}
            />
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
