import { Handle, Node, NodeProps, Position } from "@xyflow/react";
import { Endpoint } from "../../../service/api/types";
import { DataList } from "@radix-ui/themes";
import EndpointNodeContentDialog from "./EndpointNodeContentDialog";
import MethodBadge from "../../MethodBadge";
import GroupBadge from "../../GroupBadge";

export default function EndpointNode(
  props: NodeProps<
    Node<{
      busy: boolean;
      endpoint: Endpoint;
      onChangeGroup: (group: string) => void;
      groupColor?: string;
      isBeingDragged: boolean;
    }>
  >,
) {
  return (
    <div
      className={`bg-secondarySurface-light dark:bg-secondarySurface-dark rounded-xl border border-borderLight dark:border-borderDark overflow-hidden ${props.data.isBeingDragged ? "bg-blue-100 dark:bg-blue-900 shadow-lg" : ""}`}
    >
      <Handle
        type="target"
        position={props.targetPosition || Position.Top}
        isConnectable={props.isConnectable}
        className="border border-gray-dark"
      />
      <div
        className="h-[5px]"
        style={{ backgroundColor: props.data.groupColor }}
      />
      <div className="bg-background-light dark:bg-background-dark px-5 py-1 flex justify-between items-center">
        <div>Action</div>
        <EndpointNodeContentDialog
          busy={props.data.busy}
          endpoint={props.data.endpoint}
          onChangeGroup={props.data.onChangeGroup}
        />
      </div>
      <div className="px-5 py-3">
        <DataList.Root>
          <DataList.Item>
            <DataList.Label className="text-text-light dark:text-text-dark">
              Method
            </DataList.Label>
            <DataList.Value>
              <MethodBadge method={props.data.endpoint.method} />
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label className="text-text-light dark:text-text-dark">
              Path
            </DataList.Label>
            <DataList.Value>
              <div className="text-text-light dark:text-text-dark">
                {props.data.endpoint.path}
              </div>
            </DataList.Value>
          </DataList.Item>
          {props.data.endpoint.group && (
            <DataList.Item>
              <DataList.Label className="text-text-light dark:text-text-dark">
                Group
              </DataList.Label>
              <DataList.Value>
                <GroupBadge name={props.data.endpoint.group} />
              </DataList.Value>
            </DataList.Item>
          )}
        </DataList.Root>
      </div>
    </div>
  );
}
