import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export default function GroupNode(props: NodeProps<Node<{ path: string }>>) {
  return (
    <div className="bg-secondarySurface-light dark:bg-secondarySurface-dark rounded-xl border border-border-light dark:border-border-dark">
      <Handle
        type="target"
        position={props.targetPosition || Position.Top}
        isConnectable={props.isConnectable}
        className="border border-gray-light dark:border-gray-dark"
      />
      <div className="text-center font-bold p-5">/{props.data.path}</div>
      <Handle
        type="source"
        position={props.sourcePosition || Position.Bottom}
        isConnectable={props.isConnectable}
        className="border border-gray-light dark:border-gray-dark"
      />
    </div>
  );
}
