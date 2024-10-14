import { DataList } from "@radix-ui/themes";
import MethodBadge from "../MethodBadge";
import { Endpoint } from "../../service/api/scan";
import GroupBadge from "../GroupBadge";

export default function MethodNodeContent(props: { endpoint: Endpoint }) {
  return (
    <DataList.Root>
      <DataList.Item>
        <DataList.Label className="text-white">Method</DataList.Label>
        <DataList.Value className="text-white">
          <MethodBadge method={props.endpoint.method} />
        </DataList.Value>
      </DataList.Item>
      <DataList.Item>
        <DataList.Label className="text-white">Path</DataList.Label>
        <DataList.Value className="text-white">
          <div className="font-bold">{props.endpoint.path}</div>
        </DataList.Value>
      </DataList.Item>
      {props.endpoint.group && (
        <DataList.Item>
          <DataList.Label className="text-white">Group</DataList.Label>
          <DataList.Value className="text-white">
            <GroupBadge name={props.endpoint.group} />
          </DataList.Value>
        </DataList.Item>
      )}
    </DataList.Root>
  );
}
