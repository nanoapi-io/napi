import { Link } from "react-router";
import {
  LuFolderSearch2,
  LuGitGraph,
  LuPanelRightOpen,
  LuSearchCode,
} from "react-icons/lu";
import type { FileDependencyManifest } from "@napi/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../shadcn/Dropdownmenu.tsx";
import { Button } from "../../shadcn/Button.tsx";
import { PanelRight, Pickaxe, SearchCode } from "lucide-react";

export default function FileContextMenu(props: {
  context: {
    position: { x: number; y: number };
    fileDependencyManifest: FileDependencyManifest;
  } | undefined;
  onClose: () => void;
  onOpenDetails: (filePath: string) => void;
  // showInSidebar: (filename: string) => void;
  // setDetailsPaneOpen: (open: boolean) => void;
  // setExtractionNodes: (
  //   filePath: string,
  //   symbols: string[],
  //   action: "add" | "remove",
  // ) => void;
}) {
  // function handleOnExtract() {
  //   props.setExtractionNodes(
  //     props.fileDependencyManifest.filePath,
  //     Object.values(props.fileDependencyManifest.symbols).map(
  //       (symbol) => symbol.id,
  //     ),
  //     "add",
  //   );
  // }

  return (
    <div
      className="absolute z-50"
      style={{
        top: props.context?.position.y,
        left: props.context?.position.x,
      }}
    >
      <DropdownMenu
        open={props.context !== undefined}
        onOpenChange={() => props.onClose()}
      >
        <DropdownMenuTrigger>
          <div />
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          <DropdownMenuLabel>
            {props.context?.fileDependencyManifest.filePath.split("/").pop()}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Button
              variant="ghost"
              onClick={() =>
                props.context?.fileDependencyManifest &&
                props.onOpenDetails(
                  props.context?.fileDependencyManifest.filePath,
                )}
              className="w-full"
            >
              <div className="flex items-center space-x-2">
                <PanelRight />
                <div>Show details</div>
              </div>
            </Button>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Button asChild variant="link" className="w-full">
              <Link
                to={`/audit/${
                  encodeURIComponent(
                    props.context?.fileDependencyManifest.filePath || "",
                  )
                }`}
              >
                <div className="flex items-center space-x-2">
                  <SearchCode />
                  <div>Inspect symbols</div>
                </div>
              </Link>
            </Button>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Button variant="ghost" className="w-full">
              <div className="flex items-center space-x-2">
                <Pickaxe />
                <div>Mark for extraction</div>
              </div>
            </Button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
