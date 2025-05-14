import { Link } from "react-router";
import type {
  FileDependencyManifest,
  SymbolDependencyManifest,
} from "@napi/shared";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../shadcn/Dropdownmenu.tsx";
import { PanelRight, SearchCode } from "lucide-react";
import DisplayNameWithTooltip from "../DisplayNameWithTootip.tsx";

export default function SymbolContextMenu(props: {
  context: {
    position: { x: number; y: number };
    fileDependencyManifest: FileDependencyManifest;
    symbolDependencyManifest: SymbolDependencyManifest;
  } | undefined;
  onClose: () => void;
  onOpenDetails: (filePath: string, symbolId: string) => void;
}) {
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
              name={`${props.context?.symbolDependencyManifest.id} (${props.context?.symbolDependencyManifest.type})`}
              maxChar={30}
              truncateBefore
            />
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() =>
              props.context?.fileDependencyManifest &&
              props.onOpenDetails(
                props.context?.fileDependencyManifest.filePath,
                props.context?.symbolDependencyManifest.id,
              )}
          >
            <div className="flex items-center space-x-2">
              <PanelRight />
              <div>Show details</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              to={`/audit/${
                encodeURIComponent(
                  props.context?.fileDependencyManifest.filePath || "",
                )
              }/${
                encodeURIComponent(
                  props.context?.symbolDependencyManifest.id || "",
                )
              }`}
            >
              <div className="flex items-center space-x-2">
                <SearchCode />
                <div>Inspect symbol</div>
              </div>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
