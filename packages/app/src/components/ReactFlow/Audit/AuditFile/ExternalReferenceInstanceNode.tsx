import { DataList } from "@radix-ui/themes";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";

export default function ExternalReferenceInstanceNode(
  props: NodeProps<
    Node<
      {
        referenceName: string;
        instanceName: string;
      } & Record<string, unknown>
    >
  >,
) {
  const className = [
    "bg-secondarySurface-light dark:bg-secondarySurface-dark",
    "rounded-xl border border-border-light dark:border-border-dark",
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

      <div className="py-2 px-3">
        <DataList.Root size="1">
          <DataList.Item>
            <DataList.Label>
              <div className="text-text-light dark:text-text-dark">
                External Reference
              </div>
            </DataList.Label>
            <DataList.Value>
              <div className="font-bold">{props.data.referenceName}</div>
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label>
              <div className="text-text-light dark:text-text-dark">
                Instance Name
              </div>
            </DataList.Label>
            <DataList.Value>
              <div className="font-bold">{props.data.instanceName}</div>
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </div>
      {/* <div>{JSON.stringify(props.data.analysis, null, 2)}</div> */}

      <Handle
        type="source"
        position={props.sourcePosition || Position.Bottom}
        isConnectable={props.isConnectable}
        className="border-0 bg-transparent"
      />
    </div>
  );
}
