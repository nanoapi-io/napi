import { Link, useParams } from "react-router";
import { DropdownMenu } from "@radix-ui/themes";
import { LuPanelRightOpen, LuSearchCode, LuGitGraph } from "react-icons/lu";
import { FileDependencyManifest } from "@nanoapi.io/shared";

export default function SymbolContextMenu(props: {
  position: { x: number; y: number };
  fileDependencyManifest: FileDependencyManifest;
  symbolId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  setDetailsPaneOpen: (open: boolean) => void;
  setExtractionNodes: (
    filePath: string,
    symbols: string[],
    action: "add" | "remove",
  ) => void;
}) {
  const { file, instance } = useParams();

  const isSymbolLevelView = file && instance;

  function handleOnExtract() {
    props.setExtractionNodes(
      props.fileDependencyManifest.filePath,
      [props.symbolId],
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
          <DropdownMenu.Label className="">
            <h1 className="">
              {props.fileDependencyManifest.symbols[props.symbolId].id}
            </h1>
          </DropdownMenu.Label>
          {/* TODO: There is something wrong with the details pane on the symbol-level view */}
          {/* Fix it, and then remove the following */}
          {!isSymbolLevelView && (
            <>
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
              <DropdownMenu.Item className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark">
                <Link
                  to={`/audit/${encodeURIComponent(
                    props.fileDependencyManifest.filePath,
                  )}/${encodeURIComponent(props.symbolId)}`}
                  className="w-full flex justify-between space-x-2"
                >
                  <span>Inspect symbol</span>
                  <LuSearchCode className="text-lg my-auto" />
                </Link>
              </DropdownMenu.Item>
            </>
          )}
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            className="px-2 py-1 hover:bg-primary-light dark:hover:bg-primary-dark"
            onSelect={() => handleOnExtract()}
          >
            <div className="w-full flex justify-between space-x-2">
              <span>Extract symbol</span>
              <LuGitGraph className="text-lg my-auto" />
            </div>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}
