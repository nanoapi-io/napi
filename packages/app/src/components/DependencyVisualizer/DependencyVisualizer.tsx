import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  getAuditManifest,
  getDependencyManifest,
  runExtraction,
} from "../../service/api/index.ts";
import type {
  AuditManifest,
  DependencyManifest,
  SymbolsToExtract,
} from "@napi/shared";
import { SidebarProvider, SidebarTrigger } from "../shadcn/Sidebar.tsx";
import { Button } from "../shadcn/Button.tsx";
import { Moon, Sun } from "lucide-react";
import { useToast } from "../shadcn/hooks/use-toast.tsx";
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
  onAddSymbolsForExtraction: (
    filePath: string,
    symbolIds: string[],
  ) => void;
}

export default function DependencyVisualizer() {
  const [searchParams] = useSearchParams();

  const { theme, setTheme } = useTheme();

  const { toast } = useToast();

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

  const [symbolsToExtract, setSymbolsToExtract] = useState<SymbolsToExtract>(
    [],
  );

  async function extractSymbols() {
    setBusy(true);
    const extractionToast = toast({
      title: "Extracting symbols",
      description: "This may take a while...",
    });
    try {
      await runExtraction(symbolsToExtract);
      extractionToast.update({
        id: extractionToast.id,
        description: "Symbols extracted successfully",
      });
    } catch (_error) {
      extractionToast.update({
        id: extractionToast.id,
        description: "Failed to extract symbols",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    async function handleOnLoad() {
      setBusy(true);
      const allPromiseToast = toast({
        title: "Loading manifests",
        description: "This may take a while...",
      });
      try {
        const dependencyManifestPromise = getDependencyManifest();
        const auditManifestPromise = getAuditManifest();

        const allPromise = Promise.all([
          dependencyManifestPromise,
          auditManifestPromise,
        ]);

        const [dependencyManifest, auditManifest] = await allPromise;

        setDependencyManifest(dependencyManifest);
        setAuditManifest(auditManifest);

        allPromiseToast.update({
          id: allPromiseToast.id,
          description: "Manifests loaded successfully",
        });
      } catch (_error) {
        allPromiseToast.update({
          id: allPromiseToast.id,
          description: "Failed to load manifests",
          variant: "destructive",
        });
      } finally {
        setBusy(false);
      }
    }

    handleOnLoad();
  }, []);

  function Visualizer(props: VisualizerContext) {
    const [searchParams] = useSearchParams();
    const fileId = searchParams.get("fileId");
    const instanceId = searchParams.get("instanceId");

    if (instanceId && fileId) {
      return (
        <SymbolVisualizer
          {...props}
          fileId={fileId}
          instanceId={instanceId}
        />
      );
    } else if (fileId) {
      return <FileVisualizer {...props} fileId={fileId} />;
    } else {
      return <ProjectVisualizer {...props} />;
    }
  }

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
        symbolsToExtract={symbolsToExtract}
        onUpdateSymbolsToExtract={setSymbolsToExtract}
        onExtractSymbols={extractSymbols}
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
          <Visualizer
            {...{
              busy,
              fileId: searchParams.get("fileId"),
              instanceId: searchParams.get("instanceId"),
              dependencyManifest,
              auditManifest,
              highlightedCytoscapeRef,
              onAddSymbolsForExtraction: (filePath, symbolIds) => {
                const newSymbolsToExtract = [...symbolsToExtract];
                for (const symbolId of symbolIds) {
                  // Check if there's an existing entry for this file
                  const existingIndex = newSymbolsToExtract.findIndex(
                    (s) => s.filePath === filePath,
                  );

                  if (existingIndex === -1) {
                    // No existing entry for this file, create a new one
                    newSymbolsToExtract.push({ filePath, symbols: [symbolId] });
                  } else {
                    // File exists, check if symbol is already included
                    if (
                      !newSymbolsToExtract[existingIndex].symbols.includes(
                        symbolId,
                      )
                    ) {
                      newSymbolsToExtract[existingIndex].symbols.push(symbolId);
                    }
                  }
                }
                setSymbolsToExtract(newSymbolsToExtract);
              },
            } as VisualizerContext}
          />
        </div>
      </div>
    </SidebarProvider>
  );
}
