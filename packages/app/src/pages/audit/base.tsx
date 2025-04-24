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
import { DependencyManifest, AuditManifest } from "@napi/shared";

export interface AuditContext {
  busy: boolean;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  highlightedNodeId: string | null;
  actions: {
    setHighlightedNodeId: (nodeId: string | null) => void;
    showInSidebar: (filename: string) => void;
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

  function showInSidebar(filename: string) {
    setSidebarOpen(true);
    setSidebarSearch(filename);
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
        />
      }
      graphSlot={
        <Outlet
          context={{
            busy,
            dependencyManifest,
            auditManifest,
            highlightedNodeId,
            actions: {
              setHighlightedNodeId,
              showInSidebar,
            },
          }}
        />
      }
    />
  );
}
