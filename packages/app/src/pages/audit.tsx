import { useEffect, useRef, useState } from "react";
import { getAuditFiles } from "../service/api/auditApi";
import { toast } from "react-toastify";
import ReactFlowLayout from "../layout/ReactFlow";
import FileExplorer from "../components/FileExplorer/FileExplorer";
import { AuditMap } from "../service/api/types";
import { Outlet } from "react-router";

export default function BaseAudit() {
  const initialized = useRef(false);

  const [busy, setBusy] = useState<boolean>(false);

  const [auditMap, setAuditMap] = useState<AuditMap>({});

  useEffect(() => {
    async function handleOnLoad() {
      setBusy(true);
      try {
        const projectPromise = getAuditFiles();
        toast.promise(projectPromise, {
          success: "Successfully loaded project overview",
          error: "Failed to load project overview",
          pending: "Loading project overview...",
        });

        setAuditMap(await projectPromise);
      } finally {
        setBusy(false);
      }
    }

    if (!initialized.current) {
      initialized.current = true;
      handleOnLoad();
    }
  }, []);

  const [focusedPath, setFocusedPath] = useState<string | undefined>(undefined);

  return (
    <ReactFlowLayout
      sideBarSlot={
        <FileExplorer
          busy={busy}
          auditMap={auditMap}
          focusedPath={focusedPath}
          onNodeFocus={setFocusedPath}
          onNodeUnfocus={() => setFocusedPath(undefined)}
        />
      }
      chartSlot={
        <Outlet
          context={{
            busy,
            auditMap,
            focusedPath,
            onNodeFocus: setFocusedPath,
            onNodeUnfocus: () => setFocusedPath(undefined),
          }}
        />
      }
    />
  );
}
