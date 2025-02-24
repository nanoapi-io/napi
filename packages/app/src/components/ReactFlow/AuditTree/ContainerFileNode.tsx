import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export default function ContainerFileNode(
  props: NodeProps<
    Node<
      { fileName: string; isBeingDragged: boolean } & Record<string, unknown>
    >
  >,
) {
  const className = [
    "bg-transparent",
    "rounded-xl border border-background-light dark:border-background-dark",
    `${props.data.isBeingDragged && "bg-blue-100 dark:bg-blue-900 shadow-lg"}`,
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

      <Handle
        type="source"
        position={props.sourcePosition || Position.Bottom}
        isConnectable={props.isConnectable}
        className="border-0 bg-transparent"
      />
    </div>
  );
}
