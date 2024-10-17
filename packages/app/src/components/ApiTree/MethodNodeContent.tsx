import { DataList } from "@radix-ui/themes";
import MethodBadge from "../MethodBadge";
import { Endpoint } from "../../service/api/types";
import GroupBadge from "../GroupBadge";
import MethodNodeContentDialog from "./MethodNodeContentDialog";

export default function MethodNodeContent(props: {
  busy: boolean;
  endpoint: Endpoint;
  onChangeGroup: (group: string) => void;
}) {
  return (
    <DataList.Root>
      <DataList.Item>
        <DataList.Label className="text-white">Method</DataList.Label>
        <DataList.Value>
          <MethodBadge method={props.endpoint.method} />
        </DataList.Value>
      </DataList.Item>
      <DataList.Item>
        <DataList.Label className="text-white">Path</DataList.Label>
        <DataList.Value>
          <div className="text-white">{props.endpoint.path}</div>
        </DataList.Value>
      </DataList.Item>
      {props.endpoint.group && (
        <DataList.Item>
          <DataList.Label className="text-white">Group</DataList.Label>
          <DataList.Value>
            <GroupBadge name={props.endpoint.group} />
          </DataList.Value>
        </DataList.Item>
      )}
      <DataList.Item>
        <DataList.Label className="text-white">Action</DataList.Label>
        <DataList.Value>
          <MethodNodeContentDialog
            busy={props.busy}
            endpoint={props.endpoint}
            onChangeGroup={props.onChangeGroup}
          />
        </DataList.Value>
      </DataList.Item>
    </DataList.Root>
  );
}
