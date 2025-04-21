import { useNavigate } from "react-router";
import { DropdownMenu } from "@radix-ui/themes";
import {
  LuFolderSearch2,
  LuPanelRightOpen,
  LuSearchCode,
  LuGitGraph,
} from "react-icons/lu";
import { FileManifest } from "../service/api/types/dependencyManifest";
import { toast } from "react-toastify";

export default function FileActionMenu(props: {
  position: { x: number; y: number };
  fileDependencyManifest: FileManifest;
  open: boolean;
  showInSidebar: (filename: string) => void;
  onOpenChange: (open: boolean) => void;
  setDetailsPaneOpen: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  function navigateToFileView() {
    if (props.fileDependencyManifest) {
      const urlEncodedFileName = encodeURIComponent(
        props.fileDependencyManifest.filePath,
      );
      const url = `/audit/${urlEncodedFileName}`;
      navigate(url);
    }
  }

  function handleOnExtract() {
    toast.warning(
      "This functionality is not yet implemented. Please check back soon.",
    );
  }

  return (
    <div
      className="absolute z-50"
      style={{
        top: props.position.y,
        left: props.position.x,
      }}
      onClick={() => props.onOpenChange(false)} // Optional auto-close
    >
      <DropdownMenu.Root open={props.open} onOpenChange={props.onOpenChange}>
        <DropdownMenu.Trigger>
          <div></div>
        </DropdownMenu.Trigger>

        <DropdownMenu.Content
          sideOffset={4}
          align="start"
          className="rounded-md bg-secondarySurface-light dark:bg-secondarySurface-dark shadow-md border border-border-light dark:border-border-dark p-1"
        >
          <DropdownMenu.Label className="">
            <h1 className="">
              {props.fileDependencyManifest.filePath.split("/").pop() ||
                "" ||
                "Node"}
            </h1>
          </DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark"
            onSelect={() => props.setDetailsPaneOpen(true)}
          >
            <div className="w-full flex justify-between space-x-2">
              <span>Details</span>
              <LuPanelRightOpen className="text-lg my-auto" />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark"
            onSelect={() => navigateToFileView()}
          >
            <div className="w-full flex justify-between space-x-2">
              <span>Inspect</span>
              <LuSearchCode className="text-lg my-auto" />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark"
            onSelect={() =>
              props.showInSidebar(
                props.fileDependencyManifest.filePath.split("/").pop() || "",
              )
            }
          >
            <div className="w-full flex justify-between space-x-2">
              <span>Show file</span>
              <LuFolderSearch2 className="text-lg my-auto" />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark"
            onSelect={() => handleOnExtract()}
          >
            <div className="w-full flex justify-between space-x-2">
              <span>Extract</span>
              <LuGitGraph className="text-lg my-auto" />
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}
