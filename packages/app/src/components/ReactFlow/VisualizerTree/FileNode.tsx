import { Tooltip } from "@radix-ui/themes";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { Link } from "react-router";

export default function FileNode(
  props: NodeProps<
    Node<{ path: string; isBeingDragged: boolean; isFocused: boolean }>
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
      className={`bg-secondarySurface-light dark:bg-secondarySurface-dark rounded-xl border border-border-light dark:border-border-dark ${props.data.isBeingDragged && "bg-blue-100 dark:bg-blue-900 shadow-lg"} ${props.data.isFocused && "border-primary-light dark:border-primary-dark"}`}
    >
      <Handle
        type="target"
        position={props.targetPosition || Position.Top}
        isConnectable={props.isConnectable}
        className="border border-gray-light dark:border-gray-dark"
      />
      <Link
        to={encodeURIComponent(props.data.path)}
        className="text-center p-5 hover:underline"
      >
        {props.data.path.length > maxPathLength ? (
          <Tooltip content={props.data.path}>
            <div>{getDisplayedPath(props.data.path)}</div>
          </Tooltip>
        ) : (
          props.data.path
        )}
      </Link>
      <Handle
        type="source"
        position={props.sourcePosition || Position.Bottom}
        isConnectable={props.isConnectable}
        className="border border-gray-light dark:border-gray-dark"
      />
    </div>
  );
}
