import { useEffect, useRef, useState } from "react";
import { getProjectOverview } from "../service/api/auditApi";
import { toast } from "react-toastify";
import ReactFlowLayout from "../layout/ReactFlow";
import FileExplorer from "../components/FileExplorer/FileExplorer";
import { AuditFile } from "../service/api/types";
import Audit from "./audit/index";
// import { Outlet } from "react-router";

export default function BaseAudit(props: {
  isOpen: boolean;
}) {
  const initialized = useRef(false);

  const [busy, setBusy] = useState<boolean>(false);

  const [files, setFiles] = useState<(AuditFile & { isFocused?: boolean })[]>(
    [],
  );

  useEffect(() => {
    async function handleOnLoad() {
      setBusy(true);
      try {
        const projectPromise = getProjectOverview();
        toast.promise(projectPromise, {
          success: "Successfully loaded project overview",
          error: "Failed to load project overview",
          pending: "Loading project overview...",
        });

        const AuditFiles = (await projectPromise).files;

        setFiles(AuditFiles as any);
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
          files={files}
          focusedId={focusedPath}
          isOpen={props.isOpen}
          onNodeFocus={setFocusedPath}
          onNodeUnfocus={() => setFocusedPath(undefined)}
        />
      }
      chartSlot={
        <Audit
          context={{
            busy,
            files,
            focusedPath,
            onNodeFocus: setFocusedPath,
            onNodeUnfocus: () => setFocusedPath(undefined),
          }}
        />
      }
    />
  );
}
