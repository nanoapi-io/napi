import { useEffect, useRef, useState } from "react";
import { VisualizerFile } from "../../service/api/types";
import { toast } from "react-toastify";
import { ReactFlowSkeleton } from "../../components/ReactFlow/Skeleton";
import { getProjectOverview } from "../../service/api/visualizerApi";
import VisualizerTree from "../../components/ReactFlow/VisualizerTree/VisualizerTree";
import ReactFlowLayout from "../../layout/ReactFlow";

export default function Visualizer() {
  const initialized = useRef(false);

  const [firstLoading, setFirstLoading] = useState<boolean>(false);

  const [visualizerFiles, setVizualiserFiles] = useState<VisualizerFile[]>([]);

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

        setVizualiserFiles((await projectPromise).files);
      } finally {
        setFirstLoading(false);
      }
    }

    if (!initialized.current) {
      initialized.current = true;
      handleOnLoad();
    }
  }, []);

  function ChartSlotContent() {
    return firstLoading ? (
      <ReactFlowSkeleton />
    ) : (
      <VisualizerTree busy={firstLoading} visualizerFiles={visualizerFiles} />
    );
  }

  return <ReactFlowLayout chartSlot={<ChartSlotContent />} />;
}
