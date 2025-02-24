import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export default function ContainerReferencesNode(
  props: NodeProps<
    Node<
      {
        containerType: "dependents" | "dependencies";
        isBeingDragged: boolean;
      } & Record<string, unknown>
    >
  >,
) {
  const className = [
    `${props.data.containerType === "dependencies" ? "bg-primary-light/10 dark:bg-primary-dark/30" : "bg-secondary-light/10 dark:bg-secondary-dark/30"}`,
    "rounded-xl border border-border-light dark:border-border-dark",
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
