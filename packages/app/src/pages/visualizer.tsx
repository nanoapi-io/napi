import { useEffect, useRef, useState } from "react";
import { getProjectOverview } from "../service/api/visualizerApi";
import { toast } from "react-toastify";
import VisualizerTree from "../components/ReactFlow/VisualizerTree/VisualizerTree";
import ReactFlowLayout from "../layout/ReactFlow";
import FileExplorer from "../components/FileExplorer/FileExplorer";

export default function BaseVisualizer() {
  const initialized = useRef(false);

  const [firstLoading, setFirstLoading] = useState<boolean>(false);

  const [files, setFiles] = useState<
    { path: string; isFocused: boolean; isSelected: boolean }[]
  >([]);

  const [height, setHeight] = useState(0);

  useEffect(() => {
    async function handleOnLoad() {
      setFirstLoading(true);
      try {
        const projectPromise = getProjectOverview();
        toast.promise(projectPromise, {
          success: "Successfully loaded project overview",
          error: "Failed to load project overview",
          pending: "Loading project overview...",
        });

        const visualizerFiles = (await projectPromise).files;

        setFiles(
          visualizerFiles.map((file) => {
            return { path: file.path, isFocused: false, isSelected: false };
          }),
        );
      } finally {
        setFirstLoading(false);
      }
    }

    if (!initialized.current) {
      initialized.current = true;
      handleOnLoad();
    }
  }, []);

  return (
    <ReactFlowLayout
      busy={firstLoading}
      sideBarSlot={<FileExplorer height={height} files={files} />}
      chartSlot={<VisualizerTree busy={firstLoading} visualizerFiles={[]} />}
      onHeightUpdate={setHeight}
    />
  );
}
