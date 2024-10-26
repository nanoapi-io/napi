import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export default function GroupNode(props: NodeProps<Node<{ path: string }>>) {
  return (
    <>
      <div className="backdrop-blur-sm bg-[#FFFFFF1A] rounded-xl border border-border-light dark:border-border-dark">
        <Handle
          type="target"
          position={Position.Top}
          className="border border-gray-light dark:border-gray-dark"
        />
        <div className="text-center font-bold p-5">/{props.data.path}</div>
        <Handle
          type="source"
          position={Position.Bottom}
          className="border border-gray-light dark:border-gray-dark"
        />
      </div>
    </>
  );
}
