import { useNavigate } from "react-router";
import { DropdownMenu } from "@radix-ui/themes";
import {
  LuFolderSearch2,
  LuPanelRightOpen,
  LuSearchCode,
  LuGitGraph,
} from "react-icons/lu";
import { NodeElementDefinition } from "../../helpers/cytoscape/views/audit";

export default function ActionMenu(props: {
  x: number;
  y: number;
  nodeData: null | NodeElementDefinition["data"];
  open: boolean;
  showInSidebar: (filename: string) => void;
  onOpenChange: (open: boolean) => void;
  setDetailsPaneOpen: (open: boolean) => void;
}) {
  const naivigate = useNavigate();

  const {
    x,
    y,
    nodeData,
    open,
    onOpenChange,
    setDetailsPaneOpen,
    showInSidebar,
  } = props;
  let filename = "";
  if (nodeData) {
    filename = nodeData.customData.fileName.split("/").pop() || "";
  }

  const navigateToFileView = () => {
    if (nodeData) {
      const urlEncodedFileName = encodeURIComponent(
        nodeData.customData.fileName,
      );
      const url = `/audit/${urlEncodedFileName}`;
      naivigate(url);
    }
  };

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: y,
          left: x,
          zIndex: 9999,
        }}
        onClick={() => onOpenChange(false)} // Optional auto-close
      >
        <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
          <DropdownMenu.Trigger>
            <div></div>
          </DropdownMenu.Trigger>

          <DropdownMenu.Content
            sideOffset={4}
            align="start"
            className="rounded-md bg-secondarySurface-light dark:bg-secondarySurface-dark shadow-md border border-border-light dark:border-border-dark p-1"
          >
            <DropdownMenu.Label className="">
              <h1 className="">{filename || "Node"}</h1>
            </DropdownMenu.Label>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark cursor-pointer"
              onSelect={() => setDetailsPaneOpen(true)}
            >
              <div className="w-full flex justify-between space-x-2">
                <span>Details</span>
                <LuPanelRightOpen className="text-lg my-auto" />
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark cursor-pointer"
              onSelect={() => navigateToFileView()}
            >
              <div className="w-full flex justify-between space-x-2">
                <span>Inspect</span>
                <LuSearchCode className="text-lg my-auto" />
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark cursor-pointer"
              onSelect={() => showInSidebar(filename)}
            >
              <div className="w-full flex justify-between space-x-2">
                <span>Show file</span>
                <LuFolderSearch2 className="text-lg my-auto" />
              </div>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark cursor-pointer"
              onSelect={() =>
                alert(
                  "This functionality is not yet implemented. Please check back soon.",
                )
              }
            >
              <div className="w-full flex justify-between space-x-2">
                <span>Extract</span>
                <LuGitGraph className="text-lg my-auto" />
              </div>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>
    </>
  );
}
