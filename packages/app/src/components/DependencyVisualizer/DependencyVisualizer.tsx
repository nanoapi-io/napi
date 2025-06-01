import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  getAuditManifest,
  getDependencyManifest,
} from "../../service/api/index.ts";
import type { AuditManifest, DependencyManifest } from "@napi/shared";
import { SidebarProvider, SidebarTrigger } from "../shadcn/Sidebar.tsx";
import { Button } from "../shadcn/Button.tsx";
import { Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "../../contexts/ThemeProvider.tsx";
import { FileExplorerSidebar } from "./components/FileExplorerSidebar.tsx";
import BreadcrumbNav from "./components/BreadcrumNav.tsx";
import ProjectVisualizer from "./visualizers/ProjectVisualizer.tsx";
import FileVisualizer from "./visualizers/FileVisualizer.tsx";
import SymbolVisualizer from "./visualizers/SymbolVisualizer.tsx";

export interface VisualizerContext {
  busy: boolean;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  highlightedCytoscapeRef: {
    filePath: string;
    symbolId: string | undefined;
  } | undefined;
}

export default function DependencyVisualizer() {
  const [searchParams] = useSearchParams();

  const { theme, setTheme } = useTheme();

  const [busy, setBusy] = useState<boolean>(true);

  const [auditManifest, setAuditManifest] = useState<AuditManifest>({});
  const [dependencyManifest, setDependencyManifest] = useState<
    DependencyManifest
  >({});

  const [highlightedCytoscapeRef, setHighlightedCytoscapeRef] = useState<
    {
      filePath: string;
      symbolId: string | undefined;
    } | undefined
  >(undefined);

  useEffect(() => {
    async function handleOnLoad() {
      setBusy(true);
      try {
        const dependencyManifestPromise = getDependencyManifest();
        const auditManifestPromise = getAuditManifest();

        const allPromise = Promise.all([
          dependencyManifestPromise,
          auditManifestPromise,
        ]);

        toast.promise(allPromise, {
          loading: "Loading manifests",
          success: "Manifests loaded successfully",
          error: "Failed to load manifests",
        });

        const [dependencyManifest, auditManifest] = await allPromise;

        setDependencyManifest(dependencyManifest);
        setAuditManifest(auditManifest);
      } finally {
        setBusy(false);
      }
    }

    handleOnLoad();
  }, []);

  return (
    <SidebarProvider
      defaultOpen
      className="h-screen w-screen"
      style={{ "--sidebar-width": "30rem" } as React.CSSProperties}
    >
      <FileExplorerSidebar
        busy={busy}
        dependencyManifest={dependencyManifest}
        auditManifest={auditManifest}
        onHighlightInCytoscape={(node) => {
          if (!node.fileId) return;
          const newRef = {
            filePath: node.fileId,
            symbolId: node.symbolId,
          };
          // If the new ref is the same as the current ref, we un set it (unhighlight)
          if (
            highlightedCytoscapeRef?.filePath === newRef.filePath &&
            highlightedCytoscapeRef?.symbolId === newRef.symbolId
          ) {
            setHighlightedCytoscapeRef(undefined);
          } else {
            setHighlightedCytoscapeRef(newRef);
          }
        }}
        toDetails={(node) => {
          if (node.symbolId && node.fileId) {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set("fileId", node.fileId);
            newSearchParams.set("instanceId", node.symbolId);
            return `?${newSearchParams.toString()}`;
          } else if (node.fileId) {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.set("fileId", node.fileId);
            newSearchParams.delete("instanceId");
            return `?${newSearchParams.toString()}`;
          } else {
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete("fileId");
            newSearchParams.delete("instanceId");
            return `?${newSearchParams.toString()}`;
          }
        }}
      />
      <div className="h-full w-full flex flex-col overflow-hidden">
        <div className="flex items-center py-2 justify-between">
          <div className="flex items-center gap-2 ml-2">
            <SidebarTrigger />
            <BreadcrumbNav
              toProjectLink={() => {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.delete("fileId");
                newSearchParams.delete("instanceId");
                return `?${newSearchParams.toString()}`;
              }}
              fileId={searchParams.get("fileId")}
              toFileIdLink={(fileId) => {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("fileId", fileId);
                newSearchParams.delete("instanceId");
                return `?${newSearchParams.toString()}`;
              }}
              instanceId={searchParams.get("instanceId")}
              toInstanceIdLink={(fileId, instanceId) => {
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("fileId", fileId);
                newSearchParams.set("instanceId", instanceId);
                return `?${newSearchParams.toString()}`;
              }}
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="mr-2"
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>
        </div>
        <div className="grow w-full border-t">
          {searchParams.get("fileId") && searchParams.get("instanceId")
            ? (
              <SymbolVisualizer
                busy={busy}
                fileId={searchParams.get("fileId")!}
                instanceId={searchParams.get("instanceId")!}
                dependencyManifest={dependencyManifest}
                auditManifest={auditManifest}
                highlightedCytoscapeRef={highlightedCytoscapeRef}
              />
            )
            : searchParams.get("fileId")
            ? (
              <FileVisualizer
                busy={busy}
                fileId={searchParams.get("fileId")!}
                dependencyManifest={dependencyManifest}
                auditManifest={auditManifest}
                highlightedCytoscapeRef={highlightedCytoscapeRef}
              />
            )
            : (
              <ProjectVisualizer
                busy={busy}
                dependencyManifest={dependencyManifest}
                auditManifest={auditManifest}
                highlightedCytoscapeRef={highlightedCytoscapeRef}
              />
            )}
        </div>
      </div>
    </SidebarProvider>
  );
}
