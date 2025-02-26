import { Button, DataList, Tooltip } from "@radix-ui/themes";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { defaultMaxPathLength, getDisplayedPath } from "../../../../helpers";
import InstanceTypeBadge from "../../../Badges/InstanceTypeBadge";
import { Link } from "react-router";

export default function InternalReferenceInstanceNode(
  props: NodeProps<
    Node<
      {
        fileName: string;
        instanceName: string;
        instanceType: string;
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
                File Name
              </div>
            </DataList.Label>
            <DataList.Value>
              {props.data.fileName.length > defaultMaxPathLength ? (
                <Tooltip content={props.data.fileName}>
                  <Button variant="ghost" size="1">
                    <Link
                      to={`/audit/${encodeURIComponent(props.data.fileName)}`}
                    >
                      <div className="text-text-light dark:text-text-dark font-bold text-wrap">
                        {getDisplayedPath(props.data.fileName, 20)}
                      </div>
                    </Link>
                  </Button>
                </Tooltip>
              ) : (
                <Button>
                  <Link
                    to={`/audit/${encodeURIComponent(props.data.fileName)}`}
                  >
                    <div className="font-bold">{props.data.fileName}</div>
                  </Link>
                </Button>
              )}
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
          <DataList.Item>
            <DataList.Label>
              <div className="text-text-light dark:text-text-dark">Type</div>
            </DataList.Label>
            <DataList.Value>
              <div className="font-bold">
                <InstanceTypeBadge type={props.data.instanceType} />
              </div>
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
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
