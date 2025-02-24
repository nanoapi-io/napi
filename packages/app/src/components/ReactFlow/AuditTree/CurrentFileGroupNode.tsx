import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { AuditFile } from "../../../service/api/types";

export default function CurrentFileGroupNode(
  props: NodeProps<
    Node<AuditFile & { isBeingDragged: boolean } & Record<string, unknown>>
  >,
) {
  const maxPathLength = 25;

  function getDisplayedPath(path: string) {
    if (path.length > maxPathLength) {
      return `...${path.slice(-maxPathLength)}`;
    }

    return path;
  }

  return (
    <div
      className={`bg-secondarySurface-light dark:bg-secondarySurface-dark rounded-xl border border-border-light dark:border-border-dark ${props.data.isBeingDragged && "bg-blue-100 dark:bg-blue-900 shadow-lg"} ${props.data.isFocused && "border-2 border-primary-light dark:border-primary-dark"}`}
    >
      <Handle
        type="target"
        position={props.targetPosition || Position.Top}
        isConnectable={props.isConnectable}
        className="border-0 bg-transparent"
      />
      <div className="p-2">
        <div className="text-sm font-medium text-primary-light dark:text-primary-dark">
          {getDisplayedPath(props.data.path)}
        </div>
      </div>
      <Handle
        type="source"
        position={props.sourcePosition || Position.Bottom}
        isConnectable={props.isConnectable}
        className="border-0 bg-transparent"
      />
    </div>
  );
}
