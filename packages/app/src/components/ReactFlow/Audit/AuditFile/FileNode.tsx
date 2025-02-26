import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export default function FileNode(
  props: NodeProps<Node<{ fileName: string } & Record<string, unknown>>>,
) {
  const className = [
    "bg-background-light/50 dark:bg-secondarySurface-dark/50",
    "rounded-2xl border border-background-light dark:border-background-dark",
  ].join(" ");

  return (
    <div
      className={className}
      style={{
        width: props.width,
        height: props.height,
        zIndex: props.zIndex,
      }}
    >
      <Handle
        type="target"
        position={props.targetPosition || Position.Top}
        isConnectable={props.isConnectable}
        className="border-0 bg-transparent"
      />

      {props.data.fileName}

      <Handle
        type="source"
        position={props.sourcePosition || Position.Bottom}
        isConnectable={props.isConnectable}
        className="border-0 bg-transparent"
      />
    </div>
  );
}
