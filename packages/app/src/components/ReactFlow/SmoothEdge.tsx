import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export default function SmoothEdge(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({ ...props, borderRadius: 100 });

  return (
    <>
      <BaseEdge path={edgePath} />
    </>
  );
}
