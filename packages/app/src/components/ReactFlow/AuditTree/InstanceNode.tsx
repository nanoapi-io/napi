import { DataList, Tooltip } from "@radix-ui/themes";
import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { defaultMaxPathLength, getDisplayedPath } from "../../../helpers";
import InstanceTypeBadge from "../../Badges/InstanceTypeBadge";

export default function InstanceNode(
  props: NodeProps<
    Node<
      {
        fileName: string;
        isExternal?: boolean;
        instanceName: string;
        instanceType?: string;
        analysis?: object;
        isBeingDragged: boolean;
      } & Record<string, unknown>
    >
  >,
) {
  const className = [
    "bg-secondarySurface-light dark:bg-secondarySurface-dark",
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

      <div className="py-2 px-3">
        <DataList.Root size="1">
          {props.data.isExternal ? (
            <DataList.Item>
              <DataList.Label>
                <div className="text-text-light dark:text-text-dark">
                  External Reference
                </div>
              </DataList.Label>
              <DataList.Value>
                {props.data.fileName.length > defaultMaxPathLength ? (
                  <Tooltip content={props.data.fileName}>
                    <div className="font-bold">
                      {getDisplayedPath(
                        props.data.fileName,
                        defaultMaxPathLength,
                      )}
                    </div>
                  </Tooltip>
                ) : (
                  <div className="font-bold">{props.data.fileName}</div>
                )}
              </DataList.Value>
            </DataList.Item>
          ) : (
            <DataList.Item>
              <DataList.Label>
                <div className="text-text-light dark:text-text-dark">
                  File Name
                </div>
              </DataList.Label>
              <DataList.Value>
                {props.data.fileName.length > defaultMaxPathLength ? (
                  <Tooltip content={props.data.fileName}>
                    <div className="font-bold">
                      {getDisplayedPath(
                        props.data.fileName,
                        defaultMaxPathLength,
                      )}
                    </div>
                  </Tooltip>
                ) : (
                  <div className="font-bold">props.data.fileName</div>
                )}
              </DataList.Value>
            </DataList.Item>
          )}

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
          {props.data.instanceType && (
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
          )}
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
