import { Link } from "react-router";
import { DropdownMenu } from "@radix-ui/themes";
import {
  LuFolderSearch2,
  LuGitGraph,
  LuPanelRightOpen,
  LuSearchCode,
} from "react-icons/lu";
import type { FileDependencyManifest } from "@napi/shared";

export default function FileContextMenu(props: {
  position: { x: number; y: number };
  fileDependencyManifest: FileDependencyManifest;
  open: boolean;
  showInSidebar: (filename: string) => void;
  onOpenChange: (open: boolean) => void;
  setDetailsPaneOpen: (open: boolean) => void;
  setExtractionNodes: (
    filePath: string,
    symbols: string[],
    action: "add" | "remove",
  ) => void;
}) {
  function handleOnExtract() {
    props.setExtractionNodes(
      props.fileDependencyManifest.filePath,
      Object.values(props.fileDependencyManifest.symbols).map(
        (symbol) => symbol.id,
      ),
      "add",
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
          <div />
        </DropdownMenu.Trigger>

        <DropdownMenu.Content
          sideOffset={4}
          align="start"
          className="rounded-md bg-secondarySurface-light dark:bg-secondarySurface-dark shadow-md border border-border-light dark:border-border-dark p-1"
        >
          <DropdownMenu.Label>
            {props.fileDependencyManifest.filePath.split("/").pop()}
          </DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark"
            onSelect={() => props.setDetailsPaneOpen(true)}
          >
            <div className="w-full flex justify-between space-x-2">
              <span>Show details</span>
              <LuPanelRightOpen className="text-lg my-auto" />
            </div>
          </DropdownMenu.Item>
          <DropdownMenu.Item className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark">
            <Link
              to={`/audit/${
                encodeURIComponent(
                  props.fileDependencyManifest.filePath,
                )
              }`}
              className="w-full flex justify-between space-x-2"
            >
              <span>Inspect symbols</span>
              <LuSearchCode className="text-lg my-auto" />
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark"
            onSelect={() =>
              props.showInSidebar(
                props.fileDependencyManifest.filePath.split("/").pop() || "",
              )}
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
              <span>Extract all symbols</span>
              <LuGitGraph className="text-lg my-auto" />
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}
