import { Button, DataList, Dialog, TextField } from "@radix-ui/themes";
import { Endpoint } from "../../service/api/types";
import MethodBadge from "../MethodBadge";
import { FormEvent, useEffect, useState } from "react";

export default function MethodNodeContentDialog(props: {
  busy: boolean;
  endpoint: Endpoint;
  onChangeGroup: (group: string) => void;
}) {
  const [group, setGroup] = useState<string>("");

  async function handleApply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    props.onChangeGroup(group);
  }

  useEffect(() => {
    setGroup(props.endpoint.group || "");
  }, [props.endpoint]);

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button color="purple" size="1" disabled={props.busy}>
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
          <DataList.Item>
            <DataList.Label className="text-dark">Group</DataList.Label>
            <DataList.Value className="text-white">
              <form className="flex gap-2" onSubmit={handleApply}>
                <TextField.Root
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  disabled={props.busy}
                  placeholder="Set a group name"
                />
                {group !== (props.endpoint.group || "") && (
                  <Button disabled={props.busy} type="submit" color="green">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 15 15"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M11.4669 3.72684C11.7558 3.91574 11.8369 4.30308 11.648 4.59198L7.39799 11.092C7.29783 11.2452 7.13556 11.3467 6.95402 11.3699C6.77247 11.3931 6.58989 11.3355 6.45446 11.2124L3.70446 8.71241C3.44905 8.48022 3.43023 8.08494 3.66242 7.82953C3.89461 7.57412 4.28989 7.55529 4.5453 7.78749L6.75292 9.79441L10.6018 3.90792C10.7907 3.61902 11.178 3.53795 11.4669 3.72684Z"
                        fill="currentColor"
                        fill-rule="evenodd"
                        clip-rule="evenodd"
                      ></path>
                    </svg>
                  </Button>
                )}
              </form>
            </DataList.Value>
          </DataList.Item>
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
            <Button color="gray" disabled={props.busy}>
              Close
            </Button>
          </Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
