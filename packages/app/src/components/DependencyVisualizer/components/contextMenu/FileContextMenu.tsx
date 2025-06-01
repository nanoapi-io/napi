import { Link, useSearchParams } from "react-router";
import type { FileDependencyManifest } from "@napi/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../shadcn/Dropdownmenu.tsx";
import { PanelRight, SearchCode } from "lucide-react";
import DisplayNameWithTooltip from "../DisplayNameWithTootip.tsx";

export default function FileContextMenu(props: {
  context: {
    position: { x: number; y: number };
    fileDependencyManifest: FileDependencyManifest;
  } | undefined;
  onClose: () => void;
  onOpenDetails: (filePath: string) => void;
}) {
  const [searchParams] = useSearchParams();

  function getToFileLink(filePath: string) {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set("fileId", filePath);
    newSearchParams.delete("instanceId");
    return `?${newSearchParams.toString()}`;
  }

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
        <DropdownMenuTrigger />

        <DropdownMenuContent>
          <DropdownMenuLabel>
            <DisplayNameWithTooltip
              name={props.context?.fileDependencyManifest.filePath || ""}
              maxChar={30}
            />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              props.context?.fileDependencyManifest &&
                props.onOpenDetails(
                  props.context?.fileDependencyManifest.filePath,
                );
              props.onClose();
            }}
          >
            <div className="flex items-center space-x-2">
              <PanelRight />
              <div>Show details</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to={getToFileLink(
                props.context?.fileDependencyManifest.filePath || "",
              )}
            >
              <div className="flex items-center space-x-2">
                <SearchCode />
                <div>Inspect symbols</div>
              </div>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
