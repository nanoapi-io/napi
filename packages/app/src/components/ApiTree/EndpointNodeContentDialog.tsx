import { Button, DataList, Dialog, TextField } from "@radix-ui/themes";
import { FormEvent, useEffect, useState } from "react";
import { Endpoint } from "../../service/api/types";
import MethodBadge from "../MethodBadge";

export default function EndpointNodeContentDialog(props: {
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
        <Button variant="ghost" size="1" highContrast disabled={props.busy}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-text-dark"
          >
            <path
              d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z"
              fill="currentColor"
            />
          </svg>
        </Button>
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Title>Endpoint details</Dialog.Title>
        <Dialog.Description></Dialog.Description>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label>Method</DataList.Label>
            <DataList.Value>
              <MethodBadge method={props.endpoint.method} />
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Path</DataList.Label>
            <DataList.Value>
              <div>{props.endpoint.path}</div>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Group</DataList.Label>
            <DataList.Value>
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
            <DataList.Label>Handler File:</DataList.Label>
            <DataList.Value>
              <div>{props.endpoint.filePath}</div>
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label>Parent Files:</DataList.Label>
            <DataList.Value>
              <ul>
                {props.endpoint.parentFilePaths.length > 0 ? (
                  props.endpoint.parentFilePaths.map((parent, index) => (
                    <li key={index}>{parent}</li>
                  ))
                ) : (
                  <li>No parent files</li>
                )}
              </ul>
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label>Children Files:</DataList.Label>
            <DataList.Value>
              <ul>
                {props.endpoint.childrenFilePaths.length > 0 ? (
                  props.endpoint.childrenFilePaths.map((child, index) => (
                    <li key={index}>{child}</li>
                  ))
                ) : (
                  <li>No children files</li>
                )}
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
