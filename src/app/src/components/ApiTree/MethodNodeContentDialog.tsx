import { Button, DataList, Dialog } from "@radix-ui/themes";
import { Endpoint } from "../../service/api/scan";
import MethodBadge from "../MethodBadge";
import GroupBadge from "../GroupBadge";

export default function MethodNodeContentDialog(props: { endpoint: Endpoint }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button color="purple" size="1">
          Show more
        </Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Endpoint details</Dialog.Title>
        <Dialog.Description></Dialog.Description>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label className="text-dark">Method</DataList.Label>
            <DataList.Value className="text-white">
              <MethodBadge method={props.endpoint.method} />
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label className="text-dark">Path</DataList.Label>
            <DataList.Value className="text-dark">
              <div className="font-bold">{props.endpoint.path}</div>
            </DataList.Value>
          </DataList.Item>
          {props.endpoint.group && (
            <DataList.Item>
              <DataList.Label className="text-dark">Group</DataList.Label>
              <DataList.Value className="text-white">
                <GroupBadge name={props.endpoint.group} />
              </DataList.Value>
            </DataList.Item>
          )}
          <DataList.Item>
            <DataList.Label className="text-dark">Dependencies</DataList.Label>
            <DataList.Value className="text-white">
              <ul>
                {props.endpoint.dependencies.map((dependency) => (
                  <li key={dependency} className="text-dark">
                    {dependency}
                  </li>
                ))}
              </ul>
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
        <div className="flex justify-end gap-2 mt-2">
          <Dialog.Close>
            <Button color="gray">Close</Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
