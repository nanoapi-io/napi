import { useEffect, useRef, useState } from "react";
import { getAudit } from "../service/auditApi";
import { toast } from "react-toastify";
import GraphLayout from "../layout/GraphLayout";
import FileExplorer from "../components/FileExplorer/FileExplorer";
import { AuditResponse } from "../service/auditApi/types";
import { Outlet } from "react-router";

export interface AuditContext {
  busy: boolean;
  auditResponse: AuditResponse;
}

export default function BaseAuditPage() {
  const initialized = useRef(false);

  const [busy, setBusy] = useState<boolean>(false);

  const [paths, setPaths] = useState<string[]>([]);
  const [auditResponse, setAuditResponse] = useState<AuditResponse>({
    dependencyManifesto: {},
    auditManifesto: {},
  });

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
        const paths = Object.values(auditResponse.dependencyManifesto).map(
          (fileManifesto) => fileManifesto.filePath,
        );
        setPaths(paths);
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
      sideBarSlot={<FileExplorer busy={busy} paths={paths} />}
      graphSlot={
        <Outlet
          context={{
            busy,
            auditResponse,
          }}
        />
      }
    />
  );
}
