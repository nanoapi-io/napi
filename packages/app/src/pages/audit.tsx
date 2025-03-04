import { useEffect, useRef, useState } from "react";
import { getAuditFiles } from "../service/api/auditApi";
import { toast } from "react-toastify";
import GraphLayout from "../layout/GraphLayout";
import FileExplorer from "../components/FileExplorer/FileExplorer";
import { AuditMap } from "../service/api/types";
import { Outlet } from "react-router";

export default function BaseAuditPage() {
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

  return (
    <GraphLayout
      sideBarSlot={<FileExplorer busy={busy} auditMap={auditMap} />}
      graphSlot={
        <Outlet
          context={{
            busy,
            auditMap,
          }}
        />
      }
    />
  );
}
