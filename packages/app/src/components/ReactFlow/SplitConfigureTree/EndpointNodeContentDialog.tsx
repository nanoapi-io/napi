import {
  Button,
  DataList,
  Dialog,
  Separator,
  TextField,
} from "@radix-ui/themes";
import { FormEvent, useState } from "react";
import { Endpoint } from "../../../service/api/types";
import MethodBadge from "../../Badges/MethodBadge";

export default function EndpointNodeContentDialog(props: {
  busy: boolean;
  endpoint: Endpoint;
  onChangeGroup: (group: string) => void;
}) {
  const [open, setOpen] = useState<boolean>(false);
  const [group, setGroup] = useState<string>("");

  async function handleApply(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (group !== props.endpoint.group) {
      props.onChangeGroup(group);
    }
    setOpen(false);
  }

  function handleOpenChange(open: boolean) {
    setGroup(props.endpoint.group || "");
    setOpen(open);
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button variant="ghost" size="1" highContrast disabled={props.busy}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            xmlns="http://www.w3.org/2000/svg"
            className="text-text-light dark:text-text-dark"
            fill="currentColor"
          >
            <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM12.5 8.625C13.1213 8.625 13.625 8.12132 13.625 7.5C13.625 6.87868 13.1213 6.375 12.5 6.375C11.8787 6.375 11.375 6.87868 11.375 7.5C11.375 8.12132 11.8787 8.625 12.5 8.625Z" />
          </svg>
        </Button>
      </Dialog.Trigger>
      <Dialog.Content className="bg-secondarySurface-light text-text-light dark:bg-secondarySurface-dark dark:text-text-dark border-0">
        <Dialog.Title>
          <div className="flex justify-between">
            <div>Endpoint details</div>
            <Dialog.Close>
              <Button variant="ghost" disabled={props.busy}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gray-light dark:text-gray-dark"
                  fill="currentColor"
                >
                  <path d="M3.66414 3.79512L3.72497 3.72511C3.83079 3.61927 3.97109 3.55491 4.12034 3.54375C4.2696 3.53258 4.41791 3.57535 4.5383 3.66428L4.6083 3.72511L9.99997 9.11595L15.3916 3.72428C15.4493 3.66462 15.5183 3.61703 15.5946 3.58432C15.6708 3.5516 15.7529 3.53439 15.8358 3.53371C15.9188 3.53303 16.0011 3.54888 16.0779 3.58035C16.1547 3.61181 16.2245 3.65825 16.2831 3.71696C16.3418 3.77567 16.3882 3.84547 16.4196 3.9223C16.4509 3.99912 16.4667 4.08143 16.466 4.16442C16.4652 4.2474 16.4479 4.32941 16.4151 4.40564C16.3823 4.48188 16.3347 4.55082 16.275 4.60845L10.8841 10.0001L16.2758 15.3918C16.3815 15.4977 16.4457 15.6381 16.4567 15.7873C16.4678 15.9366 16.4248 16.0848 16.3358 16.2051L16.275 16.2751C16.1691 16.381 16.0288 16.4453 15.8796 16.4565C15.7303 16.4676 15.582 16.4249 15.4616 16.3359L15.3916 16.2751L9.99997 10.8843L4.6083 16.2759C4.49037 16.3897 4.33247 16.4527 4.16859 16.4512C4.00472 16.4497 3.84799 16.3839 3.73217 16.2679C3.61634 16.152 3.55068 15.9952 3.54934 15.8313C3.54799 15.6675 3.61106 15.5096 3.72497 15.3918L9.1158 10.0001L3.72414 4.60845C3.61841 4.50252 3.55421 4.36217 3.5432 4.21292C3.53219 4.06366 3.5751 3.91541 3.66414 3.79512Z" />
                </svg>
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Title>
        <Dialog.Description></Dialog.Description>
        <form onSubmit={handleApply}>
          <Separator
            orientation="horizontal"
            size="4"
            className="bg-[#FFFFFF1F]"
          />
          <DataList.Root className="mt-5">
            <DataList.Item align="center">
              <DataList.Label className="text-gray-light dark:text-gray-dark">
                Method
              </DataList.Label>
              <DataList.Value>
                <MethodBadge method={props.endpoint.method} />
              </DataList.Value>
            </DataList.Item>
            <DataList.Item>
              <DataList.Label className="text-gray-light dark:text-gray-dark">
                Path
              </DataList.Label>
              <DataList.Value>
                <div>{props.endpoint.path}</div>
              </DataList.Value>
            </DataList.Item>
            <DataList.Item align="center">
              <DataList.Label className="text-gray-light dark:text-gray-dark">
                Group
              </DataList.Label>
              <DataList.Value>
                <TextField.Root
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  disabled={props.busy}
                  placeholder="Set a group name"
                />
              </DataList.Value>
            </DataList.Item>
          </DataList.Root>

          <Separator
            orientation="horizontal"
            size="4"
            className="bg-[#FFFFFF1F] mt-5"
          />

          <DataList.Root className="mt-5">
            <DataList.Item>
              <DataList.Label className="text-gray-light dark:text-gray-dark">
                Source:
              </DataList.Label>
              <DataList.Value>
                <div>{props.endpoint.filePath}</div>
              </DataList.Value>
            </DataList.Item>

            <DataList.Item>
              <DataList.Label className="text-gray-light dark:text-gray-dark">
                Dependants:
              </DataList.Label>
              <DataList.Value>
                <ul className="list-disc">
                  {props.endpoint.parentFilePaths.length > 0 ? (
                    props.endpoint.parentFilePaths.map((parent, index) => (
                      <li key={index}>{parent}</li>
                    ))
                  ) : (
                    <li>No dependants</li>
                  )}
                </ul>
              </DataList.Value>
            </DataList.Item>

            <DataList.Item>
              <DataList.Label className="text-gray-light dark:text-gray-dark">
                Dependencies:
              </DataList.Label>
              <DataList.Value>
                <ul className="list-disc">
                  {props.endpoint.childrenFilePaths.length > 0 ? (
                    props.endpoint.childrenFilePaths.map((child, index) => (
                      <li key={index}>{child}</li>
                    ))
                  ) : (
                    <li>No dependencies</li>
                  )}
                </ul>
              </DataList.Value>
            </DataList.Item>
          </DataList.Root>

          <div className="flex justify-end gap-5 mt-5">
            <Dialog.Close>
              <Button disabled={props.busy} color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" disabled={props.busy} color="blue">
              Apply
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
}
