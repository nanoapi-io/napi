import {
  Button,
  DataList,
  Dialog,
  Separator,
  TextField,
} from "@radix-ui/themes";
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
    if (group === props.endpoint.group) return;
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
      <Dialog.Content className="bg-secondarySurface-dark text-text-dark border-0">
        <Dialog.Title>
          <div className="flex justify-between">
            <div>Endpoint details</div>
            <Dialog.Close>
              <Button variant="ghost" disabled={props.busy}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-gray-dark"
                >
                  <g opacity="0.5">
                    <path
                      d="M3.66414 3.79512L3.72497 3.72511C3.83079 3.61927 3.97109 3.55491 4.12034 3.54375C4.2696 3.53258 4.41791 3.57535 4.5383 3.66428L4.6083 3.72511L9.99997 9.11595L15.3916 3.72428C15.4493 3.66462 15.5183 3.61703 15.5946 3.58432C15.6708 3.5516 15.7529 3.53439 15.8358 3.53371C15.9188 3.53303 16.0011 3.54888 16.0779 3.58035C16.1547 3.61181 16.2245 3.65825 16.2831 3.71696C16.3418 3.77567 16.3882 3.84547 16.4196 3.9223C16.4509 3.99912 16.4667 4.08143 16.466 4.16442C16.4652 4.2474 16.4479 4.32941 16.4151 4.40564C16.3823 4.48188 16.3347 4.55082 16.275 4.60845L10.8841 10.0001L16.2758 15.3918C16.3815 15.4977 16.4457 15.6381 16.4567 15.7873C16.4678 15.9366 16.4248 16.0848 16.3358 16.2051L16.275 16.2751C16.1691 16.381 16.0288 16.4453 15.8796 16.4565C15.7303 16.4676 15.582 16.4249 15.4616 16.3359L15.3916 16.2751L9.99997 10.8843L4.6083 16.2759C4.49037 16.3897 4.33247 16.4527 4.16859 16.4512C4.00472 16.4497 3.84799 16.3839 3.73217 16.2679C3.61634 16.152 3.55068 15.9952 3.54934 15.8313C3.54799 15.6675 3.61106 15.5096 3.72497 15.3918L9.1158 10.0001L3.72414 4.60845C3.61841 4.50252 3.55421 4.36217 3.5432 4.21292C3.53219 4.06366 3.5751 3.91541 3.66414 3.79512Z"
                      fill="currentColor"
                    />
                  </g>
                </svg>
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Title>
        <Dialog.Description></Dialog.Description>
        <Separator
          orientation="horizontal"
          size="4"
          className="bg-[#FFFFFF1F]"
        />
        <DataList.Root className="mt-5">
          <DataList.Item align="center">
            <DataList.Label className="text-gray-dark">Method</DataList.Label>
            <DataList.Value>
              <MethodBadge method={props.endpoint.method} />
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label className="text-gray-dark">Path</DataList.Label>
            <DataList.Value>
              <div>{props.endpoint.path}</div>
            </DataList.Value>
          </DataList.Item>
          <DataList.Item align="center">
            <DataList.Label className="text-gray-dark">Group</DataList.Label>
            <DataList.Value>
              <form
                className="flex gap-2 items-center gap-2"
                onSubmit={handleApply}
              >
                <TextField.Root
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  disabled={props.busy}
                  placeholder="Set a group name"
                />
                <Button variant="ghost" disabled={props.busy} type="submit">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-gray-dark"
                  >
                    <g clip-path="url(#clip0_22_36940)">
                      <path
                        d="M15.2353 0.765303C14.7821 0.312767 14.1678 0.0585938 13.5273 0.0585938C12.8869 0.0585938 12.2726 0.312767 11.8193 0.765303L0.976677 11.608C0.666178 11.9167 0.419985 12.284 0.252342 12.6885C0.0846994 13.093 -0.00106532 13.5268 9.98748e-06 13.9646V15.3333C9.98748e-06 15.5101 0.0702479 15.6797 0.195272 15.8047C0.320296 15.9297 0.489866 16 0.666677 16H2.03534C2.47319 16.0012 2.90692 15.9156 3.31145 15.748C3.71597 15.5805 4.08325 15.3344 4.39201 15.024L15.2353 4.18064C15.6877 3.72743 15.9417 3.11328 15.9417 2.47297C15.9417 1.83266 15.6877 1.21851 15.2353 0.765303ZM3.44934 14.0813C3.07335 14.4548 2.56532 14.6651 2.03534 14.6666H1.33334V13.9646C1.33267 13.7019 1.38411 13.4417 1.4847 13.1989C1.58529 12.9562 1.73302 12.7359 1.91934 12.5506L10.148 4.32197L11.6813 5.8553L3.44934 14.0813ZM14.292 3.23797L12.6213 4.9093L11.088 3.3793L12.7593 1.70797C12.86 1.60751 12.9795 1.52786 13.111 1.47358C13.2424 1.41929 13.3833 1.39143 13.5255 1.39158C13.6678 1.39174 13.8086 1.41991 13.9399 1.47448C14.0712 1.52905 14.1905 1.60896 14.291 1.70964C14.3915 1.81032 14.4711 1.9298 14.5254 2.06126C14.5797 2.19272 14.6076 2.33359 14.6074 2.47581C14.6072 2.61804 14.5791 2.75885 14.5245 2.89019C14.4699 3.02153 14.39 3.14084 14.2893 3.2413L14.292 3.23797Z"
                        fill="currentColor"
                      />
                    </g>
                  </svg>
                </Button>
                {group === (props.endpoint.group || "") && (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-[green]"
                  >
                    <path
                      d="M7.99998 1.3335C11.682 1.3335 14.6666 4.31816 14.6666 8.00016C14.6666 11.6822 11.682 14.6668 7.99998 14.6668C4.31798 14.6668 1.33331 11.6822 1.33331 8.00016C1.33331 4.31816 4.31798 1.3335 7.99998 1.3335ZM10.1466 5.98016L7.16665 8.96016L5.85331 7.64683C5.75853 7.55851 5.63317 7.51043 5.50363 7.51271C5.3741 7.515 5.25051 7.56747 5.1589 7.65908C5.06729 7.75069 5.01482 7.87428 5.01253 8.00381C5.01024 8.13335 5.05833 8.25871 5.14665 8.3535L6.81331 10.0202C6.90706 10.1138 7.03415 10.1664 7.16665 10.1664C7.29915 10.1664 7.42623 10.1138 7.51998 10.0202L10.8533 6.68683C10.9024 6.64105 10.9418 6.58585 10.9692 6.52452C10.9965 6.46319 11.0112 6.39698 11.0124 6.32984C11.0136 6.26271 11.0012 6.19602 10.9761 6.13376C10.9509 6.07151 10.9135 6.01495 10.866 5.96747C10.8185 5.91999 10.762 5.88256 10.6997 5.85741C10.6375 5.83227 10.5708 5.81992 10.5036 5.8211C10.4365 5.82229 10.3703 5.83698 10.309 5.86431C10.2476 5.89164 10.1924 5.93104 10.1466 5.98016Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </form>
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
            <DataList.Label className="text-gray-dark">Source:</DataList.Label>
            <DataList.Value>
              <div>{props.endpoint.filePath}</div>
            </DataList.Value>
          </DataList.Item>

          <DataList.Item>
            <DataList.Label className="text-gray-dark">
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
            <DataList.Label className="text-gray-dark">
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
      </Dialog.Content>
    </Dialog.Root>
  );
}
