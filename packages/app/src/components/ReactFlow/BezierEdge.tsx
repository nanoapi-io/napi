import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export default function BezierEdge(props: EdgeProps) {
  const [edgePath] = getBezierPath(props);

  return (
    <>
      <BaseEdge path={edgePath} {...props} />
    </>
  );
}
