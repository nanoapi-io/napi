import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { toast } from "react-toastify";
import { getDependencyManifest, getAuditManifest } from "../../service/api";
import GraphLayout from "../../layout/GraphLayout";
import FileExplorer, {
  FileExplorerFile,
} from "../../components/FileExplorer/FileExplorer";
import { DependencyManifest } from "../../service/api/types/dependencyManifest";
import { AuditManifest } from "../../service/api/types/auditManifest";

export interface AuditContext {
  busy: boolean;
  dependencyManifest: DependencyManifest;
  auditManifest: AuditManifest;
  highlightedNodeId: string | null;
  detailNodeId: string | null;
  actions: {
    setHighlightedNodeId: (nodeId: string | null) => void;
    showInSidebar: (filename: string) => void;
    setDetailNodeId: (nodeId: string | null) => void;
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
  const [detailNodeId, setDetailNodeId] = useState<string | null>(null);

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
          setDetailNodeId={setDetailNodeId}
        />
      }
      graphSlot={
        <Outlet
          context={{
            busy,
            dependencyManifest,
            auditManifest,
            highlightedNodeId,
            detailNodeId,
            actions: {
              setHighlightedNodeId,
              showInSidebar,
              setDetailNodeId,
            },
          }}
        />
      }
    />
  );
}
