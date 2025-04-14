import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router";
import { toast } from "react-toastify";
import { getAudit } from "../service/auditApi";
import GraphLayout from "../layout/GraphLayout";
import FileExplorer, {
  FileExplorerFile,
} from "../components/FileExplorer/FileExplorer";
import { AuditResponse } from "../service/auditApi/types";

export interface AuditContext {
  busy: boolean;
  auditResponse: AuditResponse;
  highlightedNodeId: string | null;
  actions: {
    setHighlightedNodeId: (nodeId: string | null) => void;
    getAuditManifest: () => Promise<AuditResponse>;
  };
}

export default function BaseAuditPage() {
  const initialized = useRef(false);

  const [busy, setBusy] = useState<boolean>(false);

  const [files, setFiles] = useState<FileExplorerFile[]>([]);
  const [auditResponse, setAuditResponse] = useState<AuditResponse>({
    dependencyManifest: {},
    auditManifest: {},
  });

  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null,
  );

  async function getAuditManifest(): Promise<AuditResponse> {
    if (Object.keys(auditResponse.auditManifest).length > 0) {
      // Already loaded
      return auditResponse;
    }
    setBusy(true);

    const response = await getAudit();

    if (!response) {
      setBusy(false);
      return {
        dependencyManifest: {},
        auditManifest: {},
      };
    }

    setAuditResponse(response);
    setBusy(false);
    return response;
  }

  useEffect(() => {
    async function handleOnLoad() {
      setBusy(true);
      try {
        const auditResponsePromise = getAudit();
        toast.promise(auditResponsePromise, {
          success: "Successfully loaded project overview",
          error: "Failed to load project overview",
          pending: "Loading project overview...",
        });

        const auditResponse = await auditResponsePromise;
        const paths = Object.values(auditResponse.dependencyManifest).map(
          (fileManifest) => ({
            path: fileManifest.filePath,
            symbols: Object.keys(fileManifest.symbols),
          }),
        );
        setFiles(paths);
        setAuditResponse(auditResponse);
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
          context={{
            highlightedNodeId,
            actions: {
              setHighlightedNodeId,
            },
          }}
        />
      }
      graphSlot={
        <Outlet
          context={{
            busy,
            auditResponse,
            highlightedNodeId,
            actions: {
              setHighlightedNodeId,
              getAuditManifest,
            },
          }}
        />
      }
    />
  );
}
