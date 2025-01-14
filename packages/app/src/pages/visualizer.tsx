import { useEffect, useRef, useState } from "react";
import { getProjectOverview } from "../service/api/visualizerApi";
import { toast } from "react-toastify";
import ReactFlowLayout from "../layout/ReactFlow";
// import FileExplorer from "../components/Arborist/FileExplorer";
import FileExplorer from "../components/FileExplorer/FileExplorer";
import { VisualizerFile } from "../service/api/types";
import { Outlet } from "react-router";

export default function BaseVisualizer() {
  const initialized = useRef(false);

  const [busy, setBusy] = useState<boolean>(false);

  const [files, setFiles] = useState<
    (VisualizerFile & { isFocused?: boolean })[]
  >([]);

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

        const visualizerFiles = (await projectPromise).files;

        setFiles(visualizerFiles);
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
      busy={busy}
      // sideBarSlot={<FileExplorer height={height} width={350} files={files} />}
      sideBarSlot={
        <FileExplorer
          files={files}
          focusedId={focusedPath}
          onNodeFocus={setFocusedPath}
          onNodeUnfocus={() => setFocusedPath(undefined)}
        />
      }
      chartSlot={
        <Outlet
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
