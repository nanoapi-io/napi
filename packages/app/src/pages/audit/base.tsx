import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { toast } from "react-toastify";
import {
  getDependencyManifest,
  getAuditManifest,
} from "../../service/api/index.js";
import GraphLayout from "../../layout/GraphLayout.js";
import FileExplorer, {
  FileExplorerFile,
} from "../../components/FileExplorer/FileExplorer.js";
import {
  DependencyManifest,
  AuditManifest,
  ExtractionNode,
} from "@nanoapi.io/shared";

export interface AuditContext {
  busy: boolean;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  highlightedNodeId: string | null;
  extractionNodes: Record<string, ExtractionNode>;
  actions: {
    setHighlightedNodeId: (nodeId: string | null) => void;
    showInSidebar: (filename: string) => void;
    updateExtractionNodes: (
      filePath: string,
      symbols: string[],
      action: "add" | "remove",
    ) => void;
  };
}

export default function BaseAuditPage() {
  const initialized = useRef(false);

  const [busy, setBusy] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarSearch, setSidebarSearch] = useState<string>("");

  const [files, setFiles] = useState<FileExplorerFile[]>([]);

  const [auditManifest, setAuditManifest] = useState<AuditManifest>({});
  const [dependencyManifest, setDependencyManifest] =
    useState<DependencyManifest>({});

  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null,
  );
  const [extractionNodes, setExtractionNodes] = useState<
    Record<string, ExtractionNode>
  >({});

  function showInSidebar(filename: string) {
    setSidebarOpen(true);
    setSidebarSearch(filename);
  }

  function updateExtractionNodes(
    filePath: string,
    symbols: string[],
    action: "add" | "remove",
  ) {
    // When doing anything here, we need to make sure the sidebar is open
    setSidebarOpen(true);

    if (filePath in extractionNodes) {
      const existingSymbols = extractionNodes[filePath].symbols;
      const newSymbols =
        action === "add"
          ? [...new Set([...existingSymbols, ...symbols])]
          : existingSymbols.filter((symbol) => !symbols.includes(symbol));

      setExtractionNodes((prev) => {
        // Ensure react forces a re-render
        const newExtractionNodes = { ...prev };

        // Remove a file if no symbols are left
        // This is to prevent the file from being shown in the sidebar
        if (newSymbols.length === 0) {
          // eslint-disable-next-line
          delete newExtractionNodes[filePath];
          return newExtractionNodes;
        }

        newExtractionNodes[filePath] = {
          filePath: filePath,
          symbols: newSymbols,
        };
        return newExtractionNodes;
      });
    } else {
      setExtractionNodes((prev) => {
        // Ensure react forces a re-render
        const newExtractionNodes = { ...prev };
        newExtractionNodes[filePath] = { filePath: filePath, symbols };
        return newExtractionNodes;
      });
    }
  }

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
          success: "Successfully loaded project overview",
          error: "Failed to load project overview",
          pending: "Loading project overview...",
        });

        const [dependencyManifest, auditManifest] = await allPromise;

        setDependencyManifest(dependencyManifest);
        setAuditManifest(auditManifest);

        const paths = Object.values(dependencyManifest).map((fileManifest) => ({
          path: fileManifest.filePath,
          symbols: Object.keys(fileManifest.symbols),
        }));

        setFiles(paths);
      } finally {
        setBusy(false);
      }
    }

    if (!initialized.current) {
      initialized.current = true;
      handleOnLoad();
    }
  }, []);

  return (
    <GraphLayout
      sideBarSlot={
        <FileExplorer
          busy={busy}
          files={files}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          search={sidebarSearch}
          setIsSearch={setSidebarSearch}
          highlightedNodeId={highlightedNodeId}
          setHighlightedNodeId={setHighlightedNodeId}
          extractionState={{
            extractionNodes,
            updateExtractionNodes,
          }}
        />
      }
      graphSlot={
        <Outlet
          context={{
            busy,
            dependencyManifest,
            auditManifest,
            highlightedNodeId,
            extractionNodes,
            actions: {
              setHighlightedNodeId,
              showInSidebar,
              updateExtractionNodes,
            },
          }}
        />
      }
    />
  );
}
